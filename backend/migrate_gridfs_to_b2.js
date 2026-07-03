/**
 * Migration Script: MongoDB Atlas GridFS → Backblaze B2 Cloud Storage
 * 
 * This script migrates all video files and thumbnails from MongoDB GridFS
 * to Backblaze B2 cloud storage and updates the database records.
 * 
 * Usage: node migrate_gridfs_to_b2.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import gridFSService from './src/services/gridfsService.js';
import b2Service from './src/services/b2Service.js';
import Course from './src/models/Course.js';
import Reel from './src/models/Reel.js';

// Load dependencies
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, 'backend', '.env');
dotenv.config({ path: envPath });

// Connection
let mongoConnection = null;
let gfsFiles = null;

async function connect() {
  try {
    console.log('📚 Connecting to MongoDB Atlas...');
    mongoConnection = await mongoose.connect(process.env.MONGODB_URI);
    const bucket = gridFSService.initGridFS();
    if (!bucket) {
      throw new Error('Could not initialize GridFS bucket');
    }
    console.log('✓ MongoDB connected, GridFS initialized');
    return bucket;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    throw error;
  }
}

async function downloadFromGridFS(fileId) {
  try {
    const bucket = gridFSService.getGridFSBucket();
    if (!bucket) return null;

    const objectId = new mongoose.Types.ObjectId(fileId.trim());
    
    return new Promise((resolve, reject) => {
      const downloadStream = bucket.openDownloadStream(objectId);
      const chunks = [];
      
      downloadStream.on('data', chunk => chunks.push(chunk));
      downloadStream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
      downloadStream.on('error', reject);
    });
  } catch (error) {
    console.error(`  ✗ Error downloading ${fileId}:`, error.message);
    return null;
  }
}

async function migrateCourseMedia(course) {
  console.log(`\n🎬 Migrating course: ${course.title}`);
  
  const updates = {};
  let migrated = false;

  // Migrate video
  if (course.video?.fileId) {
    const isMongoId = /^[a-f0-9]{24}$/i.test(course.video.fileId);
    if (isMongoId) {
      console.log(`  📹 Video fileId: ${course.video.fileId}`);
      try {
        const videoBuffer = await downloadFromGridFS(course.video.fileId);
        if (videoBuffer) {
          console.log(`    ↓ Downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`);
          
          const b2Result = await b2Service.uploadVideo(
            videoBuffer,
            course._id.toString(),
            course.video.filename || 'video.mp4'
          );
          console.log(`    ↑ Uploaded to B2: ${b2Result.url}`);
          
          updates.video = {
            fileId: b2Result.fileId,
            filename: b2Result.filename,
            contentType: b2Result.contentType,
            size: b2Result.size,
            url: b2Result.url
          };
          updates.videoUrl = b2Result.url;
          migrated = true;
        }
      } catch (error) {
        console.error(`    ✗ Video migration failed:`, error.message);
      }
    } else {
      console.log(`  📹 Video already on B2: ${course.video.url}`);
    }
  }

  // Migrate thumbnail
  if (course.thumbnail?.fileId) {
    const isMongoId = /^[a-f0-9]{24}$/i.test(course.thumbnail.fileId);
    if (isMongoId) {
      console.log(`  🖼️  Thumbnail fileId: ${course.thumbnail.fileId}`);
      try {
        const thumbBuffer = await downloadFromGridFS(course.thumbnail.fileId);
        if (thumbBuffer) {
          console.log(`    ↓ Downloaded: ${(thumbBuffer.length / 1024).toFixed(1)}KB`);
          
          const b2Result = await b2Service.uploadThumbnail(
            thumbBuffer,
            course._id.toString()
          );
          console.log(`    ↑ Uploaded to B2: ${b2Result.url}`);
          
          updates.thumbnail = {
            fileId: b2Result.fileId,
            filename: b2Result.filename,
            contentType: b2Result.contentType,
            size: b2Result.size,
            url: b2Result.url
          };
          migrated = true;
        }
      } catch (error) {
        console.error(`    ✗ Thumbnail migration failed:`, error.message);
      }
    } else {
      console.log(`  🖼️  Thumbnail already on B2: ${course.thumbnail.url}`);
    }
  }

  // Migrate instructor image
  if (course.instructorImage?.fileId) {
    const isMongoId = /^[a-f0-9]{24}$/i.test(course.instructorImage.fileId);
    if (isMongoId) {
      console.log(`  👤 Instructor image fileId: ${course.instructorImage.fileId}`);
      try {
        const imgBuffer = await downloadFromGridFS(course.instructorImage.fileId);
        if (imgBuffer) {
          console.log(`    ↓ Downloaded: ${(imgBuffer.length / 1024).toFixed(1)}KB`);
          
          const b2Result = await b2Service.uploadInstructorImage(
            imgBuffer,
            course._id.toString()
          );
          console.log(`    ↑ Uploaded to B2: ${b2Result.url}`);
          
          updates.instructorImage = {
            fileId: b2Result.fileId,
            filename: b2Result.filename,
            contentType: b2Result.contentType,
            size: b2Result.size,
            url: b2Result.url
          };
          migrated = true;
        }
      } catch (error) {
        console.error(`    ✗ Instructor image migration failed:`, error.message);
      }
    } else {
      console.log(`  👤 Instructor image already on B2: ${course.instructorImage.url}`);
    }
  }

  // Apply updates
  if (migrated && Object.keys(updates).length > 0) {
    await Course.findByIdAndUpdate(course._id, updates);
    console.log(`  ✓ Course updated with B2 URLs`);
  }

  return migrated;
}

async function migrateReelMedia(reel) {
  console.log(`\n🎬 Migrating reel: ${reel.title || 'Untitled'}`);
  
  const updates = {};
  let migrated = false;

  if (reel.thumbnail?.fileId) {
    const isMongoId = /^[a-f0-9]{24}$/i.test(reel.thumbnail.fileId);
    if (isMongoId) {
      console.log(`  🖼️  Thumbnail fileId: ${reel.thumbnail.fileId}`);
      try {
        const thumbBuffer = await downloadFromGridFS(reel.thumbnail.fileId);
        if (thumbBuffer) {
          console.log(`    ↓ Downloaded: ${(thumbBuffer.length / 1024).toFixed(1)}KB`);
          
          const b2Result = await b2Service.uploadThumbnail(
            thumbBuffer,
            reel._id.toString()
          );
          console.log(`    ↑ Uploaded to B2: ${b2Result.url}`);
          
          updates.thumbnail = {
            fileId: b2Result.fileId,
            filename: b2Result.filename,
            contentType: b2Result.contentType,
            size: b2Result.size,
            url: b2Result.url
          };
          migrated = true;
        }
      } catch (error) {
        console.error(`    ✗ Thumbnail migration failed:`, error.message);
      }
    } else {
      console.log(`  🖼️  Thumbnail already on B2: ${reel.thumbnail.url}`);
    }
  }

  if (migrated && Object.keys(updates).length > 0) {
    await Reel.findByIdAndUpdate(reel._id, updates);
    console.log(`  ✓ Reel updated with B2 URLs`);
  }

  return migrated;
}

async function main() {
  try {
    console.log('\n=====================================');
    console.log('  MongoDB GridFS → Backblaze B2');
    console.log('  Migration Script');
    console.log('=====================================\n');

    // Check B2 config
    if (!b2Service.isEnabled()) {
      console.error('✗ B2 Service not configured. Please check .env file:');
      console.error('  - B2_KEY_ID');
      console.error('  - B2_APP_KEY');
      console.error('  - B2_BUCKET_NAME');
      process.exit(1);
    }
    console.log('✓ B2 Service configured and ready\n');

    // Connect to MongoDB
    await connect();

    // Migrate courses
    console.log('📖 Fetching courses from MongoDB...');
    const courses = await Course.find().lean();
    console.log(`Found ${courses.length} courses\n`);

    let coursesMigrated = 0;
    for (const course of courses) {
      const migrated = await migrateCourseMedia(course);
      if (migrated) coursesMigrated++;
    }

    // Migrate reels
    console.log('\n📱 Fetching reels from MongoDB...');
    const reels = await Reel.find().lean();
    console.log(`Found ${reels.length} reels\n`);

    let reelsMigrated = 0;
    for (const reel of reels) {
      const migrated = await migrateReelMedia(reel);
      if (migrated) reelsMigrated++;
    }

    // Summary
    console.log('\n\n=====================================');
    console.log('  Migration Complete!');
    console.log('=====================================');
    console.log(`✓ Courses migrated: ${coursesMigrated}/${courses.length}`);
    console.log(`✓ Reels migrated: ${reelsMigrated}/${reels.length}`);
    console.log(`✓ Total items processed: ${courses.length + reels.length}`);
    console.log('=====================================\n');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (mongoConnection) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
    process.exit(0);
  }
}

main();
