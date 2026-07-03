import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Course from './src/models/Course.js';

dotenv.config();

mongoose.set('strictQuery', false);

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://GHINEA_TUDOR:stud@mongo.utaytsq.mongodb.net/streamclass?retryWrites=true&w=majority');
    
    const courses = await Course.find({ isFree: false });
    console.log('--- LOCKED COURSES ---');
    courses.forEach(c => {
      console.log(`- ${c.title} (Requires: ${c.packageTiers.join(', ')})`);
    });
    console.log('----------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
