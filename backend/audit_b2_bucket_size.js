import 'dotenv/config';
import { ListObjectsV2Command, ListObjectVersionsCommand } from '@aws-sdk/client-s3';
import b2Service from './src/services/b2Service.js';

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

function topLevelPrefix(key) {
  if (!key || typeof key !== 'string') return '(unknown)';
  const idx = key.indexOf('/');
  return idx === -1 ? '(root)' : key.slice(0, idx);
}

async function scanCurrentObjects(bucketName) {
  let token;
  let totalCount = 0;
  let totalBytes = 0;
  const byPrefix = new Map();

  do {
    const res = await b2Service.s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      ContinuationToken: token,
      MaxKeys: 1000
    }));

    for (const item of res.Contents || []) {
      const key = item.Key;
      const size = item.Size || 0;
      const prefix = topLevelPrefix(key);
      totalCount += 1;
      totalBytes += size;
      byPrefix.set(prefix, (byPrefix.get(prefix) || 0) + size);
    }

    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);

  return { totalCount, totalBytes, byPrefix };
}

async function scanAllVersions(bucketName) {
  let keyMarker;
  let versionIdMarker;
  let versionCount = 0;
  let deleteMarkerCount = 0;
  let versionBytes = 0;
  const byPrefix = new Map();

  do {
    const res = await b2Service.s3Client.send(new ListObjectVersionsCommand({
      Bucket: bucketName,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
      MaxKeys: 1000
    }));

    for (const v of res.Versions || []) {
      const key = v.Key;
      const size = v.Size || 0;
      const prefix = topLevelPrefix(key);
      versionCount += 1;
      versionBytes += size;
      byPrefix.set(prefix, (byPrefix.get(prefix) || 0) + size);
    }

    for (const _m of res.DeleteMarkers || []) {
      deleteMarkerCount += 1;
    }

    keyMarker = res.IsTruncated ? res.NextKeyMarker : undefined;
    versionIdMarker = res.IsTruncated ? res.NextVersionIdMarker : undefined;
  } while (keyMarker || versionIdMarker);

  return { versionCount, deleteMarkerCount, versionBytes, byPrefix };
}

function printTop(map, title, top = 12) {
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
  console.log(`\n${title}`);
  if (sorted.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const [prefix, bytes] of sorted) {
    console.log(`  - ${prefix.padEnd(20)} ${formatBytes(bytes)}`);
  }
}

async function main() {
  if (!b2Service.isEnabled() || !b2Service.s3Client) {
    throw new Error('B2 is not configured in environment');
  }

  const bucketName = b2Service.bucketName;
  console.log(`Bucket: ${bucketName}`);
  console.log('Scanning current objects...');
  const current = await scanCurrentObjects(bucketName);

  console.log('Scanning all object versions...');
  const versions = await scanAllVersions(bucketName);

  console.log('\n=== CURRENT OBJECTS (what app can access now) ===');
  console.log(`Objects: ${current.totalCount}`);
  console.log(`Size:    ${formatBytes(current.totalBytes)}`);

  console.log('\n=== ALL VERSIONS (storage billing relevant) ===');
  console.log(`Versions:       ${versions.versionCount}`);
  console.log(`Delete markers: ${versions.deleteMarkerCount}`);
  console.log(`Size:           ${formatBytes(versions.versionBytes)}`);

  const historicalOverhead = Math.max(0, versions.versionBytes - current.totalBytes);
  console.log(`\nHistorical overhead (old versions still billed): ${formatBytes(historicalOverhead)}`);

  printTop(current.byPrefix, 'Top prefixes by CURRENT size:');
  printTop(versions.byPrefix, 'Top prefixes by VERSIONED size:');
}

main().catch((err) => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
