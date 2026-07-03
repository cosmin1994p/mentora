import mongoose from 'mongoose';
import Course from './src/models/Course.js';
import dotenv from 'dotenv';

dotenv.config();

async function addTestCourse() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected');

    // Check if test course already exists
    const existing = await Course.findOne({ title: '🧪 Test Course - HLS Streaming' });
    if (existing) {
      console.log('⚠️  Test course already exists. Deleting old one...');
      await Course.deleteOne({ _id: existing._id });
    }

    // Create test course with mock HLS URL
    const testCourse = new Course({
      title: '🧪 Test Course - HLS Streaming',
      instructor: 'Test Instructor',
      description: 'This is a test course with HLS streaming enabled',
      category: 'Testing',
      tags: ['test', 'hls', 'streaming'],
      duration: 10,
      level: 'Beginner',
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080',
      // Mock HLS URL pointing to a public example
      hlsUrl: '/api/hls/test-course-001/master.m3u8',
      hlsReady: true,
      rating: 5.0,
      students: 100,
      ViewCount: 0,
      // Using a fallback public HLS stream for testing
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      isPublished: true
    });

    await testCourse.save();
    console.log(`\n✅ Test course created successfully!`);
    console.log(`   ID: ${testCourse._id}`);
    console.log(`   Title: ${testCourse.title}`);
    console.log(`   HLS URL: ${testCourse.hlsUrl}`);
    console.log(`   Fallback Video: ${testCourse.videoUrl}`);

    // Create a second test course with full mock HLS variants
    const testCourse2 = new Course({
      title: '🎬 Full HD Tutorial - HLS',
      instructor: 'Advanced Instructor',
      description: 'Full test course with multiple quality levels',
      category: 'Advanced',
      tags: ['test', 'hls', '1080p'],
      duration: 54,
      level: 'Intermediate',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080',
      hlsUrl: '/api/hls/test-course-002/master.m3u8',
      hlsReady: true,
      rating: 4.9,
      students: 250,
      viewCount: 0,
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      isPublished: true
    });

    await testCourse2.save();
    console.log(`\n✅ Second test course created!`);
    console.log(`   ID: ${testCourse2._id}`);
    console.log(`   Title: ${testCourse2.title}`);
    console.log(`   HLS URL: ${testCourse2.hlsUrl}`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestCourse();
