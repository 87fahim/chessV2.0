import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as engineController from '../controllers/engineController.js';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware.js';

const router = Router();

// Engine analysis is CPU-bound, so cap how often a single IP can request it.
// 30/min still comfortably covers a full "play vs computer" game.
const engineLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many analysis requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(optionalAuthMiddleware);
router.post('/analyze', engineLimiter, engineController.analyze);

export default router;
