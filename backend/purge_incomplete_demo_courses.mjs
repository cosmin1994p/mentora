import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';
import Reel from './src/models/Reel.js';
import b2Service from './src/services/b2Service.js';

const APPLY = process.argv.includes('--apply');

function hasValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function hasMediaRef(media) {
  if (!media || typeof media !== 'object') return false;
  return hasValue(media.fileId) || hasValue(media.url);
}

function shouldDeleteCourse(course) {
  const hasVideo = hasMediaRef(course.video) || hasValue(course.videoUrl);
  const hasThumbnail = hasMediaRef(course.thumbnail);
  return !hasVideo || !hasThumbnail;
}

async function safeDeleteByReference(reference) {
  if (!reference || typeof reference !== 'string') return;
  const key = b2Service.extractFileKey(reference);
  if (!key || key.startsWith('api/')) return;
  await b2Service.deleteFile(key, { strict: true, purgeVersions: true });
}

async function cleanupMedia(courseId, course, lessons, reels) {
  if (!b2Service.isEnabled()) return;

  await safeDeleteByReference(course.video?.fileId);
  await safeDeleteByReference(course.video?.url);
  await safeDeleteByReference(course.videoUrl);
  await safeDeleteByReference(course.thumbnail?.fileId);
  await safeDeleteByReference(course.thumbnail?.url);
  await safeDeleteByReference(course.instructorImage?.fileId);
  await safeDeleteByReference(course.instructorImage?.url);
  await safeDeleteByReference(course.hlsUrl);

  for (const lesson of lessons) {
    await safeDeleteByReference(lesson.video?.fileId);
    await safeDeleteByReference(lesson.video?.url);
    await safeDeleteByReference(lesson.thumbnail?.fileId);
    await safeDeleteByReference(lesson.thumbnail?.url);
    await safeDeleteByReference(lesson.hlsUrl);
    for (const resource of lesson.resources || []) {
      await safeDeleteByReference(resource.fileId);
      await safeDeleteByReference(resource.url);
    }
  }

  for (const reel of reels) {
    await safeDeleteByReference(reel.video?.fileId);
    await safeDeleteByReference(reel.video?.url);
    await safeDeleteByReference(reel.videoUrl);
    await safeDeleteByReference(reel.thumbnail?.fileId);
    await safeDeleteByReference(reel.thumbnail?.url);
  }

  const prefixes = [
    `hls/${courseId}/`,
    `videos/${courseId}-`,
    `thumbnails/${courseId}-`,
    `instructor-images/${courseId}-`,
    `lessons/${courseId}-`,
    `resources/${courseId}-`
  ];

  for (const prefix of prefixes) {
    await b2Service.deleteFolder(prefix, { strict: true, purgeVersions: true });
  }
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const allCourses = await Course.find({}).select('title video thumbnail instructorImage videoUrl hlsUrl').lean();
  const targets = allCourses.filter(shouldDeleteCourse);

  console.log(`Found ${targets.length} courses to remove (missing video or thumbnail).`);
  console.log(JSON.stringify(targets.map(c => ({ id: String(c._id), title: c.title })), null, 2));

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to delete from DB and B2.');
    await mongoose.disconnect();
    return;
  }

  let deletedCourses = 0;
  let deletedLessons = 0;
  let deletedReels = 0;

  for (const course of targets) {
    const courseId = String(course._id);
    const lessons = await Lesson.find({ courseId: course._id }).select('video thumbnail resources hlsUrl').lean();
    const reels = await Reel.find({ $or: [{ course: course._id }, { courseId: course._id }] })
      .select('video thumbnail videoUrl')
      .lean();

    await cleanupMedia(courseId, course, lessons, reels);

    const lessonDeleteResult = await Lesson.deleteMany({ courseId: course._id });
    const reelDeleteResult = await Reel.deleteMany({ $or: [{ course: course._id }, { courseId: course._id }] });
    const courseDeleteResult = await Course.deleteOne({ _id: course._id });

    deletedLessons += Number(lessonDeleteResult.deletedCount || 0);
    deletedReels += Number(reelDeleteResult.deletedCount || 0);
    deletedCourses += Number(courseDeleteResult.deletedCount || 0);

    console.log(`Deleted course: ${course.title} (${courseId})`);
  }

  console.log('\nPurge completed.');
  console.log(`Courses deleted: ${deletedCourses}`);
  console.log(`Lessons deleted: ${deletedLessons}`);
  console.log(`Reels deleted: ${deletedReels}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Purge failed:', err.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
