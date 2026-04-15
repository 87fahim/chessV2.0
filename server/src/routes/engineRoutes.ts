import { Router } from 'express';
import * as engineController from '../controllers/engineController.js';

const router = Router();

router.post('/analyze', engineController.analyze);

export default router;