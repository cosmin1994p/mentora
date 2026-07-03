/**
 * Emergency endpoint to fix missing HLS URLs in database
 * GET /api/admin/fix-hls-urls (requires admin token)
 */

import fs from 'fs';
import path from 'path';
import Course from '../models/Course.js';

const HLS_OUTPUT_DIR = './hls_output';

export async function fixHLSUrls(req, res) {
  try {
    // No need to verify admin - requireAdmin middleware already did
    // Just proceed with fixing HLS URLs

    const hlsFolders = fs.readdirSync(HLS_OUTPUT_DIR)
      .filter(f => fs.statSync(path.join(HLS_OUTPUT_DIR, f)).isDirectory());
    
    console.log(`[ADMIN] Scanning ${hlsFolders.length} HLS folders...`);
    
    const results = {
      total: 0,
      fixed: 0,
      missing: 0,
      errors: []
    };

    for (const courseId of hlsFolders) {
      try {
        results.total++;
        
        // Check if master.m3u8 exists
        const masterPath = path.join(HLS_OUTPUT_DIR, courseId, 'master.m3u8');
        if (!fs.existsSync(masterPath)) continue;
        
        const course = await Course.findById(courseId);
        
        if (!course) {
          console.log(`[ADMIN] ⚠️ ${courseId}: Course missing in DB`);
          results.missing++;
          continue;
        }
        
        if (course.hlsUrl) {
          console.log(`[ADMIN] ✓ ${courseId}: Already has hlsUrl`);
          continue;
        }
        
        // Update course with hlsUrl
        const hlsUrl = `/api/hls/${courseId}/master.m3u8`;
        await Course.findByIdAndUpdate(courseId, {
          hlsUrl: hlsUrl,
          hlsReady: true
        });
        
        console.log(`[ADMIN] ✓ ${courseId}: Fixed - ${hlsUrl}`);
        results.fixed++;
        
      } catch (err) {
        results.errors.push({ courseId, error: err.message });
        console.error(`[ADMIN] ✗ ${courseId}: ${err.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Fixed ${results.fixed}/${results.total} courses. ${results.missing} missing in DB.`,
      ...results
    });
    
  } catch (error) {
    console.error('[ADMIN] Fix HLS error:', error);
    res.status(500).json({ error: error.message });
  }
}

export default fixHLSUrls;
