import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import * as maintenanceController from '../controllers/maintenanceController.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.post('/backfill/user-domain', maintenanceController.runUserDomainBackfill);

export default router;
