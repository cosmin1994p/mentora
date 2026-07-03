#!/usr/bin/env node

/**
 * Real-time HLS transcoding monitor
 * Shows progress as video uploads and transcodes
 */

import fs from 'fs';
import path from 'path';

const HLS_OUTPUT_DIR = './hls_output';
const COURSE_ID = '69dbf90b38d80e861a588504';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function getHLSStats() {
  const courseDir = path.join(HLS_OUTPUT_DIR, COURSE_ID);
  
  if (!fs.existsSync(courseDir)) {
    return null; // Not started
  }

  const stats = {
    480p: false,
    720p: false,
    1080p: false,
    master: false,
    totalSize: 0,
    segmentCount: 0
  };

  try {
    const files = fs.readdirSync(courseDir);
    
    files.forEach(file => {
      if (file === '480p') stats['480p'] = fs.existsSync(path.join(courseDir, file, 'stream.m3u8'));
      if (file === '720p') stats['720p'] = fs.existsSync(path.join(courseDir, file, 'stream.m3u8'));
      if (file === '1080p') stats['1080p'] = fs.existsSync(path.join(courseDir, file, 'stream.m3u8'));
      if (file === 'master.m3u8') stats.master = true;
    });

    // Count segments
    const allFiles = fs.readdirSync(courseDir, { recursive: true });
    allFiles.forEach(file => {
      const fullPath = path.join(courseDir, file);
      if (fs.statSync(fullPath).isFile()) {
        stats.totalSize += fs.statSync(fullPath).size;
        if (file.endsWith('.ts')) stats.segmentCount++;
      }
    });
  } catch (e) {
    return null;
  }

  return stats;
}

console.log(`\n🎬 Monitor: Course ${COURSE_ID}`);
console.log(`📂 Path: ${path.join(HLS_OUTPUT_DIR, COURSE_ID)}\n`);

const interval = setInterval(() => {
  const stats = getHLSStats();
  
  if (!stats) {
    console.log('⏳ Waiting for upload to start...');
    return;
  }

  console.clear();
  console.log(`\n🎬 HLS Transcoding Monitor - Course ${COURSE_ID}`);
  console.log(`Updated: ${new Date().toLocaleTimeString()}\n`);
  
  console.log('Variants:');
  console.log(`  480p: ${stats['480p'] ? '✅ DONE' : '🔄 IN PROGRESS'}`);
  console.log(`  720p: ${stats['720p'] ? '✅ DONE' : '🔄 IN PROGRESS'}`);
  console.log(`  1080p: ${stats['1080p'] ? '✅ DONE' : '🔄 IN PROGRESS'}`);
  console.log(`  Master: ${stats.master ? '✅ READY' : '⏳ WAITING'}\n`);
  
  console.log(`Stats:`);
  console.log(`  Segments: ${stats.segmentCount}`);
  console.log(`  Total Size: ${formatBytes(stats.totalSize)}\n`);
  
  // Check if all done
  if (stats.master && stats['480p'] && stats['720p'] && stats['1080p']) {
    console.log('✅ TRANSCODING COMPLETE! Video ready to play.\n');
  } else if (stats.master) {
    console.log('⏳ Transcoding in progress... (master ready, waiting for variants)\n');
  }
}, 5000);

// Exit gracefully
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\nMonitor stopped.');
  process.exit(0);
});
