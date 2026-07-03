import express from 'express';
import * as recommendationController from '../controllers/recommendationController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, recommendationController.getRecommendations);
router.post('/emotion', authenticateToken, recommendationController.recommendByEmotion);
router.post('/interaction', authenticateToken, recommendationController.recordInteraction);
router.post('/rate', authenticateToken, recommendationController.rateCourse);

export default router;
