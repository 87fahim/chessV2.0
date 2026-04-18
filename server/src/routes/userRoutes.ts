import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import * as userController from '../controllers/userController.js';

const router = Router();

router.use(authMiddleware);

router.get('/summary', userController.getSummary);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

router.get('/stats', userController.getStats);

router.get('/social', userController.getSocial);
router.put('/social', userController.updateSocial);
router.post('/social/friends/request', userController.sendFriendRequest);
router.post('/social/friends/:userId/accept', userController.acceptFriendRequest);
router.post('/social/friends/:userId/decline', userController.declineFriendRequest);
router.post('/social/block/:userId', userController.blockUser);
router.delete('/social/block/:userId', userController.unblockUser);

router.post('/activity', userController.recordActivity);
router.get('/activity/recent', userController.getRecentActivity);
router.get('/search', userController.searchUsers);
router.get('/positions', userController.getSavedPositions);
router.post('/positions', userController.savePosition);
router.delete('/positions/:positionId', userController.deleteSavedPosition);

export default router;
