import express from 'express';
import { submitUpgradeRequest } from '../controllers/upgradeController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, submitUpgradeRequest);

export default router;
