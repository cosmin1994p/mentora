import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const run = async () => {
  await mongoose.connect(uri);
  const courses = await Course.find({ title: /sperfinal1/i }).sort({ createdAt: -1 }).select('_id title createdAt lessons lessonsArray');
  console.log('MATCHED_COURSES', courses.length);
  for (const c of courses) {
    const lessonDocs = await Lesson.countDocuments({ courseId: c._id });
    console.log('COURSE', c._id.toString(), '| createdAt=', c.createdAt, '| lessonsField=', c.lessons, '| lessonsArray=', (c.lessonsArray || []).length, '| lessonDocs=', lessonDocs);
  }
  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
