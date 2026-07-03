import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const run = async () => {
  await mongoose.connect(uri);
  const courses = await Course.find({}).sort({ createdAt: -1 }).limit(15).select('_id title createdAt');
  for (const c of courses) {
    const lessonDocs = await Lesson.countDocuments({ courseId: c._id });
    if (lessonDocs > 0 || /sper|final/i.test(c.title || '')) {
      console.log(c._id.toString(), '|', c.title, '|', c.createdAt, '| lessonDocs=', lessonDocs);
    }
  }
  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
