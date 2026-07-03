import express from 'express';
import * as instructorController from '../controllers/instructorController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const imageUpload = multer({
	storage,
	limits: {
		fileSize: 10 * 1024 * 1024
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

// Public routes
router.get('/', instructorController.getAllInstructors);
router.get('/:id', instructorController.getInstructorDetail);
router.get('/:id/courses-users', instructorController.getInstructorCoursesWithUsers);

// Admin routes
router.post('/', authenticateToken, isAdmin, imageUpload.single('profileImage'), instructorController.createInstructor);
router.put('/:id', authenticateToken, isAdmin, imageUpload.single('profileImage'), instructorController.updateInstructor);
router.delete('/:id', authenticateToken, isAdmin, instructorController.deleteInstructor);
router.post('/:id/courses', authenticateToken, isAdmin, instructorController.addCourseToInstructor);

export default router;
