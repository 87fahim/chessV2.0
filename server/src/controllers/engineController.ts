import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzePosition } from '../services/stockfishService.js';
import { recordActivity } from '../services/userService.js';

const analyzeSchema = z.object({
  fen: z.string().min(1, 'FEN is required'),
  options: z
    .object({
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      searchMode: z.enum(['depth', 'time']).optional(),
      searchDepth: z.number().int().min(1).max(30).optional(),
      moveTimeMs: z.number().int().min(50).max(30000).optional(),
    })
    .optional(),
  enginePath: z.string().optional(),
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  const input = analyzeSchema.parse(req.body);
  const result = await analyzePosition(input.fen, input.options || {});

  if (req.user?.userId) {
    await recordActivity(req.user.userId, {
      activityType: 'analysis_request',
      feature: 'analysis',
      fen: input.fen,
      metadata: {
        difficulty: input.options?.difficulty,
        searchMode: input.options?.searchMode,
        searchDepth: input.options?.searchDepth,
        moveTimeMs: input.options?.moveTimeMs,
      },
    });
  }

  res.json({ success: true, data: result });
});