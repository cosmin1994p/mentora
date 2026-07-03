import mongoose from 'mongoose';
import Course from './src/models/Course.js';

(async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Admin:Admin%40123@cluster0.c0bah.mongodb.net/mentora_db';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('✓ Connected to MongoDB');
    
    // Find courses missing B2 thumbnail URLs
    const courses = await Course.find({ 'thumbnail.url': { $exists: false } });
    console.log(`Found ${courses.length} courses with missing thumbnail.url`);
    
    let updated = 0;
    
    for (const course of courses) {
      if (course.thumbnail?.fileId) {
        const fileId = course.thumbnail.fileId;
        // Construct B2 CDN URL
        const b2Path = fileId.includes('/') ? fileId : `thumbnails/${fileId}`;
        const cdnUrl = `https://cdn.mentora.page/file/mentora/${b2Path}`;
        
        await Course.updateOne(
          { _id: course._id },
          {
            'thumbnail.url': cdnUrl,
            'thumbnail.fileId': b2Path
          }
        );
        updated++;
        console.log(`✓ Updated: ${course.title}`);
      }
    }
    
    console.log(`\n✅ Complete! Updated ${updated} courses`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
