import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Course from './src/models/Course.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const update = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const courses = await Course.find({});
  for (const c of courses) {
    c.lessonsData = [
      { title: 'Introduction', startTime: 0, description: 'Welcome to the course', videoUrl: c.videoUrl },
        { title: 'Deep Dive', startTime: 120, description: 'Core concepts', videoUrl: c.videoUrl },
        { title: 'Conclusion', startTime: 300, description: 'Wrapping up', videoUrl: c.videoUrl }
      ];
      await c.save();
      console.log(`Updated course: ${c.title}`);
  }
  process.exit(0);
};
update();
