import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const cleanup = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    // Delete reels older than May 1, 2026
    const mayFirst2026 = new Date('2026-05-01T00:00:00Z');
    const deleteReelsResult = await mongoose.connection.collection('reels').deleteMany({
      createdAt: { $lt: mayFirst2026 }
    });
    console.log(`Deleted ${deleteReelsResult.deletedCount} reels older than May 2026.`);

    // Delete courses older than April 1, 2026
    const aprilFirst2026 = new Date('2026-04-01T00:00:00Z');
    const deleteCoursesResult = await mongoose.connection.collection('courses').deleteMany({
      createdAt: { $lt: aprilFirst2026 }
    });
    console.log(`Deleted ${deleteCoursesResult.deletedCount} courses older than April 2026.`);

    // We can also delete reels that reference courses that no longer exist just to keep it clean.
    // Let's get remaining course IDs
    const courses = await mongoose.connection.collection('courses').find({}, { projection: { _id: 1 } }).toArray();
    const courseIds = courses.map(c => c._id);
    
    const orphanReelsResult = await mongoose.connection.collection('reels').deleteMany({
      course: { $nin: courseIds }
    });
    console.log(`Deleted ${orphanReelsResult.deletedCount} orphaned reels.`);

    console.log('Cleanup finished.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
};

cleanup();
