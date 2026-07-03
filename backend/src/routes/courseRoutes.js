import express from 'express';
import * as courseController from '../controllers/courseController.js';
import * as courseControllerV2 from '../controllers/courseControllerV2.js';
import { authenticateToken, optionalAuth, isAdmin } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for lesson uploads (video + thumbnail)
const storage = multer.memoryStorage();
const lessonUpload = multer({
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
    } else if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid image format'), false);
      }
    } else {
      cb(null, true); // Allow other fields
    }
  }
});

// === OLD COURSE ROUTES (LEGACY) ===
router.get('/', optionalAuth, courseController.getAllCourses);
router.get('/categories', courseController.getCategories);
router.get('/:id', optionalAuth, courseController.getCourseById);
router.post('/', authenticateToken, courseController.createCourse);
router.post('/:id/enroll', authenticateToken, courseController.enrollCourse);
router.post('/:id/complete', authenticateToken, courseController.completeCourse);
router.post('/:id/rate', authenticateToken, courseController.rateCourse);

// === NEW SAAS COURSE ROUTES (V2 - Package-based) ===
// Get courses filtered by package access
router.get('/v2/list', optionalAuth, courseControllerV2.getCourses);

// Get course detail with access check
router.get('/v2/:courseId', optionalAuth, courseControllerV2.getCourseDetail);

// Get lessons for a course
router.get('/v2/:courseId/lessons', optionalAuth, courseControllerV2.getCourseLessons);

// Get individual lesson
router.get('/v2/:courseId/lessons/:lessonId', optionalAuth, courseControllerV2.getLesson);

// === ADMIN COURSE MANAGEMENT ===
// Create new course (admin only)
router.post('/admin/create', authenticateToken, isAdmin, courseControllerV2.createCourse);

// Update course basics (admin only)
router.put('/admin/:courseId', authenticateToken, isAdmin, courseControllerV2.updateCourse);

// Delete course (admin only)
router.delete('/admin/:courseId', authenticateToken, isAdmin, courseControllerV2.deleteCourse);

// Update which package tiers can access this course
router.put('/admin/:courseId/packages', authenticateToken, isAdmin, courseControllerV2.updateCoursePackageTiers);

// === LESSON MANAGEMENT (ADMIN) ===
// Get lessons for a course (admin only)
router.get('/admin/:courseId/lessons', authenticateToken, isAdmin, courseControllerV2.getCourseLessons);

// Add lesson to course (admin only) - accepts video + optional thumbnail
router.post('/admin/:courseId/lessons', authenticateToken, isAdmin, lessonUpload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), courseControllerV2.addLesson);

// Update lesson (admin only)
router.put('/admin/:courseId/lessons/:lessonId', authenticateToken, isAdmin, courseControllerV2.updateLesson);

// Delete lesson from course (admin only)
router.delete('/admin/:courseId/lessons/:lessonId', authenticateToken, isAdmin, courseControllerV2.deleteLesson);

export default router;
