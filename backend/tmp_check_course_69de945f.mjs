import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const run = async () => {
  await mongoose.connect(uri);
  const course = await Course.findById('69de945f8f48c2e3c1ed3923').select('_id title createdAt lessons lessonsArray');
  if (!course) {
    console.log('COURSE_NOT_FOUND');
    await mongoose.disconnect();
    return;
  }

  const lessons = await Lesson.find({ courseId: course._id })
    .select('_id title chapter order createdAt video.url video.hlsUrl')
    .sort({ 'chapter.order': 1, order: 1, createdAt: 1 });

  console.log('COURSE', course._id.toString(), '|', course.title, '| lessonsField=', course.lessons, '| lessonsArray=', (course.lessonsArray||[]).length);
  console.log('LESSON_DOCS', lessons.length);
  for (const l of lessons) {
    console.log('-', l._id.toString(), '|', l.title, '| chapter=', l.chapter?.name, '| cOrder=', l.chapter?.order, '| order=', l.order, '| hasVideo=', !!l?.video?.url);
  }

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
