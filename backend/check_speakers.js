import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://USER:PASS@your-cluster.mongodb.net/mentora';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to:', mongoose.connection.db.databaseName);
    
    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();
    const instructors = await db.collection('instructors').find({}).toArray();
    
    console.log('\n--- INSTRUCTORS ---');
    instructors.forEach(i => {
      console.log(`- [${i._id}] Name: ${i.name}`);
    });

    console.log('\n--- COURSES ---');
    courses.forEach(c => {
      console.log(`- Course: "${c.title}" | Instructors:`, c.instructors || 'EMPTY');
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
