import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const run = async () => {
  await mongoose.connect(uri);
  const course = await Course.findOne({ title: /sperfinal1/i }).sort({ createdAt: -1 });
  if (!course) {
    console.log('COURSE_NOT_FOUND');
    await mongoose.disconnect();
    return;
  }

  const lessons = await Lesson.find({ courseId: course._id })
    .select('title chapter order createdAt')
    .sort({ createdAt: 1 });

  console.log('COURSE', course._id.toString(), course.title);
  console.log('LESSON_COUNT', lessons.length);
  for (const l of lessons) {
    console.log('-', l.title, '| chapter=', l.chapter?.name, '| order=', l.order);
  }

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
