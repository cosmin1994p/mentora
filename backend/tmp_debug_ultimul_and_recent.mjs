import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

const run = async () => {
  await mongoose.connect(uri);

  const ult = await Course.find({ title: /ultimul/i }).sort({ createdAt: -1 }).select('_id title createdAt lessons lessonsArray');
  console.log('ULTIMUL_MATCHES', ult.length);

  for (const c of ult) {
    const lessons = await Lesson.find({ courseId: c._id }).select('_id title chapter order createdAt').sort({ createdAt: 1 });
    const byChapter = lessons.reduce((acc, l) => {
      const k = l?.chapter?.name || 'NO_CHAPTER';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    console.log('COURSE', c._id.toString(), '|', c.title, '| createdAt=', c.createdAt, '| lessonsField=', c.lessons, '| lessonsArray=', (c.lessonsArray||[]).length, '| lessonDocs=', lessons.length);
    console.log('CHAPTERS', JSON.stringify(byChapter));
    for (const l of lessons) {
      console.log('-', l._id.toString(), '|', l.title, '| chapter=', l.chapter?.name, '| order=', l.order);
    }
  }

  const recent = await Lesson.find({}).sort({ createdAt: -1 }).limit(20).select('_id title chapter courseId createdAt');
  console.log('RECENT_LESSONS');
  for (const l of recent) {
    console.log('-', l._id.toString(), '|', l.title, '| chapter=', l.chapter?.name, '| courseId=', l.courseId?.toString(), '| createdAt=', l.createdAt);
  }

  await mongoose.disconnect();
};

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
