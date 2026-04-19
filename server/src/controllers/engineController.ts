import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzePosition, cancelAnalysis } from '../services/stockfishService.js';
import { recordActivity } from '../services/userService.js';

const analyzeSchema = z.object({
  fen: z.string().min(1, 'FEN is required'),
  options: z
    .object({
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      searchMode: z.enum(['depth', 'time']).optional(),
      searchDepth: z.number().int().min(1).max(60).optional(),
      moveTimeMs: z.number().int().min(50).max(120000).optional(),
    })
    .optional(),
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  const input = analyzeSchema.parse(req.body);

  // Cancel the Stockfish search if the client disconnects mid-analysis
  let cancelled = false;
  const onClose = () => { cancelled = true; cancelAnalysis(); };
  req.on('close', onClose);

  const result = await analyzePosition(input.fen, input.options || {});

  req.off('close', onClose);

  // Don't send a response if the client already disconnected
  if (cancelled) return;

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