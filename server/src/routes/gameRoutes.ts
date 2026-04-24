import { Router } from 'express';
import * as gameController from '../controllers/gameController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', gameController.getGames);
router.post('/', gameController.createGame);
router.post('/save-completed', gameController.saveCompletedGame);
router.get('/:id', gameController.getGame);
router.put('/:id', gameController.updateGame);
router.delete('/:id', gameController.deleteGame);

export default router;
