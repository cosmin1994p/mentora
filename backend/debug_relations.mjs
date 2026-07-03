import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://USER:PASS@your-cluster.mongodb.net/mentora';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  
  const speaker = await db.collection('instructors').findOne({ name: 'Speaker 1' });
  console.log('\n=== Speaker 1 ===');
  console.log('ID:', speaker?._id?.toString());
  
  // Find courses with this instructor
  const courses = await db.collection('courses').find({ instructors: speaker?._id }).toArray();
  console.log('\n=== Courses linked to Speaker 1 ===');
  courses.forEach(c => console.log(' -', c.title, '| instructors:', JSON.stringify(c.instructors)));
  
  // Find the cursss course specifically
  const cursss = await db.collection('courses').findOne({ title: 'cursss' });
  console.log('\n=== cursss course ===');
  console.log('ID:', cursss?._id?.toString());
  console.log('Instructors:', JSON.stringify(cursss?.instructors));
  
  // Find all users
  const users = await db.collection('users').find({}).project({ username: 1, email: 1, enrolledCourses: 1 }).toArray();
  console.log('\n=== All Users & Enrollments ===');
  users.forEach(u => console.log(' -', u.username, '| email:', u.email, '| enrolled:', JSON.stringify(u.enrolledCourses)));
  
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
