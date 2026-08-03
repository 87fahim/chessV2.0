import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as historyService from '../services/historyService.js';

// Query params are attacker-controlled and Express parses `?a[$ne]=x` into
// objects, so everything must be validated as plain scalars before it can
// reach a Mongo query.
const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  result: z.enum(['1-0', '0-1', '1/2-1/2', '*']).optional(),
  mode: z.enum(['local', 'computer', 'analysis', 'online']).optional(),
  color: z.enum(['white', 'black']).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  opponent: z.string().trim().min(1).max(50).optional(),
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const query = historyQuerySchema.parse(req.query);

  const filter: historyService.HistoryFilter = {
    result: query.result,
    mode: query.mode,
    color: query.color,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    opponent: query.opponent,
  };

  const { games, total } = await historyService.getUserHistory(
    req.user!.userId,
    filter,
    query.page,
    query.limit,
  );

  res.json({
    success: true,
    data: { games },
    total,
    page: query.page,
    limit: query.limit,
  });
});

export const getHistoryGame = asyncHandler(async (req: Request, res: Response) => {
  const game = await historyService.getHistoryGame(req.params.id as string, req.user!.userId);

  res.json({ success: true, data: { game } });
});
