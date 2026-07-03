import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

import Course from './src/models/Course.js';
import b2Service from './src/services/b2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load both backend/.env and project-root/.env to match existing local setups.
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const COURSE_ID_PATTERN = /^[a-f0-9]{24}$/i;
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');

async function listTopLevelPrefixes(prefixRoot) {
  const prefixes = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: b2Service.bucketName,
      Prefix: prefixRoot,
      Delimiter: '/',
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });

    const response = await b2Service.s3Client.send(command);
    const pagePrefixes = (response?.CommonPrefixes || [])
      .map((entry) => entry?.Prefix)
      .filter(Boolean);

    prefixes.push(...pagePrefixes);
    continuationToken = response?.IsTruncated ? response?.NextContinuationToken : undefined;
  } while (continuationToken);

  return prefixes;
}

async function countObjectsInPrefix(prefix) {
  let total = 0;
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: b2Service.bucketName,
      Prefix: prefix,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    });

    const response = await b2Service.s3Client.send(command);
    total += response?.Contents?.length || 0;
    continuationToken = response?.IsTruncated ? response?.NextContinuationToken : undefined;
  } while (continuationToken);

  return total;
}

function extractCourseIdFromPrefix(prefix) {
  const normalized = String(prefix || '').replace(/^\/+|\/+$/g, '');
  const parts = normalized.split('/');
  if (parts.length < 2 || parts[0] !== 'hls') return null;

  const maybeCourseId = parts[1];
  return COURSE_ID_PATTERN.test(maybeCourseId) ? maybeCourseId : null;
}

async function cleanupOrphanCourseHls() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  if (!b2Service.isEnabled() || !b2Service.s3Client) {
    throw new Error('B2 service is not configured. Check B2_* environment variables.');
  }

  console.log('Mode:', shouldApply ? 'APPLY (deletes enabled)' : 'DRY RUN (no deletions)');
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB');

  const courseIds = await Course.find({}, { _id: 1 }).lean();
  const activeCourseIds = new Set(courseIds.map((course) => String(course._id)));
  console.log(`✓ Loaded ${activeCourseIds.size} active courses from database`);

  console.log('Scanning B2 top-level hls/ prefixes...');
  const topLevelHlsPrefixes = await listTopLevelPrefixes('hls/');

  const candidateCoursePrefixes = topLevelHlsPrefixes.filter((prefix) => !!extractCourseIdFromPrefix(prefix));

  const orphanPrefixes = candidateCoursePrefixes.filter((prefix) => {
    const courseId = extractCourseIdFromPrefix(prefix);
    return courseId && !activeCourseIds.has(courseId);
  });

  console.log(`\nSummary:`);
  console.log(`- top-level hls/ prefixes found: ${topLevelHlsPrefixes.length}`);
  console.log(`- candidate course prefixes: ${candidateCoursePrefixes.length}`);
  console.log(`- orphan course prefixes: ${orphanPrefixes.length}`);

  if (orphanPrefixes.length === 0) {
    console.log('\nNo orphan course HLS prefixes found.');
    return;
  }

  let totalObjects = 0;
  const orphanDetails = [];

  for (const prefix of orphanPrefixes) {
    const objectCount = await countObjectsInPrefix(prefix);
    totalObjects += objectCount;
    orphanDetails.push({ prefix, objectCount });
  }

  console.log(`\nPotential cleanup size:`);
  console.log(`- orphan prefixes: ${orphanDetails.length}`);
  console.log(`- orphan objects: ${totalObjects}`);

  for (const item of orphanDetails) {
    console.log(`  - ${item.prefix} (${item.objectCount} objects)`);
  }

  if (!shouldApply) {
    console.log('\nDry run complete. Re-run with --apply to delete these prefixes from B2.');
    return;
  }

  console.log('\nDeleting orphan prefixes from B2...');
  let deletedObjects = 0;

  for (const item of orphanDetails) {
    const result = await b2Service.deleteFolder(item.prefix, { strict: true });
    deletedObjects += result.deleted || 0;
    console.log(`✓ Deleted ${result.deleted || 0} objects from ${item.prefix}`);
  }

  console.log(`\nCleanup complete. Deleted ${deletedObjects} objects across ${orphanDetails.length} orphan prefixes.`);
}

cleanupOrphanCourseHls()
  .catch((error) => {
    console.error('Cleanup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors at shutdown
    }
  });
