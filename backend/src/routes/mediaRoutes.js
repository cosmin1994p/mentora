/**
 * Media Routes — B2 + Cloudflare CDN Direct Serving
 * 
 * Redirect all media requests directly to B2 CDN URLs
 * No local caching, no GridFS fallback
 * 
 * GET /api/media/:fileId                → Redirect to B2 CDN URL
 * GET /api/media/:fileId/info           → Get file info, redirect URL
 * GET /api/media/thumbnails/:fileId     → Redirect to B2 CDN URL
 * GET /api/media/reel-thumbnails/:fileId → Redirect to B2 CDN URL
 */

import express from 'express';
import b2Service from '../services/b2Service.js';
import Course from '../models/Course.js';
import Reel from '../models/Reel.js';

const router = express.Router();

/**
 * Proxy: handle fileId to construct B2 path and redirect
 * 
 * fileId can be:
 * 1. Full B2 path: "videos/courseId-timestamp-filename.mp4" 
 * 2. Legacy MongoDB ObjectId: "69da8a71473f86f787a0fbd7" (will try to look up from DB)
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID required' });
    }

    const cleanId = fileId.trim();
    
    // Check if it's a B2 path (contains "/" or has our path prefixes)
    if (cleanId.includes('/') || cleanId.startsWith('videos/') || cleanId.startsWith('thumbnails/') || cleanId.startsWith('instructor-images/')) {
      // Direct B2 path — redirect to CDN
      const cdnUrl = b2Service.getFileUrl(cleanId);
      console.log(`[Media] Redirecting to B2 CDN: ${cdnUrl}`);
      return res.redirect(cdnUrl);
    }

    // Legacy: MongoDB ObjectId — try to find in database and get B2 path
    console.log(`[Media] Checking for legacy MongoDB fileId: ${cleanId}`);
    
    // Try to find in courses (video or thumbnail)
    const courseWithVideo = await Course.findOne({ 'video.fileId': cleanId });
    if (courseWithVideo && courseWithVideo.video?.url) {
      const url = courseWithVideo.video.url;
      if (url.startsWith('http')) {
        console.log(`[Media] Found course video, redirecting to: ${url}`);
        return res.redirect(url);
      }
    }

    const courseWithThumbnail = await Course.findOne({ 'thumbnail.fileId': cleanId });
    if (courseWithThumbnail && courseWithThumbnail.thumbnail?.url) {
      const url = courseWithThumbnail.thumbnail.url;
      if (url.startsWith('http')) {
        console.log(`[Media] Found course thumbnail, redirecting to: ${url}`);
        return res.redirect(url);
      }
    }

    const courseWithInstructorImage = await Course.findOne({ 'instructorImage.fileId': cleanId });
    if (courseWithInstructorImage && courseWithInstructorImage.instructorImage?.url) {
      const url = courseWithInstructorImage.instructorImage.url;
      if (url.startsWith('http')) {
        console.log(`[Media] Found instructor image, redirecting to: ${url}`);
        return res.redirect(url);
      }
    }

    // Try reels
    const reel = await Reel.findOne({ 'thumbnail.fileId': cleanId });
    if (reel && reel.thumbnail?.url) {
      const url = reel.thumbnail.url;
      if (url.startsWith('http')) {
        console.log(`[Media] Found reel thumbnail, redirecting to: ${url}`);
        return res.redirect(url);
      }
    }

    // Not found
    res.status(404).json({ error: 'Media file not found' });
  } catch (error) {
    console.error('[Media] Error:', error.message);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * GET /api/media/:fileId/info - Get file info and redirect
 */
router.get('/:fileId/info', async (req, res) => {
  try {
    const { fileId } = req.params;
    const cleanId = fileId.trim();

    // Try to find in database
    const course = await Course.findOne({
      $or: [
        { 'video.fileId': cleanId },
        { 'thumbnail.fileId': cleanId },
        { 'instructorImage.fileId': cleanId }
      ]
    });

    if (course) {
      const video = course.video?.fileId === cleanId ? course.video : null;
      const thumbnail = course.thumbnail?.fileId === cleanId ? course.thumbnail : null;
      const instructorImage = course.instructorImage?.fileId === cleanId ? course.instructorImage : null;

      const file = video || thumbnail || instructorImage;
      if (file) {
        return res.json({
          success: true,
          file: {
            id: file.fileId,
            filename: file.filename,
            contentType: file.contentType,
            size: file.size,
            url: file.url,
            b2Url: b2Service.getB2Url(file.fileId)
          }
        });
      }
    }

    // Try reel
    const reel = await Reel.findOne({ 'thumbnail.fileId': cleanId });
    if (reel && reel.thumbnail) {
      return res.json({
        success: true,
        file: {
          id: reel.thumbnail.fileId,
          filename: reel.thumbnail.filename,
          contentType: reel.thumbnail.contentType,
          size: reel.thumbnail.size,
          url: reel.thumbnail.url,
          b2Url: b2Service.getB2Url(reel.thumbnail.fileId)
        }
      });
    }

    res.status(404).json({ error: 'Media not found' });
  } catch (error) {
    console.error('[Media] Info error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/media/thumbnails/:fileId - Redirect thumbnail
 */
router.get('/thumbnails/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const cleanId = fileId.trim();

    // Check DB for thumbnail info
    const course = await Course.findOne({ 'thumbnail.fileId': cleanId });
    if (course && course.thumbnail?.url) {
      const url = course.thumbnail.url;
      if (url.startsWith('http')) {
        return res.redirect(url);
      }
    }

    // Direct B2 path
    if (cleanId.includes('/') || cleanId.startsWith('thumbnails/')) {
      const cdnUrl = b2Service.getFileUrl(cleanId);
      return res.redirect(cdnUrl);
    }

    res.status(404).json({ error: 'Thumbnail not found' });
  } catch (error) {
    console.error('[Thumbnail] Error:', error);
    res.status(404).json({ error: 'Not found' });
  }
});

/**
 * GET /api/media/reel-thumbnails/:fileId - Redirect reel thumbnail
 */
router.get('/reel-thumbnails/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const cleanId = fileId.trim();

    // Check DB for reel thumbnail info
    const reel = await Reel.findOne({ 'thumbnail.fileId': cleanId });
    if (reel && reel.thumbnail?.url) {
      const url = reel.thumbnail.url;
      if (url.startsWith('http')) {
        return res.redirect(url);
      }
    }

    // Direct B2 path
    if (cleanId.includes('/') || cleanId.startsWith('thumbnails/')) {
      const cdnUrl = b2Service.getFileUrl(cleanId);
      return res.redirect(cdnUrl);
    }

    res.status(404).json({ error: 'Reel thumbnail not found' });
  } catch (error) {
    console.error('[Reel Thumbnail] Error:', error);
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
