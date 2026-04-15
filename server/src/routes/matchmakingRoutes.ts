import { Router } from 'express';
import * as matchmakingController from '../controllers/matchmakingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/join', matchmakingController.joinQueue);
router.post('/leave', matchmakingController.leaveQueue);
router.get('/status', matchmakingController.getQueueStatus);

export default router;
