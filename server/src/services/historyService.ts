import { Game, IGame } from '../models/Game.js';
import { GameStatus } from '../constants/gameStatus.js';
import { createError } from '../middleware/errorMiddleware.js';

export interface HistoryFilter {
  result?: string;
  mode?: string;
  dateFrom?: Date;
  dateTo?: Date;
  color?: 'white' | 'black';
}

export async function getUserHistory(
  userId: string,
  filter?: HistoryFilter,
  page = 1,
  limit = 20
): Promise<{ games: IGame[]; total: number }> {
  const query: Record<string, unknown> = {
    status: GameStatus.COMPLETED,
    $or: [
      { 'whitePlayer.userId': userId },
      { 'blackPlayer.userId': userId },
    ],
  };

  if (filter?.result) {
    query.result = filter.result;
  }
  if (filter?.mode) {
    query.mode = filter.mode;
  }
  if (filter?.dateFrom || filter?.dateTo) {
    query.completedAt = {};
    if (filter.dateFrom) (query.completedAt as Record<string, Date>).$gte = filter.dateFrom;
    if (filter.dateTo) (query.completedAt as Record<string, Date>).$lte = filter.dateTo;
  }
  if (filter?.color === 'white') {
    query.$or = [{ 'whitePlayer.userId': userId }];
  } else if (filter?.color === 'black') {
    query.$or = [{ 'blackPlayer.userId': userId }];
  }

  const skip = (page - 1) * limit;

  const [games, total] = await Promise.all([
    Game.find(query).sort({ completedAt: -1 }).skip(skip).limit(limit),
    Game.countDocuments(query),
  ]);

  return { games, total };
}

export async function getHistoryGame(gameId: string, userId: string): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  // Only allow viewing own games
  const isParticipant =
    game.whitePlayer.userId?.toString() === userId ||
    game.blackPlayer.userId?.toString() === userId ||
    game.ownerUserId?.toString() === userId;

  if (!isParticipant) {
    throw createError(403, 'Not authorized to view this game');
  }

  return game;
}
