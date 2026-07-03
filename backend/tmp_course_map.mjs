import 'dotenv/config';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';
await mongoose.connect(uri);

const ids = [
  '69dd87490b94bfcab5137023',
  '69dd50ac9b9952d6a0ae6664',
  '69dd555f5645353e91c6a2c5',
  '69dd4beb468f55549dc8c110',
  '69dd47ad3c213b71d59fb681'
];

for (const id of ids) {
  const course = await Course.findById(id).select('title createdAt lessons lessonsData lessonsArray');
  const lessonCount = await Lesson.countDocuments({ courseId: id });
  if (!course) {
    console.log('NOT_FOUND', id);
    continue;
  }
  console.log('COURSE', id, '| title=', course.title, '| createdAt=', course.createdAt, '| lessonsField=', course.lessons, '| lessonsDataCount=', Array.isArray(course.lessonsData) ? course.lessonsData.length : 0, '| lessonsArrayCount=', Array.isArray(course.lessonsArray) ? course.lessonsArray.length : 0, '| lessonDocs=', lessonCount);
}

await mongoose.disconnect();
