import { Router } from 'express';
import * as gameController from '../controllers/gameController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware.js';

const router = Router();

// Active session lookup — works for both authenticated users and guests
router.get('/active-session', optionalAuthMiddleware, gameController.getActiveSessionGame);

router.use(authMiddleware);

router.get('/', gameController.getGames);
router.post('/', gameController.createGame);
router.post('/save-completed', gameController.saveCompletedGame);
router.get('/:id', gameController.getGame);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);

export default router;
