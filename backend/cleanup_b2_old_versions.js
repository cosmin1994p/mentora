import 'dotenv/config';
import { ListObjectVersionsCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import b2Service from './src/services/b2Service.js';

const APPLY = process.argv.includes('--apply');

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}

async function listAllVersionData(bucketName) {
  let keyMarker;
  let versionIdMarker;

  const versions = [];
  const deleteMarkers = [];

  do {
    const res = await b2Service.s3Client.send(new ListObjectVersionsCommand({
      Bucket: bucketName,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
      MaxKeys: 1000
    }));

    for (const v of res.Versions || []) {
      if (v?.Key && v?.VersionId) {
        versions.push(v);
      }
    }

    for (const m of res.DeleteMarkers || []) {
      if (m?.Key && m?.VersionId) {
        deleteMarkers.push(m);
      }
    }

    keyMarker = res.IsTruncated ? res.NextKeyMarker : undefined;
    versionIdMarker = res.IsTruncated ? res.NextVersionIdMarker : undefined;
  } while (keyMarker || versionIdMarker);

  return { versions, deleteMarkers };
}

function buildDeletePlan(versions, deleteMarkers) {
  const toDelete = [];
  let reclaimableBytes = 0;

  // Keep current live version, delete only historical versions.
  for (const v of versions) {
    if (!v.IsLatest) {
      toDelete.push({ Key: v.Key, VersionId: v.VersionId });
      reclaimableBytes += Number(v.Size || 0);
    }
  }

  // Delete all delete markers.
  for (const m of deleteMarkers) {
    toDelete.push({ Key: m.Key, VersionId: m.VersionId });
  }

  return { toDelete, reclaimableBytes };
}

async function applyDeletePlan(bucketName, objects) {
  let deletedEntries = 0;

  for (let i = 0; i < objects.length; i += 1000) {
    const chunk = objects.slice(i, i + 1000);
    const cmd = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: chunk,
        Quiet: true
      }
    });
    await b2Service.s3Client.send(cmd);
    deletedEntries += chunk.length;
  }

  return deletedEntries;
}

async function main() {
  if (!b2Service.isEnabled() || !b2Service.s3Client) {
    throw new Error('B2 is not configured in environment');
  }

  const bucketName = b2Service.bucketName;
  console.log(`Bucket: ${bucketName}`);
  console.log(APPLY ? 'Mode: APPLY (destructive)' : 'Mode: DRY-RUN');

  const { versions, deleteMarkers } = await listAllVersionData(bucketName);
  const { toDelete, reclaimableBytes } = buildDeletePlan(versions, deleteMarkers);

  console.log(`\nVersions total: ${versions.length}`);
  console.log(`Delete markers total: ${deleteMarkers.length}`);
  console.log(`Entries to delete: ${toDelete.length}`);
  console.log(`Estimated reclaimable data (versions only): ${formatBytes(reclaimableBytes)}`);

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to execute cleanup.');
    return;
  }

  const deletedEntries = await applyDeletePlan(bucketName, toDelete);
  console.log(`\nCleanup complete. Deleted ${deletedEntries} version entries/markers.`);
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message);
  process.exit(1);
});
