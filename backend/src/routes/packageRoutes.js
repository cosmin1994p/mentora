import express from 'express';
import * as packageController from '../controllers/packageController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', packageController.getAllPackages);
router.get('/:id', packageController.getPackageDetail);

// Admin routes
router.post('/', authenticateToken, isAdmin, packageController.createPackage);
router.put('/:id', authenticateToken, isAdmin, packageController.updatePackage);
router.delete('/:id', authenticateToken, isAdmin, packageController.deletePackage);
router.post('/:id/courses', authenticateToken, isAdmin, packageController.addCoursesToPackage);

export default router;
