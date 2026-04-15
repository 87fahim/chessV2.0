import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as matchmakingService from '../services/matchmakingService.js';

const joinQueueSchema = z.object({
  preferredColor: z.enum(['white', 'black', 'random']).optional(),
  rated: z.boolean().optional(),
  timeControl: z.object({
    initialMs: z.number().positive(),
    incrementMs: z.number().min(0),
  }),
});

export const joinQueue = asyncHandler(async (req: Request, res: Response) => {
  const input = joinQueueSchema.parse(req.body);

  await matchmakingService.joinQueue({
    userId: req.user!.userId,
    username: req.user!.username,
    ...input,
  });

  res.json({ success: true, data: { message: 'Joined matchmaking queue' } });
});

export const leaveQueue = asyncHandler(async (req: Request, res: Response) => {
  await matchmakingService.leaveQueue(req.user!.userId);

  res.json({ success: true, data: { message: 'Left matchmaking queue' } });
});

export const getQueueStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await matchmakingService.getQueueStatus(req.user!.userId);

  res.json({ success: true, data: status });
});
