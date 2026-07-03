import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';

const HLS_OUTPUT_DIR = './hls_output';

async function fixMissingCourses() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/masterclass';
  
  // Get all HLS folders
  const hlsFolders = fs.readdirSync(HLS_OUTPUT_DIR)
    .filter(f => fs.statSync(path.join(HLS_OUTPUT_DIR, f)).isDirectory());
  
  console.log(`Found ${hlsFolders.length} HLS folders`);
  
  for (const courseId of hlsFolders) {
    try {
      // Check if master.m3u8 exists
      const masterPath = path.join(HLS_OUTPUT_DIR, courseId, 'master.m3u8');
      if (!fs.existsSync(masterPath)) continue;
      
      // Check if course exists
      const course = await Course.findById(courseId);
      if (course && course.hlsUrl) {
        console.log(`✓ ${courseId}: Already has hlsUrl`);
        continue;
      }
      
      if (!course) {
        console.log(`⚠️ ${courseId}: Course missing in DB`);
        continue;
      }
      
      // Course exists but no hlsUrl - update it
      const hlsUrl = `/api/hls/${courseId}/master.m3u8`;
      await Course.findByIdAndUpdate(courseId, {
        hlsUrl: hlsUrl,
        hlsReady: true
      });
      console.log(`✓ ${courseId}: Updated hlsUrl = ${hlsUrl}`);
      
    } catch (err) {
      console.error(`✗ ${courseId}: ${err.message}`);
    }
  }
}

console.log('Fixing HLS URLs in database...');
fixMissingCourses()
  .then((async () => {
    console.log('Done');
    process.exit(0);
  })())
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
