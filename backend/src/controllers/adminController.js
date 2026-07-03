import Course from '../models/Course.js';
import Reel from '../models/Reel.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import mongoose from 'mongoose';
import videoProcessingService from '../services/videoProcessingService.js';
import hlsService from '../services/hlsService.js';
import b2Service from '../services/b2Service.js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Force B2Service to reinitialize with env vars set by server.js
b2Service._initializeCredentials();

const deleteMediaObject = async (media) => {
  if (!media) return;
  await b2Service.deleteByReference(media.fileId || media.url, { strict: true });
};

ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Compress a thumbnail image buffer to JPEG, max 1920px wide, quality 80.
 * Brings typical 1-2MB PNGs down to ~80-150KB JPEGs.
 */
async function compressThumbnail(buffer) {
  try {
    const compressed = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    console.log(`[Thumbnail] Compressed: ${(buffer.length / 1024).toFixed(0)}KB → ${(compressed.length / 1024).toFixed(0)}KB`);
    return { buffer: compressed, contentType: 'image/jpeg' };
  } catch (err) {
    console.warn('[Thumbnail] Compression failed, using original:', err.message);
    return { buffer, contentType: null }; // fallback to original
  }
}

/**
 * Compress a video buffer with ffmpeg: preserve original resolution up to 4K, CRF 22, faststart.
 * Reduces file size while maintaining quality for HLS transcoding.
 */
async function compressVideo(buffer, originalName) {
  const tmpDir = os.tmpdir();
  const inputPath = path.join(tmpDir, `upload_${Date.now()}_${originalName}`);
  const outputPath = path.join(tmpDir, `compressed_${Date.now()}_${originalName.replace(/\.[^.]+$/, '.mp4')}`);

  try {
    // Write input buffer to temp file
    fs.writeFileSync(inputPath, buffer);
    const origSize = buffer.length;

    // Compress with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate('8000k')
        .audioBitrate('192k')
        .outputOptions([
          '-preset fast',
          '-crf 22',
          '-maxrate 20M',
          '-bufsize 40M',
          '-movflags +faststart',
          '-vf', 'scale=trunc(min(iw,3840)/2)*2:-2',
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    const compressedBuf = fs.readFileSync(outputPath);
    console.log(`[Video] Compressed: ${(origSize / 1024 / 1024).toFixed(1)}MB → ${(compressedBuf.length / 1024 / 1024).toFixed(1)}MB`);
    return { buffer: compressedBuf, contentType: 'video/mp4' };
  } catch (err) {
    console.warn('[Video] Compression failed, using original:', err.message);
    return { buffer, contentType: null };
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(inputPath); } catch { }
    try { fs.unlinkSync(outputPath); } catch { }
  }
}

/**
 * Admin Controller
 * Handles all admin operations including video upload and reel creation
 */

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

/**
 * Create a new course with video and thumbnail upload
 */
export const createCourse = async (req, res) => {
  try {
    // Debug logging
    console.log('[DEBUG] createCourse called');
    console.log('[DEBUG] req.body keys:', Object.keys(req.body || {}));
    console.log('[DEBUG] req.files:', req.files ? Object.keys(req.files) : 'undefined');

    const {
      title,
      description,
      instructor,
      duration,
      level,
      category,
      categories,
      tags,
      emotionAffinity,
      energyLevel,
      lessons,
      lessonsCount,
      quizQuestions,
      infoContent,
      packageTiers
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Parse tags if string
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }

    // Parse packageTiers if string
    let parsedPackageTiers = [];
    if (packageTiers) {
      try {
        parsedPackageTiers = typeof packageTiers === 'string' ? JSON.parse(packageTiers) : packageTiers;
      } catch {
        parsedPackageTiers = packageTiers.split(',').map(t => t.trim()).filter(t => t);
      }
    }

    // Parse categories if string
    let parsedCategories = [];
    if (categories) {
      try {
        parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      } catch {
        parsedCategories = [category || 'featured'];
      }
    }

    // Parse lessons if string
    let parsedLessons = [];
    if (lessons) {
      try {
        parsedLessons = typeof lessons === 'string' ? JSON.parse(lessons) : lessons;
      } catch { parsedLessons = []; }
    }

    // Parse quiz questions if string
    let parsedQuizQuestions = [];
    if (quizQuestions) {
      try {
        parsedQuizQuestions = typeof quizQuestions === 'string' ? JSON.parse(quizQuestions) : quizQuestions;
      } catch { parsedQuizQuestions = []; }
    }

    const parsedEmotionAffinity = emotionAffinity
      ? (typeof emotionAffinity === 'string' ? JSON.parse(emotionAffinity) : emotionAffinity)
      : {};

    const parsedLessonsCount = Number.parseInt(lessonsCount, 10);
    const safeLessonsCount = Number.isFinite(parsedLessonsCount) ? parsedLessonsCount : undefined;

    // Create course object
    const course = new Course({
      title,
      description,
      instructor,
      duration: duration || '1h 0m',
      level: level || 'Beginner',
      category: category || parsedCategories[0] || 'featured',
      categories: parsedCategories,
      tags: parsedTags,
      packageTiers: parsedPackageTiers.length > 0 ? parsedPackageTiers : ['Free'],
      emotionAffinity: parsedEmotionAffinity,
      lessons: parsedLessons.length > 0
        ? parsedLessons.length
        : (safeLessonsCount ?? 0),
      lessonsData: parsedLessons,
      quizQuestions: parsedQuizQuestions,
      infoContent: infoContent || '',
      energyLevel: energyLevel || 'medium',
      createdBy: req.userId,
      isPublished: true,
      rating: 5.0,
      students: 0
    });

    // Handle thumbnail upload if provided — auto-compress to JPEG
    // B2 ONLY - no GridFS fallback
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];

      try {
        const { buffer: compressedBuf, contentType: compressedType } = await compressThumbnail(thumbnailFile.buffer);
        const uploadResult = await b2Service.uploadThumbnail(compressedBuf, course._id.toString());
        console.log('✓ Thumbnail uploaded to B2:', uploadResult.url);
        course.thumbnail = uploadResult;
      } catch (uploadError) {
        console.error('Thumbnail upload error (both B2 and GridFS failed):', uploadError);
      }
    }

    // Handle instructor image upload SYNCHRONOUSLY (small file, fast)
    // B2 ONLY - no GridFS fallback
    if (req.files && req.files.instructorImage && req.files.instructorImage[0]) {
      const instructorImageFile = req.files.instructorImage[0];

      try {
        const uploadResult = await b2Service.uploadInstructorImage(
          instructorImageFile.buffer,
          course._id.toString()
        );
        console.log('✓ Instructor image uploaded to B2:', uploadResult.url);
        course.instructorImage = uploadResult;
      } catch (uploadError) {
        console.error('Instructor image upload error (both B2 and GridFS failed):', uploadError);
      }
    }

    // Save course immediately (without video) so frontend gets instant response
    await course.save();

    // Handle video upload ASYNCHRONOUSLY (large file, slow - don't block response)
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const courseId = course._id;

      // INSTANT PLAYBACK: Save temporary videoUrl pointing to original buffer
      // This allows immediate playback while B2 + HLS happen in background
      const tempVideoUrl = `/api/media/temp-${courseId}-${Date.now()}`;
      await Course.findByIdAndUpdate(courseId, {
        videoUrl: tempVideoUrl,
        hlsReady: false,
        hlsUrl: null
      });
      console.log(`[ASYNC] ✓ Temporary videoUrl set for instant playback: ${tempVideoUrl}`);

      // Upload video in background - don't await
      (async () => {
        try {
          console.log(`[ASYNC] Starting background video compress + upload for course ${courseId}...`);
          // Compress video first
          const { buffer: compressedBuf, contentType: compressedType } = await compressVideo(videoFile.buffer, videoFile.originalname);
          const timestamp = Date.now();
          const b2Filename = `videos/${courseId.toString()}-${timestamp}.mp4`;

          // B2 ONLY - no GridFS fallback
          const uploadResult = await b2Service.uploadFile(
            compressedBuf,
            b2Filename,
            'video/mp4'
          );
          console.log(`[ASYNC] ✓ Video uploaded to B2 for course ${courseId}`);

          await Course.findByIdAndUpdate(courseId, {
            video: {
              fileId: uploadResult.fileId,
              filename: uploadResult.filename,
              contentType: 'video/mp4',
              size: uploadResult.size,
              url: uploadResult.url
            },
            videoUrl: uploadResult.url  // Upgrade from temp to B2 URL
          });
          console.log(`[ASYNC] ✓ Video compress + upload complete for course ${courseId}`);

          // Trigger HLS transcoding + B2 upload in background with timeout
          (async () => {
            const hlsTimeoutMs = 120000; // 2 minute timeout
            const hlsPromise = (async () => {
              try {
                const hlsStartTime = Date.now();
                console.log(`[ASYNC] [${new Date().toLocaleTimeString()}] Starting HLS transcoding for course ${courseId}...`);
                console.log(`[ASYNC]   → Transcoding 3 variants (480p, 720p, 1080p) [optimized]`);
                console.log(`[ASYNC]   → Estimated time: 25-35 minutes`);
                
                // Use ORIGINAL buffer for HLS to avoid double compression quality loss
                const transcodeResult = await hlsService.transcodeBufferToHLS(videoFile.buffer, courseId.toString());
                const hlsElapsed = ((Date.now() - hlsStartTime) / 1000 / 60).toFixed(1);
                console.log(`[ASYNC] [${new Date().toLocaleTimeString()}] ✓ HLS transcoding complete in ${hlsElapsed}min: ${transcodeResult.hlsUrl}`);
                
                // Upload HLS segments to B2 (or use local fallback)
                try {
                  const b2StartTime = Date.now();
                  console.log(`[ASYNC] [${new Date().toLocaleTimeString()}] Uploading HLS to B2 for course ${courseId}...`);
                  const hlsB2Result = await hlsService.uploadHLSToB2(courseId.toString());
                  const b2Elapsed = ((Date.now() - b2StartTime) / 1000).toFixed(1);
                  console.log(`[ASYNC] [${new Date().toLocaleTimeString()}] ✓ HLS ready (B2) in ${b2Elapsed}s: ${hlsB2Result.masterUrl}`);
                  await Course.findByIdAndUpdate(courseId, { 
                    hlsUrl: hlsB2Result.masterUrl, 
                    hlsReady: true 
                  });
                } catch (uploadErr) {
                  // B2 upload failed, save local HLS URL instead
                  console.warn(`[ASYNC] [${new Date().toLocaleTimeString()}] ⚠️ HLS B2 upload failed, using local HLS: ${uploadErr.message}`);
                  const fallbackUrl = `/api/hls/${courseId}/master.m3u8`;
                  await Course.findByIdAndUpdate(courseId, { hlsUrl: fallbackUrl, hlsReady: true });
                  console.log(`[ASYNC] [${new Date().toLocaleTimeString()}] ✓ HLS ready (Local): ${fallbackUrl}`);
                }
              } catch (hlsErr) {
                console.error(`[ASYNC] [${new Date().toLocaleTimeString()}] ✗ HLS transcoding failed: ${hlsErr.message}`);
                // Set fallback HLS URL even if transcoding fails
                const fallbackUrl = `/api/hls/${courseId}/master.m3u8`;
                try {
                  await Course.findByIdAndUpdate(courseId, { hlsUrl: fallbackUrl, hlsReady: false });
                  console.log(`[ASYNC] Set fallback HLS URL: ${fallbackUrl}`);
                } catch (dbErr) {
                  console.error(`[ASYNC] Failed to save fallback HLS: ${dbErr.message}`);
                }
              }
            })();

            // Add timeout wrapper
            Promise.race([
              hlsPromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error(`HLS timeout after ${hlsTimeoutMs}ms`)), hlsTimeoutMs)
              )
            ]).catch(err => {
              console.error(`[ASYNC] HLS process error: ${err.message}`);
              // Try to save fallback URL on timeout
              Course.findByIdAndUpdate(courseId, { hlsReady: false })
                .catch(e => console.error(`[ASYNC] Failed to update course on timeout: ${e.message}`));
            });
          })();
        } catch (uploadError) {
          console.error(`[ASYNC] ✗ Video upload failed for course ${courseId}:`, uploadError.message);
        }
      })();
    }

    // Log activity
    try {
      await Activity.logActivity(req.userId, 'admin_create_course', {
        courseId: course._id,
        details: { title }
      });
    } catch (activityError) {
      console.error('Activity log error:', activityError);
    }

    // Get backend URL for media files (still needed for backward compatibility)
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

    // Format response to match frontend expectations
    // With B2, media URLs are now direct CDN URLs (no /api/media redirection needed)
    const responseData = {
      id: course._id.toString(),
      title: course.title,
      instructor: course.instructor,
      thumbnail: course.thumbnail?.url || 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080',
      duration: course.duration || '1h 0m',
      lessons: course.lessons || course.lessonsData?.length || 10,
      lessonsData: course.lessonsData || [],
      category: course.category,
      categories: course.categories || [course.category],
      description: course.description,
      rating: course.rating || 5.0,
      students: course.students || 0,
      videoUrl: course.videoUrl || course.video?.url || null,
      hlsUrl: course.hlsUrl || null,
      hlsReady: course.hlsReady || false,
      progress: 0,
      tags: course.tags || [],
      quizQuestions: course.quizQuestions || [],
      infoContent: course.infoContent || '',
      instructorImage: course.instructorImage?.url || null
    };

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course: ' + error.message });
  }
};

/**
 * Upload video for a course
 */
export const uploadCourseVideo = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete old video if exists
    if (course.video?.fileId) {
      try {
        // GridFS deletion disabled - fileId is now null
        console.log('[uploadCourseVideo] Skipping old file deletion (GridFS disabled)');
        // await gridFSService.deleteFile(course.video.fileId);
      } catch (e) {
        console.log('Old video deletion skipped');
      }
    }

    // Get video metadata
    let videoInfo = {};
    try {
      const tempPath = req.file.path || req.file.buffer;
      if (typeof tempPath === 'string') {
        videoInfo = await videoProcessingService.getVideoMetadata(tempPath);
      }
    } catch (e) {
      console.log('Could not get video metadata:', e.message);
    }

    // Compress video before uploading
    console.log('[uploadCourseVideo] Compressing video before upload...');
    const { buffer: compressedBuf, contentType: compressedType } = await compressVideo(req.file.buffer, req.file.originalname);

    // ⚠️  DISABLED: Upload to GridFS to prevent database bloat
    // Instead, videos go directly to HLS transcoding and B2 (if configured)
    // const uploadResult = await gridFSService.uploadVideo(...);
    
    // Create fake result for HLS workflow
    const uploadResult = {
      fileId: null,
      filename: req.file.originalname.replace(/\.[^.]+$/, '.mp4'),
      contentType: 'video/mp4',
      size: compressedBuf.length,
      url: null // Will be set after HLS transcoding
    };

    // Update course
    course.video = {
      fileId: uploadResult.fileId,
      filename: uploadResult.filename,
      contentType: uploadResult.contentType,
      duration: videoInfo.duration || 0,
      size: uploadResult.size,
      url: uploadResult.url
    };

    // Update course duration if not set
    if (!course.duration && videoInfo.duration) {
      course.duration = Math.ceil(videoInfo.duration / 60); // Convert to minutes
    }

    await course.save();

    // Log activity
    await Activity.logActivity(req.userId, 'admin_upload_video', {
      courseId: course._id,
      details: {
        filename: uploadResult.filename,
        size: uploadResult.size,
        duration: videoInfo.duration
      }
    });

    res.json({
      success: true,
      video: course.video,
      message: 'Video uploaded successfully'
    });

    // Trigger HLS transcoding in background (after response sent)
    (async () => {
      try {
        console.log(`[uploadCourseVideo] Starting HLS transcoding for course ${courseId}...`);
        await hlsService.transcodeBufferToHLS(compressedBuf, courseId);
        console.log(`[uploadCourseVideo] ✓ HLS transcoding complete`);
        
        // Upload HLS segments to B2
        console.log(`[uploadCourseVideo] Uploading HLS segments to B2...`);
        const hlsB2Result = await hlsService.uploadHLSToB2(courseId);
        console.log(`[uploadCourseVideo] ✓ HLS uploaded to B2: ${hlsB2Result.masterUrl}`);
        
        // Update course with B2 URLs
        await Course.findByIdAndUpdate(courseId, { 
          hlsUrl: hlsB2Result.masterUrl,
          hlsVariants: hlsB2Result.variants,
          hlsB2Folder: hlsB2Result.b2Folder,
          hlsReady: true 
        });
        
        console.log(`[uploadCourseVideo] ✓ Course ${courseId} updated with HLS B2 URLs`);
      } catch (hlsErr) {
        console.error(`[uploadCourseVideo] ✗ HLS transcoding failed:`, hlsErr.message);
      }
    })();
  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ error: 'Failed to upload video' });
  }
};

/**
 * Upload thumbnail for a course
 */
export const uploadCourseThumbnail = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail file uploaded' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Delete old thumbnail if exists
    if (course.thumbnail?.fileId) {
      try {
        // GridFS deletion disabled - fileId is now null
        console.log('[uploadCourseThumbnail] Skipping old file deletion (GridFS disabled)');
        // await gridFSService.deleteFile(course.thumbnail.fileId);
      } catch (e) {
        console.log('Old thumbnail deletion skipped');
      }
    }

    // Compress thumbnail
    const { buffer: compressedBuf, contentType: compressedType } = await compressThumbnail(req.file.buffer);
    
    // Upload to B2 (not MongoDB or GridFS)
    console.log('[uploadCourseThumbnail] Uploading to B2...');
    let uploadResult;
    try {
      uploadResult = await b2Service.uploadThumbnail(compressedBuf, courseId);
      console.log(`✓ Thumbnail uploaded to B2: ${uploadResult.url}`);
    } catch (b2Error) {
      console.error('B2 upload failed, using fallback:', b2Error.message);
      // Fallback: if B2 fails, store as base64 (temporary)
      const base64Data = compressedBuf.toString('base64');
      uploadResult = {
        fileId: null,
        filename: req.file.originalname.replace(/\.[^.]+$/, '.jpg'),
        contentType: compressedType || req.file.mimetype,
        url: `data:${compressedType || req.file.mimetype};base64,${base64Data}`
      };
    }

    // Update course
    course.thumbnail = {
      fileId: uploadResult.fileId,
      filename: uploadResult.filename,
      contentType: uploadResult.contentType,
      url: uploadResult.url
    };

    await course.save();

    res.json({
      success: true,
      thumbnail: course.thumbnail,
      message: 'Thumbnail uploaded successfully'
    });
  } catch (error) {
    console.error('Upload thumbnail error:', error);
    res.status(500).json({ error: 'Failed to upload thumbnail' });
  }
};

/**
 * Publish a course
 */
export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Validate course has required fields
    if (!course.video?.fileId) {
      return res.status(400).json({ error: 'Course must have a video before publishing' });
    }

    course.isPublished = true;
    course.publishedAt = new Date();

    await course.save();

    res.json({
      success: true,
      course,
      message: 'Course published successfully'
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ error: 'Failed to publish course' });
  }
};

/**
 * Update a course
 */
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const updates = req.body;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Update basic fields
    if (updates.title) course.title = updates.title;
    if (updates.description) course.description = updates.description;
    if (updates.instructor) course.instructor = updates.instructor;
    if (updates.duration) course.duration = updates.duration;
    if (updates.category) course.category = updates.category;
    if (updates.infoContent) course.infoContent = updates.infoContent;

    // Parse and update tags
    if (updates.tags) {
      try {
        course.tags = typeof updates.tags === 'string' ? JSON.parse(updates.tags) : updates.tags;
      } catch { course.tags = []; }
    }

    // Parse and update packageTiers
    if (updates.packageTiers) {
      try {
        course.packageTiers = typeof updates.packageTiers === 'string' ? JSON.parse(updates.packageTiers) : updates.packageTiers;
      } catch { course.packageTiers = []; }
    }

    // Parse and update categories (multiple)
    if (updates.categories) {
      try {
        course.categories = typeof updates.categories === 'string' ? JSON.parse(updates.categories) : updates.categories;
      } catch { course.categories = []; }
    }

    // Parse and update lessons
    if (updates.lessons) {
      try {
        course.lessonsData = typeof updates.lessons === 'string' ? JSON.parse(updates.lessons) : updates.lessons;
        course.lessons = course.lessonsData.length || parseInt(updates.lessonsCount) || 10;
      } catch {
        course.lessonsData = [];
      }
    }

    // Parse and update quiz questions
    if (updates.quizQuestions) {
      try {
        course.quizQuestions = typeof updates.quizQuestions === 'string' ? JSON.parse(updates.quizQuestions) : updates.quizQuestions;
      } catch { course.quizQuestions = []; }
    }

    // Parse and update emotion affinity
    if (updates.emotionAffinity) {
      try {
        course.emotionAffinity = typeof updates.emotionAffinity === 'string' ? JSON.parse(updates.emotionAffinity) : updates.emotionAffinity;
      } catch { /* keep existing */ }
    }

    // Update energy level
    if (updates.energyLevel) {
      course.energyLevel = updates.energyLevel;
    }

    // Handle thumbnail upload if provided — auto-compress to JPEG
    // B2 ONLY - no GridFS fallback
    if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
      const thumbnailFile = req.files.thumbnail[0];
      try {
        const { buffer: compressedBuf, contentType: compressedType } = await compressThumbnail(thumbnailFile.buffer);
        const uploadResult = await b2Service.uploadThumbnail(compressedBuf, course._id.toString());
        console.log('✓ Thumbnail updated to B2:', uploadResult.url);
        course.thumbnail = uploadResult;
      } catch (uploadError) {
        console.error('Thumbnail upload error (B2 failed):', uploadError);
      }
    }

    // Handle instructor image upload SYNCHRONOUSLY (small file, fast)
    // B2 ONLY - no GridFS fallback
    if (req.files && req.files.instructorImage && req.files.instructorImage[0]) {
      const instructorImageFile = req.files.instructorImage[0];
      try {
        const uploadResult = await b2Service.uploadInstructorImage(
          instructorImageFile.buffer,
          course._id.toString()
        );
        console.log('✓ Instructor image updated to B2:', uploadResult.url);
        course.instructorImage = uploadResult;
      } catch (uploadError) {
        console.error('Instructor image upload error (B2 failed):', uploadError);
      }
    }

    course.updatedAt = new Date();
    await course.save();

    // Handle video upload ASYNCHRONOUSLY (large file, slow - don't block response)
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const courseId = course._id;

      // Upload video in background - don't await
      (async () => {
        try {
          console.log(`[ASYNC] Starting background video compress + upload for course update ${courseId}...`);
          // Compress video first
          const { buffer: compressedBuf, contentType: compressedType } = await compressVideo(videoFile.buffer, videoFile.originalname);
          const timestamp = Date.now();
          const b2Filename = `videos/${courseId.toString()}-${timestamp}.mp4`;

          // B2 ONLY - no GridFS fallback
          const uploadResult = await b2Service.uploadFile(
            compressedBuf,
            b2Filename,
            'video/mp4'
          );
          console.log(`[ASYNC] ✓ Video uploaded to B2 for course update ${courseId}`);

          await Course.findByIdAndUpdate(courseId, {
            video: {
              fileId: uploadResult.fileId,
              filename: uploadResult.filename,
              contentType: 'video/mp4',
              size: uploadResult.size,
              url: uploadResult.url
            },
            videoUrl: uploadResult.url
          });
          console.log(`[ASYNC] ✓ Video compress + upload complete for course update ${courseId}`);

          // Trigger HLS transcoding + B2 upload in background
          (async () => {
            try {
              console.log(`[ASYNC] Starting HLS transcoding + B2 upload for course update ${courseId}...`);
              // Use ORIGINAL buffer for HLS to avoid double compression quality loss
              const { hlsUrl } = await hlsService.transcodeBufferToHLS(videoFile.buffer, courseId.toString());
              
              // Upload HLS segments to B2
              try {
                const hlsB2Result = await hlsService.uploadHLSToB2(courseId.toString());
                console.log(`[ASYNC] ✓ HLS uploaded to B2: ${hlsB2Result.masterUrl}`);
                await Course.findByIdAndUpdate(courseId, { 
                  hlsUrl: hlsB2Result.masterUrl, 
                  hlsReady: true 
                });
              } catch (uploadErr) {
                console.warn(`[ASYNC] ⚠️ HLS B2 upload failed, keeping local URL: ${uploadErr.message}`);
                await Course.findByIdAndUpdate(courseId, { hlsUrl, hlsReady: true });
              }
              
              console.log(`[ASYNC] ✓ HLS transcoding + B2 upload complete for course update ${courseId}`);
            } catch (hlsErr) {
              console.error(`[ASYNC] ✗ HLS transcoding failed for course update ${courseId}:`, hlsErr.message);
            }
          })();
        } catch (uploadError) {
          console.error(`[ASYNC] ✗ Video upload failed for course update ${courseId}:`, uploadError.message);
        }
      })();
    }

    // Log activity
    try {
      await Activity.logActivity(req.userId, 'admin_update_course', {
        courseId: course._id,
        details: { updates: Object.keys(updates) }
      });
    } catch { }

    // Format response
    const responseData = {
      id: course._id.toString(),
      title: course.title,
      instructor: course.instructor,
      thumbnail: course.thumbnail?.fileId
        ? `${backendUrl}/api/media/${course.thumbnail.fileId}`
        : 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1080',
      duration: course.duration || '1h 0m',
      lessons: course.lessons || course.lessonsData?.length || 10,
      lessonsData: course.lessonsData || [],
      category: course.category,
      categories: course.categories || [course.category],
      description: course.description,
      rating: course.rating || 5.0,
      students: course.students || 0,
      videoUrl: course.video?.fileId
        ? `${backendUrl}/api/media/${course.video.fileId}`
        : course.videoUrl,
      hlsUrl: course.hlsUrl || null,
      hlsReady: course.hlsReady || false,
      progress: 0,
      tags: course.tags || [],
      quizQuestions: course.quizQuestions || [],
      infoContent: course.infoContent || '',
      instructorImage: course.instructorImage?.fileId
        ? `${backendUrl}/api/media/${course.instructorImage.fileId}`
        : null
    };

    res.json(responseData);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

/**
 * Delete a course
 */
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await deleteMediaObject(course.video);
    await deleteMediaObject(course.thumbnail);
    await deleteMediaObject(course.instructorImage);
    await b2Service.deleteByReference(course.videoUrl, { strict: true });
    await b2Service.deleteByReference(course.hlsUrl, { strict: true });
    await b2Service.deleteFolder(`hls/${courseId}/`, { strict: true });
    const historicalCoursePrefixes = [
      `videos/${courseId}-`,
      `thumbnails/${courseId}-`,
      `lessons/videos/${courseId}-`,
      `lessons/thumbnails/${courseId}-`
    ];
    for (const prefix of historicalCoursePrefixes) {
      await b2Service.deleteFolder(prefix, { strict: true });
    }
    hlsService.deleteHLSOutput(courseId);

    const lessons = await Lesson.find({ courseId }).select('video thumbnail resources hlsUrl');
    for (const lesson of lessons) {
      await deleteMediaObject(lesson.video);
      await deleteMediaObject(lesson.thumbnail);
      await b2Service.deleteByReference(lesson.hlsUrl, { strict: true });
      if (Array.isArray(lesson.resources)) {
        for (const resource of lesson.resources) {
          await b2Service.deleteByReference(resource?.fileId || resource?.url, { strict: true });
        }
      }
    }
    await Lesson.deleteMany({ courseId });

    // Delete associated reels
    const reels = await Reel.find({
      $or: [
        { course: courseId },
        { courseId: courseId }
      ]
    });
    for (const reel of reels) {
      await deleteMediaObject(reel.video);
      await deleteMediaObject(reel.thumbnail);
      await b2Service.deleteByReference(reel.videoUrl, { strict: true });
    }
    await Reel.deleteMany({
      $or: [
        { course: courseId },
        { courseId: courseId }
      ]
    });

    // Delete course
    await Course.findByIdAndDelete(courseId);

    // Log activity
    await Activity.logActivity(req.userId, 'admin_delete_course', {
      details: { courseId, title: course.title }
    });

    res.json({
      success: true,
      message: 'Course and all associated media deleted'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// ============================================================================
// REEL MANAGEMENT
// ============================================================================

/**
 * Create a reel from a course video
 */
export const createReel = async (req, res) => {
  try {
    // Accept courseId from params or body
    const courseId = req.params.courseId || req.body.courseId;
    const {
      title,
      description,
      creator,
      thumbnail,
      videoUrl,
      sourceLessonId,
      startTime = 0,
      endTime = 30,
      duration = 15, // 15, 30, or 60 seconds
      tags
    } = req.body;

    const parsedTags = (() => {
      if (!tags) return [];
      if (Array.isArray(tags)) return tags;
      try {
        return JSON.parse(tags);
      } catch {
        return String(tags).split(',').map((t) => t.trim()).filter(Boolean);
      }
    })();

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Reel title is required' });
    }

    const reelObjectId = new mongoose.Types.ObjectId();
    const reelId = reelObjectId.toString();

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    // 🔍 DEBUG: Log file info to diagnose 0-byte uploads
    if (videoFile) {
      console.log(`[REEL CREATE] Video file detected:`, {
        filename: videoFile.originalname,
        size: videoFile.size,
        bufferLength: videoFile.buffer?.length,
        mimeType: videoFile.mimetype
      });
    } else {
      console.log(`[REEL CREATE] No video file provided`);
    }

    if (thumbnailFile) {
      console.log(`[REEL CREATE] Thumbnail file detected:`, {
        filename: thumbnailFile.originalname,
        size: thumbnailFile.size,
        bufferLength: thumbnailFile.buffer?.length,
        mimeType: thumbnailFile.mimetype
      });
    }

    let resolvedVideoUrl = typeof videoUrl === 'string' ? videoUrl : (videoUrl?.url || '');
    let resolvedThumbnailUrl = typeof thumbnail === 'string' ? thumbnail : (thumbnail?.url || '');
    let uploadedVideoMeta = null;
    let uploadedThumbnailMeta = null;

    if (sourceLessonId) {
      const sourceLesson = await Lesson.findById(sourceLessonId);
      if (!sourceLesson) {
        return res.status(404).json({ error: 'Source lesson not found for reel clipping' });
      }
      resolvedVideoUrl = sourceLesson.video?.url || resolvedVideoUrl;
      resolvedThumbnailUrl = sourceLesson.thumbnail?.url || resolvedThumbnailUrl;
    }

    // ⚠️ CRITICAL: Validate files have content before uploading
    if (videoFile) {
      if (!videoFile.buffer || videoFile.buffer.length === 0) {
        console.error(`[REEL CREATE ERROR] Video file is empty!`, {
          filename: videoFile.originalname,
          bufferLength: videoFile.buffer?.length
        });
        return res.status(400).json({ error: 'Video file is empty. Please upload a valid video file.' });
      }
      try {
        uploadedVideoMeta = await b2Service.uploadReelVideo(videoFile.buffer, reelId, videoFile.originalname);
        resolvedVideoUrl = uploadedVideoMeta.url;
      } catch (uploadError) {
        console.error(`[REEL CREATE] Video upload failed:`, uploadError.message);
        return res.status(500).json({ error: `Video upload failed: ${uploadError.message}` });
      }
    }

    if (thumbnailFile) {
      if (!thumbnailFile.buffer || thumbnailFile.buffer.length === 0) {
        console.error(`[REEL CREATE ERROR] Thumbnail file is empty!`, {
          filename: thumbnailFile.originalname,
          bufferLength: thumbnailFile.buffer?.length
        });
        return res.status(400).json({ error: 'Thumbnail file is empty. Please upload a valid image file.' });
      }
      try {
        const { buffer: compressedThumb } = await compressThumbnail(thumbnailFile.buffer);
        uploadedThumbnailMeta = await b2Service.uploadReelThumbnail(compressedThumb, reelId);
        resolvedThumbnailUrl = uploadedThumbnailMeta.url;
      } catch (uploadError) {
        console.error(`[REEL CREATE] Thumbnail upload failed:`, uploadError.message);
        return res.status(500).json({ error: `Thumbnail upload failed: ${uploadError.message}` });
      }
    }

    if (!resolvedVideoUrl) {
      return res.status(400).json({
        error: 'Reel video is required. Upload a reel video or choose a source lesson to clip from.'
      });
    }

    const parsedStart = parseFloat(startTime) || 0;
    const parsedEnd = parseFloat(endTime) || Math.max(30, parsedStart + 1);
    const computedDuration = Math.max(1, Math.round(parsedEnd - parsedStart)) || parseInt(duration) || 30;

    const newReel = new Reel({
      _id: reelObjectId,
      title: title.trim(),
      description: description || '',
      creator: creator || 'Unknown',
      courseId: courseId || null,
      course: courseId || null,
      tags: parsedTags,
      videoUrl: resolvedVideoUrl,
      video: uploadedVideoMeta ? {
        fileId: uploadedVideoMeta.fileId,
        filename: uploadedVideoMeta.filename,
        contentType: uploadedVideoMeta.contentType,
        size: uploadedVideoMeta.size,
        url: uploadedVideoMeta.url
      } : undefined,
      thumbnail: resolvedThumbnailUrl ? {
        fileId: uploadedThumbnailMeta?.fileId,
        filename: uploadedThumbnailMeta?.filename,
        contentType: uploadedThumbnailMeta?.contentType,
        url: resolvedThumbnailUrl
      } : undefined,
      sourceVideo: {
        startTime: parsedStart,
        endTime: parsedEnd
      },
      startTime: parsedStart,
      endTime: parsedEnd,
      duration: computedDuration,
      viewCount: 0,
      likeCount: 0,
      isPublished: true,
      createdBy: req.userId
    });

    await newReel.save();

    return res.status(201).json({
      id: newReel._id.toString(),
      title: newReel.title,
      creator: newReel.creator,
      thumbnail: newReel.thumbnail?.url || '',
      videoUrl: newReel.video?.url || newReel.videoUrl,
      courseId: newReel.courseId?.toString() || newReel.course?.toString() || null,
      tags: newReel.tags,
      startTime: newReel.startTime,
      endTime: newReel.endTime,
      duration: newReel.duration,
      views: '0',
      likes: '0'
    });
  } catch (error) {
    console.error('Create reel error:', error);
    res.status(500).json({ error: 'Failed to create reel: ' + error.message });
  }
};

/**
 * Auto-generate multiple reels from a course video
 */
export const autoGenerateReels = async (req, res) => {
  try {
    // ⚠️  DISABLED: Reel auto-generation from B2 video streams not yet implemented
    return res.status(501).json({ 
      error: 'Auto-reel generation is temporarily disabled',
      message: 'Reel generation from B2-stored videos will be available in a future update',
      recommend: 'Use createReel with direct metadata mode for manual reel creation'
    });
  } catch (error) {
    console.error('Auto-generate reels error:', error);
    res.status(500).json({ error: 'Failed to auto-generate reels' });
  }
};

/**
 * Delete a reel
 */
export const deleteReel = async (req, res) => {
  try {
    const { reelId } = req.params;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    await deleteMediaObject(reel.video);
    await deleteMediaObject(reel.thumbnail);

    // Remove from course
    await Course.findByIdAndUpdate(
      reel.course,
      { $pull: { reels: reel._id } }
    );

    // Delete reel
    await Reel.findByIdAndDelete(reelId);

    // Log activity
    await Activity.logActivity(req.userId, 'admin_delete_reel', {
      details: { reelId, title: reel.title }
    });

    res.json({
      success: true,
      message: 'Reel deleted successfully'
    });
  } catch (error) {
    console.error('Delete reel error:', error);
    res.status(500).json({ error: 'Failed to delete reel' });
  }
};

/**
 * Upload reel video to B2
 */
export const uploadReelVideo = async (req, res) => {
  try {
    const { reelId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    // ⚠️ CRITICAL: Validate file has content
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error(`[uploadReelVideo ERROR] Video file is empty!`, {
        filename: req.file.originalname,
        size: req.file.size,
        bufferLength: req.file.buffer?.length
      });
      return res.status(400).json({ error: 'Video file is empty. Please upload a valid video file.' });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Upload to B2
    console.log('[uploadReelVideo] Uploading to B2...');
    let uploadResult;
    try {
      uploadResult = await b2Service.uploadReelVideo(req.file.buffer, reelId, req.file.originalname);
      console.log(`✓ Reel video uploaded to B2: ${uploadResult.url}`);
    } catch (b2Error) {
      console.error('B2 upload failed:', b2Error.message);
      return res.status(500).json({ error: 'B2 upload failed: ' + b2Error.message });
    }

    // Update reel with video information
    reel.video = {
      fileId: uploadResult.fileId || reel._id.toString(),
      filename: uploadResult.filename,
      contentType: uploadResult.contentType,
      size: req.file.size,
      url: uploadResult.url
    };

    await reel.save();

    res.json({
      success: true,
      message: 'Reel video uploaded successfully',
      video: reel.video,
      url: reel.video.url
    });
  } catch (error) {
    console.error('Upload reel video error:', error);
    res.status(500).json({ error: 'Failed to upload reel video: ' + error.message });
  }
};

/**
 * Upload reel thumbnail to B2
 */
export const uploadReelThumbnail = async (req, res) => {
  try {
    const { reelId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No thumbnail file uploaded' });
    }

    // ⚠️ CRITICAL: Validate file has content
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error(`[uploadReelThumbnail ERROR] Thumbnail file is empty!`, {
        filename: req.file.originalname,
        size: req.file.size,
        bufferLength: req.file.buffer?.length
      });
      return res.status(400).json({ error: 'Thumbnail file is empty. Please upload a valid image file.' });
    }

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Compress thumbnail
    const { buffer: compressedBuf, contentType: compressedType } = await compressThumbnail(req.file.buffer);

    // Upload to B2
    console.log('[uploadReelThumbnail] Uploading to B2...');
    let uploadResult;
    try {
      uploadResult = await b2Service.uploadReelThumbnail(compressedBuf, reelId);
      console.log(`✓ Reel thumbnail uploaded to B2: ${uploadResult.url}`);
    } catch (b2Error) {
      console.error('B2 upload failed:', b2Error.message);
      return res.status(500).json({ error: 'B2 upload failed: ' + b2Error.message });
    }

    // Update reel with thumbnail information
    reel.thumbnail = {
      fileId: uploadResult.fileId || reelId,
      filename: uploadResult.filename,
      contentType: uploadResult.contentType,
      url: uploadResult.url
    };

    await reel.save();

    res.json({
      success: true,
      message: 'Reel thumbnail uploaded successfully',
      thumbnail: reel.thumbnail,
      url: reel.thumbnail.url
    });
  } catch (error) {
    console.error('Upload reel thumbnail error:', error);
    res.status(500).json({ error: 'Failed to upload reel thumbnail: ' + error.message });
  }
};

/**
 * Update a reel
 */
export const updateReel = async (req, res) => {
  try {
    const { reelId } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      tags
    } = req.body;

    console.log('[updateReel] Updating reel:', reelId, req.body);

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    // Update fields
    if (title !== undefined) reel.title = title.trim();
    if (description !== undefined) reel.description = description;

    // Update startTime/endTime in both locations for compatibility
    if (startTime !== undefined) {
      const startVal = parseFloat(startTime);
      reel.sourceVideo = reel.sourceVideo || {};
      reel.sourceVideo.startTime = startVal;
      // Also set on reel directly for frontend compatibility
      reel.startTime = startVal;
    }
    if (endTime !== undefined) {
      const endVal = parseFloat(endTime);
      reel.sourceVideo = reel.sourceVideo || {};
      reel.sourceVideo.endTime = endVal;
      // Also set on reel directly for frontend compatibility
      reel.endTime = endVal;
    }
    if (tags !== undefined) {
      reel.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Update duration based on new time range
    if (reel.sourceVideo?.startTime !== undefined && reel.sourceVideo?.endTime !== undefined) {
      reel.duration = Math.round(reel.sourceVideo.endTime - reel.sourceVideo.startTime);
    }

    await reel.save();

    // Log activity (handle if Activity not available)
    try {
      await Activity.logActivity(req.userId, 'admin_update_reel', {
        details: { reelId, title: reel.title }
      });
    } catch (activityError) {
      console.warn('[updateReel] Activity logging failed:', activityError.message);
    }

    // Return updated reel
    res.json({
      id: reel._id.toString(),
      title: reel.title,
      description: reel.description,
      creator: reel.creator,
      thumbnail: typeof reel.thumbnail === 'string' ? reel.thumbnail : (reel.thumbnail?.url || ''),
      videoUrl: reel.videoUrl,
      courseId: reel.courseId?.toString() || reel.course?.toString() || null,
      tags: reel.tags,
      startTime: reel.sourceVideo?.startTime || 0,
      endTime: reel.sourceVideo?.endTime || 30,
      duration: reel.duration,
      views: reel.viewCount?.toString() || '0',
      likes: reel.likeCount?.toString() || '0'
    });
  } catch (error) {
    console.error('Update reel error:', error);
    res.status(500).json({ error: 'Failed to update reel' });
  }
};

/**
 * Get all reels (admin view)
 */
export const getAllReels = async (req, res) => {
  try {
    const { page = 1, limit = 20, courseId } = req.query;

    const filter = courseId ? { course: courseId } : {};

    const reels = await Reel.find(filter)
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Reel.countDocuments(filter);

    // Transform reels for admin panel display
    const transformedReels = reels.map(reel => ({
      id: reel._id.toString(),
      title: reel.title,
      description: reel.description,
      creator: reel.creator || reel.course?.title || 'Unknown',
      thumbnail: typeof reel.thumbnail === 'string' ? reel.thumbnail : (reel.thumbnail?.url || reel.videoUrl || ''),
      videoUrl: reel.videoUrl || reel.video?.url || '',
      courseId: reel.courseId?.toString() || reel.course?._id?.toString() || null,
      courseName: reel.course?.title || null,
      tags: reel.tags || [],
      duration: reel.duration || 30,
      viewCount: reel.viewCount || 0,
      likeCount: reel.likeCount || 0,
      isPublished: reel.isPublished,
      createdAt: reel.createdAt
    }));

    res.json({
      success: true,
      reels: transformedReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all reels error:', error);
    res.status(500).json({ error: 'Failed to get reels' });
  }
};

/**
 * Normalize legacy lessons to ensure chapter metadata exists and is consistent.
 * Supports full run or single-course run using courseId from body/query.
 */
export const migrateLessonChapters = async (req, res) => {
  try {
    const targetCourseId = req.body?.courseId || req.query?.courseId || null;
    const dryRun = String(req.body?.dryRun ?? req.query?.dryRun ?? 'false').toLowerCase() === 'true';

    const courseFilter = targetCourseId ? { _id: targetCourseId } : {};
    const courses = await Course.find(courseFilter).select('_id title lessonsArray');

    if (courses.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No courses found for migration'
      });
    }

    const extractChapterFromTitle = (title = '') => {
      const byPrefix = title.match(/(?:chapter|capitol)\s*(\d+)/i);
      if (byPrefix) {
        const number = parseInt(byPrefix[1], 10);
        return Number.isFinite(number) ? { name: `Capitol ${number}`, order: number } : null;
      }

      const byNumbering = title.match(/(\d+)\s*[.\-]\s*\d+/);
      if (byNumbering) {
        const number = parseInt(byNumbering[1], 10);
        return Number.isFinite(number) ? { name: `Capitol ${number}`, order: number } : null;
      }

      return null;
    };

    let lessonsScanned = 0;
    let lessonsUpdated = 0;
    let coursesUpdated = 0;
    let referencesAdded = 0;
    const perCourse = [];

    for (const course of courses) {
      const rawLessons = await Lesson.find({
        $or: [
          { _id: { $in: course.lessonsArray || [] } },
          { courseId: course._id }
        ]
      });

      const uniqueLessonsMap = new Map();
      rawLessons.forEach((lesson) => uniqueLessonsMap.set(lesson._id.toString(), lesson));
      const uniqueLessons = Array.from(uniqueLessonsMap.values())
        .sort((a, b) => (Number.isFinite(a?.order) ? a.order : 9999) - (Number.isFinite(b?.order) ? b.order : 9999));

      const chapterOrderMap = new Map();
      let nextChapterOrder = 1;
      let courseLessonUpdates = 0;

      for (const lesson of uniqueLessons) {
        lessonsScanned += 1;
        const currentName = lesson?.chapter?.name?.trim();
        const currentOrder = lesson?.chapter?.order;

        let inferred = null;
        if (!currentName || !Number.isFinite(currentOrder)) {
          inferred = extractChapterFromTitle(lesson.title || '');
        }

        const chapterName = currentName || inferred?.name || 'Capitol 1';
        if (!chapterOrderMap.has(chapterName)) {
          const preferredOrder = Number.isFinite(currentOrder)
            ? currentOrder
            : (Number.isFinite(inferred?.order) ? inferred.order : nextChapterOrder);
          chapterOrderMap.set(chapterName, preferredOrder);
          nextChapterOrder = Math.max(nextChapterOrder, preferredOrder + 1);
        }
        const chapterOrder = chapterOrderMap.get(chapterName);

        const needsUpdate = lesson.courseId?.toString() !== course._id.toString()
          || !lesson.chapter
          || lesson.chapter.name !== chapterName
          || lesson.chapter.order !== chapterOrder;

        if (needsUpdate) {
          courseLessonUpdates += 1;
          lessonsUpdated += 1;
          if (!dryRun) {
            lesson.courseId = course._id;
            lesson.chapter = { name: chapterName, order: chapterOrder };
            lesson.updatedAt = new Date();
            await lesson.save();
          }
        }

        if (!(course.lessonsArray || []).some((id) => id.toString() === lesson._id.toString())) {
          referencesAdded += 1;
          if (!dryRun) {
            course.lessonsArray.push(lesson._id);
          }
        }
      }

      if (!dryRun && (courseLessonUpdates > 0 || referencesAdded > 0)) {
        await course.save();
      }

      if (courseLessonUpdates > 0) {
        coursesUpdated += 1;
      }

      perCourse.push({
        courseId: course._id.toString(),
        title: course.title,
        lessonsFound: uniqueLessons.length,
        lessonsUpdated: courseLessonUpdates
      });
    }

    return res.json({
      success: true,
      dryRun,
      summary: {
        coursesScanned: courses.length,
        coursesUpdated,
        lessonsScanned,
        lessonsUpdated,
        referencesAdded
      },
      details: perCourse
    });
  } catch (error) {
    console.error('Migrate lesson chapters error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to migrate lesson chapters',
      details: error.message
    });
  }
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;

    const filter = role ? { role } : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Get user activity (admin only)
 */
export const getUserActivityAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const summary = await Activity.getUserSummary(userId, parseInt(days));

    const recentActivity = await Activity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      success: true,
      summary,
      recentActivity
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get user activity' });
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Get admin dashboard stats
 */
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ isPublished: true });
    const totalReels = await Reel.countDocuments();

    let storageStats = {
      provider: 'Backblaze B2 + Cloudflare CDN',
      usedBytes: 0,
      usagePercent: 0,
      quota: {
        freeBytes: 10 * 1024 * 1024 * 1024,
        remainingFreeBytes: 10 * 1024 * 1024 * 1024,
        billableBytes: 0,
        pricePerGbMonth: 0.006,
        estimatedMonthlyCost: 0
      }
    };

    try {
      storageStats = await b2Service.getStorageStats();
    } catch (storageError) {
      console.warn('Unable to load B2 storage stats:', storageError.message);
    }

    // Get recent activity count
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogins = await Activity.countDocuments({
      action: 'login',
      timestamp: { $gte: last24Hours }
    });

    // Get top courses by enrollment
    const topCourses = await Course.find({ isPublished: true })
      .sort({ enrollmentCount: -1 })
      .limit(5)
      .select('title enrollmentCount rating');

    res.json({
      success: true,
      stats: {
        users: totalUsers,
        courses: {
          total: totalCourses,
          published: publishedCourses
        },
        reels: totalReels,
        storage: storageStats,
        recentLogins,
        topCourses
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};

/**
 * Get platform analytics for a given period
 */
export const getPlatformAnalytics = async (req, res) => {
  try {
    const { period = 'weekly' } = req.query;

    // Calculate date range based on period
    let startDate;
    const now = new Date();
    switch (period) {
      case 'daily':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: startDate }
    });

    // Count enrollments
    const enrollments = await User.aggregate([
      { $project: { enrolledCount: { $size: { $ifNull: ['$enrolledCourses', []] } } } },
      { $group: { _id: null, total: { $sum: '$enrolledCount' } } }
    ]);
    const totalCourseEnrollments = enrollments[0]?.total || 0;

    // Count completions
    const completions = await User.aggregate([
      { $project: { completedCount: { $size: { $ifNull: ['$completedCourses', []] } } } },
      { $group: { _id: null, total: { $sum: '$completedCount' } } }
    ]);
    const completedCourses = completions[0]?.total || 0;

    // Calculate average engagement (based on login frequency and course progress)
    const averageEngagement = totalUsers > 0
      ? Math.round((activeUsers / totalUsers) * 100)
      : 0;

    res.json({
      totalUsers,
      activeUsers,
      totalCourseEnrollments,
      completedCourses,
      averageEngagement,
      period
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({ error: 'Failed to get platform analytics' });
  }
};

/**
 * Get top courses by enrollment
 */
export const getTopCourses = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const courses = await Course.find({ isPublished: true })
      .sort({ enrollmentCount: -1, rating: -1 })
      .limit(parseInt(limit))
      .select('title enrollmentCount completionCount rating');

    const topCourses = courses.map(course => ({
      name: course.title,
      enrollments: course.enrollmentCount || 0,
      completions: course.completionCount || 0,
      rating: course.rating || 0
    }));

    res.json(topCourses);
  } catch (error) {
    console.error('Get top courses error:', error);
    res.status(500).json({ error: 'Failed to get top courses' });
  }
};

/**
 * Get top tags by frequency
 */
export const getTopTags = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Aggregate tags from all courses
    const tagAggregation = await Course.aggregate([
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tags', frequency: { $sum: 1 } } },
      { $sort: { frequency: -1 } },
      { $limit: parseInt(limit) },
      { $project: { tag: '$_id', frequency: 1, _id: 0 } }
    ]);

    res.json(tagAggregation);
  } catch (error) {
    console.error('Get top tags error:', error);
    res.status(500).json({ error: 'Failed to get top tags' });
  }
};

/**
 * Get detailed stats for a specific user
 */
export const getUserDetailedStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password')
      .populate('enrolledCourses', 'title category')
      .populate('completedCourses', 'title category');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const activities = await Activity.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(100);

    const summary = await Activity.getUserSummary(userId, 365); // 1 year summary

    // Calculate some custom stats
    const totalActions = summary.reduce((acc, s) => acc + s.count, 0);
    const favoriteCategory = await Activity.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), action: 'view_course' } },
      { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseData' } },
      { $unwind: '$courseData' },
      { $group: { _id: '$courseData.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        totalWatchTime: user.totalWatchTime,
        enrolledCount: user.enrolledCourses.length,
        completedCount: user.completedCourses.length,
        interests: user.interests,
        activityDomain: user.activityDomain
      },
      stats: {
        totalActions,
        summary,
        favoriteCategory: favoriteCategory[0]?._id || 'None',
        recentActivity: activities
      }
    });
  } catch (error) {
    console.error('Get user detailed stats error:', error);
    res.status(500).json({ error: 'Failed to get user detailed stats' });
  }
};

/**
 * Get all users enrolled in a specific course
 */
export const getCourseEnrolledUsers = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Find all users who have this course in their enrolledCourses array
    const users = await User.find({
      enrolledCourses: new mongoose.Types.ObjectId(courseId)
    })
      .select('username email lastLogin enrolledCourses completedCourses')
      .lean();

    // Check if each user completed the course
    const enrolledUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.username,
      email: user.email,
      lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : null,
      completed: user.completedCourses?.some(c => c.toString() === courseId) || false,
      enrolledCount: user.enrolledCourses?.length || 0
    }));

    res.json({
      success: true,
      courseId,
      enrolledCount: enrolledUsers.length,
      users: enrolledUsers
    });
  } catch (error) {
    console.error('Get course enrolled users error:', error);
    res.status(500).json({ error: 'Failed to get enrolled users' });
  }
};

/**
 * Cleanup B2 delete markers
 */
export const cleanupB2DeleteMarkers = async (req, res) => {
  try {
    const result = await b2Service.cleanupDeleteMarkers();
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Cleanup B2 delete markers error:', error);
    res.status(500).json({ error: 'Failed to cleanup B2 delete markers' });
  }
};
