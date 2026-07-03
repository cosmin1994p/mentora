import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const [sourceCourseId, targetCourseId, mode = 'dry-run'] = process.argv.slice(2);
if (!sourceCourseId || !targetCourseId) {
  console.log('Usage: node tmp_relink_lessons.mjs <sourceCourseId> <targetCourseId> [dry-run|copy|move]');
  process.exit(1);
}

await mongoose.connect(uri);

const source = await Course.findById(sourceCourseId);
const target = await Course.findById(targetCourseId);

if (!source || !target) {
  console.log('Source or target course not found');
  process.exit(1);
}

const sourceLessons = await Lesson.find({ courseId: source._id }).sort({ 'chapter.order': 1, order: 1, createdAt: 1 });
const targetLessonsBefore = await Lesson.countDocuments({ courseId: target._id });

const chapterGroups = sourceLessons.reduce((acc, l) => {
  const key = l.chapter?.name || 'NO_CHAPTER';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

console.log('SOURCE', source._id.toString(), source.title, 'lessonDocs=', sourceLessons.length);
console.log('TARGET', target._id.toString(), target.title, 'lessonDocs(before)=', targetLessonsBefore);
console.log('SOURCE_CHAPTERS', chapterGroups);

if (mode === 'dry-run') {
  await mongoose.disconnect();
  process.exit(0);
}

const newIds = [];

if (mode === 'copy') {
  for (const lesson of sourceLessons) {
    const plain = lesson.toObject();
    delete plain._id;
    delete plain.createdAt;
    delete plain.updatedAt;
    plain.courseId = target._id;
    const clone = await Lesson.create(plain);
    newIds.push(clone._id);
  }

  target.lessonsArray = Array.from(new Set([...(target.lessonsArray || []).map(String), ...newIds.map(String)])).map(id => new mongoose.Types.ObjectId(id));
  await target.save();
}

if (mode === 'move') {
  for (const lesson of sourceLessons) {
    lesson.courseId = target._id;
    await lesson.save();
    newIds.push(lesson._id);
  }

  target.lessonsArray = Array.from(new Set([...(target.lessonsArray || []).map(String), ...newIds.map(String)])).map(id => new mongoose.Types.ObjectId(id));
  source.lessonsArray = (source.lessonsArray || []).filter(id => !newIds.map(String).includes(String(id)));
  await target.save();
  await source.save();
}

const targetLessonsAfter = await Lesson.countDocuments({ courseId: target._id });
console.log('DONE mode=', mode, '| movedOrCopied=', newIds.length, '| target lessonDocs(after)=', targetLessonsAfter);

await mongoose.disconnect();
