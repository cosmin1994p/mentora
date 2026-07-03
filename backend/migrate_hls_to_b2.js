#!/usr/bin/env node

/**
 * Migrate Local HLS to Backblaze B2
 * 
 * Uploads all HLS segments and playlists from local hls_output/ 
 * directory to B2, then updates course URLs in database.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import b2Service from './src/services/b2Service.js';
import Course from './src/models/Course.js';
import hlsService from './src/services/hlsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(type, msg) {
  if (type === 'pass') console.log(`${colors.green}✓${colors.reset} ${msg}`);
  else if (type === 'fail') console.log(`${colors.red}✗${colors.reset} ${msg}`);
  else if (type === 'warn') console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`);
  else if (type === 'info') console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`);
  else console.log(msg);
}

async function uploadHLSToB2(courseId) {
  const courseDir = path.join(hlsService.HLS_OUTPUT_DIR, courseId);
  
  if (!fs.existsSync(courseDir)) {
    log('warn', `No HLS directory for course ${courseId}`);
    return null;
  }

  console.log(`\n  🎬 Uploading HLS for course ${courseId}...`);
  
  const uploadedFiles = [];
  let masterUrl = null;
  const variants = [];

  try {
    const walkDir = async (dir, basePath = '') => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          await walkDir(fullPath, path.join(basePath, file));
        } else if (file.endsWith('.ts') || file.endsWith('.m3u8')) {
          const fileBuffer = fs.readFileSync(fullPath);
          const b2Path = `hls/${courseId}${basePath ? '/' + basePath : ''}/${file}`;
          const mimeType = file.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
          
          try {
            const result = await b2Service.uploadFile(fileBuffer, b2Path, mimeType);
            uploadedFiles.push(b2Path);
            
            if (file === 'master.m3u8') {
              masterUrl = result.url;
            } else if (file === 'stream.m3u8') {
              const variantName = basePath.split('/')[0];
              variants.push({ name: variantName, url: result.url });
            }
            
            process.stdout.write('.');
          } catch (err) {
            log('warn', `Failed to upload ${file}: ${err.message}`);
          }
        }
      }
    };
    
    await walkDir(courseDir);
    
    if (masterUrl) {
      log('pass', `Uploaded ${uploadedFiles.length} HLS files`);
      return { masterUrl, variants, uploadedFiles: uploadedFiles.length };
    } else {
      log('warn', 'Master M3U8 not uploaded');
      return null;
    }

  } catch (error) {
    log('fail', `Upload failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}Migrating HLS to Backblaze B2${colors.reset}\n`);
  
  try {
    // Connect to DB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log('pass', 'MongoDB connected');

    const HLS_DIR = hlsService.HLS_OUTPUT_DIR;
    if (!fs.existsSync(HLS_DIR)) {
      log('warn', 'HLS output directory does not exist');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Find all course HLS directories
    const courseIds = fs.readdirSync(HLS_DIR)
      .filter(f => fs.statSync(path.join(HLS_DIR, f)).isDirectory());
    
    console.log(`Found ${courseIds.length} HLS directories\n`);
    
    let migrated = 0;
    let failed = 0;

    for (const courseId of courseIds) {
      try {
        const result = await uploadHLSToB2(courseId);
        
        if (result && result.masterUrl) {
          // Update course in DB
          await Course.findByIdAndUpdate(courseId, {
            hlsUrl: result.masterUrl,
            hlsReady: true
          });
          
          log('pass', `Course ${courseId} - HLS migrated to B2`);
          migrated++;
        } else {
          failed++;
        }
      } catch (err) {
        log('fail', `Failed to migrate course ${courseId}: ${err.message}`);
        failed++;
      }
    }

    // Summary
    console.log(`\n${colors.bold}MIGRATION COMPLETE${colors.reset}`);
    log('info', `Total: ${courseIds.length}`);
    log('info', `Migrated: ${migrated}`);
    log('info', `Failed: ${failed}`);

    if (migrated > 0) {
      log('pass', `${migrated} courses now using B2 HLS`);
    }

    await mongoose.disconnect();
  } catch (error) {
    log('fail', ` Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
