import { Request, Response } from 'express';
import { validateFen } from 'chess.js';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../middleware/errorMiddleware.js';
import {
  analyzePosition,
  cancelAnalysis,
  isEngineSaturated,
  MAX_SEARCH_DEPTH,
  MAX_MOVE_TIME_MS,
} from '../services/stockfishService.js';
import { recordActivity } from '../services/userService.js';
import { logger } from '../utils/logger.js';

// FEN fields only ever contain piece letters, digits, slashes, dashes and
// spaces. Anything else (newlines, control chars, ...) is rejected outright so
// the string can never smuggle extra UCI commands into `position fen ...`.
const FEN_CHARSET = /^[A-Za-z0-9/\- ]+$/;

const analyzeSchema = z.object({
  fen: z
    .string()
    .min(1, 'FEN is required')
    .max(100, 'FEN is too long')
    .regex(FEN_CHARSET, 'FEN contains invalid characters'),
  options: z
    .object({
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      searchMode: z.enum(['depth', 'time']).optional(),
      searchDepth: z.number().int().min(1).max(MAX_SEARCH_DEPTH).optional(),
      moveTimeMs: z.number().int().min(50).max(MAX_MOVE_TIME_MS).optional(),
    })
    .optional(),
});

export const analyze = asyncHandler(async (req: Request, res: Response) => {
  logger.info('[engine] analyze request received');
  const input = analyzeSchema.parse(req.body);

  const fenValidation = validateFen(input.fen.trim());
  if (!fenValidation.ok) {
    throw createError(400, 'Invalid FEN position');
  }

  if (isEngineSaturated()) {
    throw createError(503, 'Analysis engine is busy, please try again shortly');
  }

  logger.info(`[engine] parsed fen=${input.fen.substring(0, 30)}... options=${JSON.stringify(input.options)}`);

  // Cancel the Stockfish search if the client disconnects mid-analysis.
  // NOTE: Use res.on('close') — req.on('close') fires as soon as the request
  // body is consumed in Express 5 / Node 22, NOT when the client disconnects.
  let cancelled = false;
  const onClose = () => {
    if (!res.writableEnded) {
      cancelled = true;
      logger.warn('[engine] client disconnected — cancelling analysis');
      cancelAnalysis();
    }
  };
  res.on('close', onClose);

  logger.info('[engine] calling analyzePosition...');
  const result = await analyzePosition(input.fen.trim(), input.options || {});
  logger.info(`[engine] analyzePosition returned: bestMove=${result.bestMove}, cancelled=${cancelled}`);

  res.off('close', onClose);

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