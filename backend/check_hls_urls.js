import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import dotenv from 'dotenv';

dotenv.config();

async function checkHLSUrls() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected');

    const courses = await Course.find({});
    console.log(`\n📚 Found ${courses.length} courses\n`);

    let withHLS = 0;
    let withoutHLS = 0;
    let withVideo = 0;

    courses.forEach((course, idx) => {
      console.log(`${idx + 1}. "${course.title}"`);
      console.log(`   _id: ${course._id}`);
      
      if (course.hlsUrl) {
        console.log(`   ✅ HLS URL: ${course.hlsUrl}`);
        withHLS++;
      } else {
        console.log(`   ❌ No HLS URL`);
        withoutHLS++;
      }

      if (course.video?.fileId) {
        console.log(`   📹 Video (GridFS): ${course.video.filename}`);
        withVideo++;
      } else if (course.videoUrl) {
        console.log(`   📹 Video URL: ${course.videoUrl}`);
        withVideo++;
      }
      console.log('');
    });

    console.log('📊 Summary:');
    console.log(`   Total courses: ${courses.length}`);
    console.log(`   With HLS URLs: ${withHLS}`);
    console.log(`   Without HLS URLs: ${withoutHLS}`);
    console.log(`   With videos: ${withVideo}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkHLSUrls();
