import express from 'express';
import multer from 'multer';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  createCourse,
  uploadCourseVideo,
  uploadCourseThumbnail,
  publishCourse,
  updateCourse,
  deleteCourse,
  createReel,
  updateReel,
  uploadReelVideo,
  uploadReelThumbnail,
  autoGenerateReels,
  deleteReel,
  getAllReels,
  getAllUsers,
  getUserActivityAdmin,
  getUserDetailedStats,
  getDashboardStats,
  getPlatformAnalytics,
  getTopCourses,
  getTopTags,
  getCourseEnrolledUsers,
  migrateLessonChapters,
  cleanupB2DeleteMarkers
} from '../controllers/adminController.js';
import fixHLSUrls from '../controllers/fixHLSController.js';

const router = express.Router();

// Configure multer for file uploads (memory storage for GridFS)
const storage = multer.memoryStorage();

const videoUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Allowed: MP4, WebM, MOV, AVI, MKV'), false);
    }
  }
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max for images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Allowed: JPEG, PNG, GIF, WebP'), false);
    }
  }
});

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// DASHBOARD
// ============================================================================

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// ============================================================================
// COURSE MANAGEMENT
// ============================================================================

// POST /api/admin/courses - Create a new course with optional video, thumbnail, and instructor image
const courseUpload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video format'), false);
      }
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'instructorImage') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image format'), false);
      }
    } else {
      cb(null, true);
    }
  }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'instructorImage', maxCount: 1 }
]);

router.post('/courses', courseUpload, createCourse);

// POST /api/admin/courses/:courseId/video - Upload course video
router.post('/courses/:courseId/video', videoUpload.single('video'), uploadCourseVideo);

// POST /api/admin/courses/:courseId/thumbnail - Upload course thumbnail
router.post('/courses/:courseId/thumbnail', imageUpload.single('thumbnail'), uploadCourseThumbnail);

// PUT /api/admin/courses/:courseId - Update course details (with optional file uploads)
router.put('/courses/:courseId', courseUpload, updateCourse);

// POST /api/admin/courses/:courseId/publish - Publish a course
router.post('/courses/:courseId/publish', publishCourse);

// DELETE /api/admin/courses/:courseId - Delete a course
router.delete('/courses/:courseId', deleteCourse);

// GET /api/admin/courses/:courseId/enrolled-users - Get users enrolled in a course
router.get('/courses/:courseId/enrolled-users', getCourseEnrolledUsers);

// ============================================================================
// REEL MANAGEMENT
// ============================================================================

// GET /api/admin/reels - Get all reels
router.get('/reels', getAllReels);

// Multer middleware for reel creation (text fields + optional video/thumbnail files)
const reelFormParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// POST /api/admin/reels - Create a reel directly (from ReelCreator)
router.post('/reels', reelFormParser, createReel);

// POST /api/admin/courses/:courseId/reels - Create a single reel
router.post('/courses/:courseId/reels', reelFormParser, createReel);

// POST /api/admin/courses/:courseId/reels/auto - Auto-generate reels
router.post('/courses/:courseId/reels/auto', autoGenerateReels);

// DELETE /api/admin/reels/:reelId - Delete a reel
router.delete('/reels/:reelId', deleteReel);

// PUT /api/admin/reels/:reelId - Update a reel
router.put('/reels/:reelId', reelFormParser, updateReel);

// POST /api/admin/reels/:reelId/video - Upload reel video
router.post('/reels/:reelId/video', videoUpload.single('video'), uploadReelVideo);

// POST /api/admin/reels/:reelId/thumbnail - Upload reel thumbnail
router.post('/reels/:reelId/thumbnail', imageUpload.single('thumbnail'), uploadReelThumbnail);

// ============================================================================
// USER MANAGEMENT
// ============================================================================

// GET /api/admin/users - Get all users
router.get('/users', getAllUsers);

// GET /api/admin/users/:userId/activity - Get user activity summary
router.get('/users/:userId/activity', getUserActivityAdmin);

// GET /api/admin/users/:userId/stats - Get user detailed statistics
router.get('/users/:userId/stats', getUserDetailedStats);

// ============================================================================
// ANALYTICS
// ============================================================================

// GET /api/admin/analytics/platform - Get platform analytics
router.get('/analytics/platform', getPlatformAnalytics);

// GET /api/admin/analytics/top-courses - Get top courses by enrollment
router.get('/analytics/top-courses', getTopCourses);

// GET /api/admin/analytics/top-tags - Get top tags by frequency
router.get('/analytics/top-tags', getTopTags);

// ============================================================================
// MAINTENANCE
// ============================================================================

// GET /api/admin/fix-hls-urls - Scan HLS folders and fix missing hlsUrl in database
router.get('/fix-hls-urls', fixHLSUrls);

// POST /api/admin/migrate-lesson-chapters - Normalize chapter metadata for legacy lessons
router.post('/migrate-lesson-chapters', migrateLessonChapters);

// POST /api/admin/b2/cleanup-delete-markers - Delete B2 delete markers
router.post('/b2/cleanup-delete-markers', cleanupB2DeleteMarkers);

// Error handling for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
