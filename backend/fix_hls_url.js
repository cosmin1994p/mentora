import mongoose from 'mongoose';
import Course from './src/models/Course.js';

const courseId = '69dbd7b7fbd33ba418bbda08';
const hlsUrl = `/api/hls/${courseId}/master.m3u8`;

console.log('Connecting to MongoDB...');

try {
  await mongoose.connect('mongodb://localhost:27017/masterclass', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  });
  
  console.log('✓ Connected to MongoDB');
  
  const result = await Course.findByIdAndUpdate(
    courseId,
    { hlsUrl: hlsUrl, hlsReady: true },
    { new: true }
  );
  
  if (result) {
    console.log(`✓ Updated course ${result.title}`);
    console.log(`  → hlsUrl: ${result.hlsUrl}`);
    console.log(`  → hlsReady: ${result.hlsReady}`);
  } else {
    console.log(`✗ Course not found: ${courseId}`);
  }
  
  await mongoose.connection.close();
  console.log('✓ Disconnected from MongoDB');
  process.exit(0);
} catch (err) {
  console.error('✗ Error:', err.message);
  process.exit(1);
}
