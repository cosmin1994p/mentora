import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Course from '../src/models/Course.js';
import Lesson from '../src/models/Lesson.js';

dotenv.config();

const extractChapterFromTitle = (title = '') => {
  const byPrefix = title.match(/(?:chapter|capitol)\s*(\d+)/i);
  if (byPrefix) {
    const number = parseInt(byPrefix[1], 10);
    return Number.isFinite(number) ? { name: `Capitol ${number}`, order: number } : null;
  }

  const byNumbering = title.match(/(\d+)\s*[.\-]\s*\d+/);
  if (byNumbering) {
    const number = parseInt(byNumbering[1], 10);
    return Number.isFinite(number) ? { name: `Capitol ${number}`, order: number } : null;
  }

  return null;
};

const run = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterclass';
  await mongoose.connect(uri);

  const courses = await Course.find({}).select('_id title lessonsArray');

  let lessonsScanned = 0;
  let lessonsUpdated = 0;
  let refsAdded = 0;
  let coursesUpdated = 0;

  for (const course of courses) {
    const rawLessons = await Lesson.find({
      $or: [
        { _id: { $in: course.lessonsArray || [] } },
        { courseId: course._id }
      ]
    });

    const uniqueById = new Map();
    rawLessons.forEach((lesson) => uniqueById.set(lesson._id.toString(), lesson));

    const lessons = Array.from(uniqueById.values())
      .sort((a, b) => (Number.isFinite(a?.order) ? a.order : 9999) - (Number.isFinite(b?.order) ? b.order : 9999));

    const chapterOrderMap = new Map();
    let nextChapterOrder = 1;
    let courseChanged = false;

    for (const lesson of lessons) {
      lessonsScanned += 1;
      const currentName = lesson?.chapter?.name?.trim();
      const currentOrder = lesson?.chapter?.order;

      const inferred = (!currentName || !Number.isFinite(currentOrder))
        ? extractChapterFromTitle(lesson.title || '')
        : null;

      const chapterName = currentName || inferred?.name || 'Capitol 1';

      if (!chapterOrderMap.has(chapterName)) {
        const preferredOrder = Number.isFinite(currentOrder)
          ? currentOrder
          : (Number.isFinite(inferred?.order) ? inferred.order : nextChapterOrder);
        chapterOrderMap.set(chapterName, preferredOrder);
        nextChapterOrder = Math.max(nextChapterOrder, preferredOrder + 1);
      }

      const chapterOrder = chapterOrderMap.get(chapterName);

      const needsUpdate = lesson.courseId?.toString() !== course._id.toString()
        || !lesson.chapter
        || lesson.chapter.name !== chapterName
        || lesson.chapter.order !== chapterOrder;

      if (needsUpdate) {
        lessonsUpdated += 1;
        courseChanged = true;
        lesson.courseId = course._id;
        lesson.chapter = { name: chapterName, order: chapterOrder };
        lesson.updatedAt = new Date();
        await lesson.save();
      }

      if (!(course.lessonsArray || []).some((id) => id.toString() === lesson._id.toString())) {
        refsAdded += 1;
        courseChanged = true;
        course.lessonsArray.push(lesson._id);
      }
    }

    if (courseChanged) {
      coursesUpdated += 1;
      await course.save();
    }
  }

  console.log(JSON.stringify({
    coursesScanned: courses.length,
    coursesUpdated,
    lessonsScanned,
    lessonsUpdated,
    refsAdded
  }, null, 2));

  await mongoose.disconnect();
};

run()
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error('Migration failed:', error);
    try {
      await mongoose.disconnect();
    } catch {
      // noop
    }
    process.exit(1);
  });
