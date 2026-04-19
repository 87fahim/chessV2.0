import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { analyzePosition, cancelAnalysis } from '../services/stockfishService.js';
import { recordActivity } from '../services/userService.js';
import { logger } from '../utils/logger.js';

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
  logger.info('[engine] analyze request received');
  const input = analyzeSchema.parse(req.body);
  logger.info(`[engine] parsed fen=${input.fen.substring(0, 30)}... options=${JSON.stringify(input.options)}`);

  // Cancel the Stockfish search if the client disconnects mid-analysis
  let cancelled = false;
  const onClose = () => {
    cancelled = true;
    logger.warn('[engine] client disconnected — cancelling analysis');
    cancelAnalysis();
  };
  req.on('close', onClose);

  logger.info('[engine] calling analyzePosition...');
  const result = await analyzePosition(input.fen, input.options || {});
  logger.info(`[engine] analyzePosition returned: bestMove=${result.bestMove}, cancelled=${cancelled}`);

  req.off('close', onClose);

  // Don't send a response if the client already disconnected
  if (cancelled) {
    logger.warn('[engine] skipping response — client already disconnected');
    return;
  }

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

  logger.info('[engine] sending response');
  res.json({ success: true, data: result });
});