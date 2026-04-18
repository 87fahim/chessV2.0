import { Router } from 'express';
import * as engineController from '../controllers/engineController.js';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware.js';

const router = Router();

router.use(optionalAuthMiddleware);
router.post('/analyze', engineController.analyze);

export default router;