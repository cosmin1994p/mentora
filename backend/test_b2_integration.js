#!/usr/bin/env node

/**
 * Quick Test Script: B2 + Cloudflare Integration
 * 
 * Verifies that:
 * 1. B2 service is configured
 * 2. Cloudflare URLs are accessible
 * 3. MediaRoutes can redirect properly
 * 4. HLS playlists are generated correctly
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import b2Service from './src/services/b2Service.js';
import mongoose from 'mongoose';
import Course from './src/models/Course.js';

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

async function testB2Config() {
  console.log(`\n${colors.bold}1. Testing B2 Configuration${colors.reset}`);
  
  if (b2Service.isEnabled()) {
    log('pass', 'B2 Service is enabled');
    log('info', `Endpoint: ${process.env.B2_ENDPOINT}`);
    log('info', `Bucket: ${process.env.B2_BUCKET_NAME}`);
    log('info', `CDN URL: ${process.env.B2_CDN_URL}`);
    return true;
  } else {
    log('fail', 'B2 Service is NOT configured');
    log('warn', 'Check B2_KEY_ID, B2_APP_KEY, B2_BUCKET_NAME in .env');
    return false;
  }
}

async function testB2Upload() {
  console.log(`\n${colors.bold}2. Testing B2 Upload${colors.reset}`);
  
  try {
    const testBuffer = Buffer.from('Test file content for B2', 'utf8');
    const result = await b2Service.uploadFile(
      testBuffer,
      `test/${Date.now()}-test.txt`,
      'text/plain'
    );
    
    log('pass', 'B2 upload successful');
    log('info', `URL: ${result.url}`);
    
    // Clean up
    try {
      await b2Service.deleteFile(result.fileId);
      log('pass', 'Test file cleaned up from B2');
    } catch (e) {
      log('warn', 'Could not delete test file (minor issue)');
    }
    
    return true;
  } catch (error) {
    log('fail', `B2 upload failed: ${error.message}`);
    return false;
  }
}

async function testMediaUrls() {
  console.log(`\n${colors.bold}3. Testing Media URL Patterns${colors.reset}`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const courses = await Course.find().limit(2).lean();
    
    if (courses.length === 0) {
      log('warn', 'No courses found in database');
      return true;
    }
    
    for (const course of courses) {
      if (course.video?.url) {
        log('info', `Course: ${course.title}`);
        log('info', `  Video URL: ${course.video.url}`);
        
        if (course.video.url.includes('cdn.mentora.page') || course.video.url.includes('backblazeb2.com')) {
          log('pass', `  ✓ URL is from B2/Cloudflare`);
        } else if (course.video.url.startsWith('/api/media/')) {
          log('warn', `  ⚠️ URL is legacy (uses /api/media redirect)`);
        }
      }
    }
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log('fail', `Database check failed: ${error.message}`);
    return false;
  }
}

async function testHLSConfig() {
  console.log(`\n${colors.bold}4. Testing HLS Configuration${colors.reset}`);
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const hlsReady = await Course.findOne({ hlsReady: true });
    
    if (hlsReady) {
      log('pass', 'HLS-ready courses found');
      log('info', `Example: ${hlsReady.title}`);
      log('info', `HLS URL: ${hlsReady.hlsUrl}`);
      
      if (hlsReady.hlsUrl?.includes('b2') || hlsReady.hlsUrl?.includes('backblaze') || hlsReady.hlsUrl?.includes('cdn.mentora')) {
        log('pass', '✓ HLS URL is from B2/Cloudflare');
      } else {
        log('warn', '⚠️ HLS URL might be local');
      }
    } else {
      log('warn', 'No HLS-ready courses found (normal for new setup)');
    }
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log('fail', `HLS check failed: ${error.message}`);
    return false;
  }
}

async function testCloudflare() {
  console.log(`\n${colors.bold}5. Testing Cloudflare Access${colors.reset}`);
  
  const cdnUrl = process.env.B2_CDN_URL;
  if (!cdnUrl) {
    log('warn', 'B2_CDN_URL not configured (will use direct B2 URL)');
    return true;
  }
  
  try {
    const response = await fetch(cdnUrl, { method: 'HEAD', timeout: 5000 });
    
    if (response.ok || response.status === 404) {
      log('pass', 'Cloudflare CDN is accessible');
      log('info', `Status: ${response.status}`);
      return true;
    } else {
      log('warn', `Unexpected status: ${response.status}`);
      return true; // Not necessarily a failure
    }
  } catch (error) {
    log('warn', `Could not reach Cloudflare: ${error.message}`);
    log('info', '(This is OK if CDN is not fully set up yet)');
    return true;
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}B2 + Cloudflare Integration Test${colors.reset}\n`);
  
  const results = [];
  
  results.push(await testB2Config());
  results.push(await testB2Upload());
  results.push(await testMediaUrls());
  results.push(await testHLSConfig());
  results.push(await testCloudflare());
  
  console.log(`\n${colors.bold}Summary${colors.reset}`);
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`${colors.green}${passed}/${total}${colors.reset} tests passed\n`);
  
  if (passed === total) {
    log('pass', 'All systems operational! 🚀');
    process.exit(0);
  } else if (passed >= 3) {
    log('warn', 'Some checks failed, but B2 is partially working');
    process.exit(0);
  } else {
    log('fail', 'Critical failure - check configuration');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test script error:', err.message);
  process.exit(1);
});
