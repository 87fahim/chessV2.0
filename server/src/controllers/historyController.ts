import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as historyService from '../services/historyService.js';

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const filter: historyService.HistoryFilter = {};

  if (req.query.result) filter.result = req.query.result as string;
  if (req.query.mode) filter.mode = req.query.mode as string;
  if (req.query.color) filter.color = req.query.color as 'white' | 'black';
  if (req.query.dateFrom) filter.dateFrom = new Date(req.query.dateFrom as string);
  if (req.query.dateTo) filter.dateTo = new Date(req.query.dateTo as string);
  if (req.query.opponent) filter.opponent = req.query.opponent as string;

  const { games, total } = await historyService.getUserHistory(req.user!.userId, filter, page, limit);

  res.json({
    success: true,
    data: { games },
    total,
    page,
    limit,
  });
});

export const getHistoryGame = asyncHandler(async (req: Request, res: Response) => {
  const game = await historyService.getHistoryGame(req.params.id as string, req.user!.userId);

  res.json({ success: true, data: { game } });
});
