import { Router } from 'express';
import * as historyController from '../controllers/historyController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', historyController.getHistory);
router.get('/:id', historyController.getHistoryGame);

export default router;
