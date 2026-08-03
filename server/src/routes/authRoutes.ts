import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Rate limiting for auth endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // credential guessing is the main threat here, keep it tight
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10, // account creation floods
  message: { error: 'Too many accounts created from this IP, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Refresh happens automatically from the client, so it needs more headroom
// than login, but an unbounded endpoint would let attackers hammer token
// rotation and the database.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.post('/refresh', refreshLimiter, authController.refresh);

export default router;
