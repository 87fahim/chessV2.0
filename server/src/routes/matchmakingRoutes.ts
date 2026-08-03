import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as matchmakingController from '../controllers/matchmakingController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

const matchmakingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many matchmaking requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authMiddleware);

router.post('/join', matchmakingLimiter, matchmakingController.joinQueue);
router.post('/leave', matchmakingLimiter, matchmakingController.leaveQueue);
router.get('/status', matchmakingController.getQueueStatus);

export default router;
