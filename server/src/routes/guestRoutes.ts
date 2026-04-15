import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as guestService from '../services/guestService.js';

const router = Router();

router.post(
  '/session',
  asyncHandler(async (_req: Request, res: Response) => {
    const session = await guestService.createGuestSession();
    res.status(201).json({ success: true, data: { session } });
  })
);

router.get(
  '/session/:guestId',
  asyncHandler(async (req: Request, res: Response) => {
    const session = await guestService.getGuestSession(req.params.guestId as string);
    res.json({ success: true, data: { session } });
  })
);

export default router;
