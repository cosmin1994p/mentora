import mongoose from 'mongoose';
import 'dotenv/config';
import Course from './src/models/Course.js';
import Lesson from './src/models/Lesson.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/masterclass';

await mongoose.connect(uri);

const course = await Course.findOne({ title: /Curstudyul/i });
if (!course) {
  console.log('COURSE_NOT_FOUND');
  process.exit(0);
}

console.log('COURSE_ID', course._id.toString());
console.log('COURSE_lessonsField', course.lessons);
console.log('COURSE_lessonsDataCount', Array.isArray(course.lessonsData) ? course.lessonsData.length : 0);

const byCourseId = await Lesson.find({ courseId: course._id })
  .select('title chapter order createdAt')
  .sort({ createdAt: 1 });

console.log('LESSONS_BY_COURSE_ID', byCourseId.length);
for (const l of byCourseId) {
  console.log('-', l.title, '| chapter=', l.chapter?.name, '| order=', l.order);
}

const maybeOrphans = await Lesson.find({
  title: { $regex: /^\s*(1\.|1\.1|1\.2|2\.|2\.1|3\.|3\.1|Lecț|Lect|Lesson)/i }
})
  .select('title chapter courseId order createdAt')
  .sort({ createdAt: -1 })
  .limit(50);

console.log('CANDIDATE_ORPHANS', maybeOrphans.length);
for (const l of maybeOrphans) {
  console.log('-', l.title, '| chapter=', l.chapter?.name, '| courseId=', l.courseId?.toString(), '| order=', l.order);
}

await mongoose.disconnect();
