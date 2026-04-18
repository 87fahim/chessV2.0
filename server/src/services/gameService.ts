import { Game, IGame, ITimeControl } from '../models/Game.js';
import { createError } from '../middleware/errorMiddleware.js';
import { validateMove, getCurrentTurn } from '../utils/chessEngine.js';
import { GameStatus } from '../constants/gameStatus.js';
import { GameMode } from '../constants/gameMode.js';
import { recordActivity } from './userService.js';

export interface CreatePlayerInput {
  type: 'user' | 'guest' | 'computer';
  userId?: string;
  guestId?: string;
  name: string;
}

export interface CreateGameInput {
  mode: string;
  ownerUserId?: string;
  guestSessionId?: string;
  whitePlayer: CreatePlayerInput;
  blackPlayer: CreatePlayerInput;
  fen?: string;
  timeControl?: ITimeControl;
  difficulty?: string;
  label?: string;
}

export interface MakeMoveInput {
  gameId: string;
  userId: string;
  from: string;
  to: string;
  promotion?: string;
  clientMoveNumber?: number;
}

export interface MoveResult {
  san: string;
  fen: string;
  ply: number;
  gameOver: boolean;
  result?: string;
  reason?: string;
}

async function recordGameCompletion(game: IGame): Promise<void> {
  const playerIds = [game.whitePlayer.userId?.toString(), game.blackPlayer.userId?.toString()].filter(
    (value): value is string => Boolean(value)
  );

  await Promise.all(
    playerIds.map((userId) =>
      recordActivity(userId, {
        activityType: 'game_completed',
        feature: game.mode === GameMode.ONLINE ? 'matchmaking' : 'game',
        gameId: game._id.toString(),
        fen: game.fen,
        metadata: {
          mode: game.mode,
          result: game.result,
          terminationReason: game.terminationReason,
        },
      })
    )
  );
}

export async function createGame(input: CreateGameInput): Promise<IGame> {
  const game = await Game.create({
    mode: input.mode,
    status: input.mode === 'online' ? GameStatus.WAITING_FOR_OPPONENT : GameStatus.ACTIVE,
    ownerUserId: input.ownerUserId,
    guestSessionId: input.guestSessionId,
    whitePlayer: input.whitePlayer,
    blackPlayer: input.blackPlayer,
    fen: input.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    timeControl: input.timeControl,
    difficulty: input.difficulty,
    label: input.label,
    clocks: input.timeControl
      ? {
          whiteRemainingMs: input.timeControl.initialMs,
          blackRemainingMs: input.timeControl.initialMs,
          activeColor: 'white',
          activeSince: undefined,
        }
      : undefined,
  });

  return game;
}

export async function getGameById(gameId: string): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }
  return game;
}

export async function getUserGames(userId: string, status?: string): Promise<IGame[]> {
  const filter: Record<string, unknown> = {
    $or: [
      { ownerUserId: userId },
      { 'whitePlayer.userId': userId },
      { 'blackPlayer.userId': userId },
    ],
  };

  if (status) {
    filter.status = status;
  } else {
    // By default, exclude completed games (those go to history)
    filter.status = { $ne: GameStatus.COMPLETED };
  }

  return Game.find(filter).sort({ updatedAt: -1 });
}

export async function updateGame(gameId: string, userId: string, update: Partial<IGame>): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  // Verify ownership
  const isOwner = game.ownerUserId?.toString() === userId;
  const isWhite = game.whitePlayer.userId?.toString() === userId;
  const isBlack = game.blackPlayer.userId?.toString() === userId;

  if (!isOwner && !isWhite && !isBlack) {
    throw createError(403, 'Not authorized to modify this game');
  }

  Object.assign(game, update);
  await game.save();
  return game;
}

export async function deleteGame(gameId: string, userId: string): Promise<void> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  if (game.ownerUserId?.toString() !== userId) {
    throw createError(403, 'Not authorized to delete this game');
  }

  await Game.findByIdAndDelete(gameId);
}

export async function makeMove(input: MakeMoveInput): Promise<MoveResult> {
  const game = await Game.findById(input.gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  if (game.status !== GameStatus.ACTIVE) {
    throw createError(400, 'Game is not active');
  }

  // Verify it's the correct player's turn
  const currentTurn = getCurrentTurn(game.fen);
  const isWhite = game.whitePlayer.userId?.toString() === input.userId;
  const isBlack = game.blackPlayer.userId?.toString() === input.userId;

  if (currentTurn === 'white' && !isWhite) {
    throw createError(400, 'Not your turn');
  }
  if (currentTurn === 'black' && !isBlack) {
    throw createError(400, 'Not your turn');
  }

  // Idempotency check: if clientMoveNumber is provided, check against current ply
  if (input.clientMoveNumber !== undefined && input.clientMoveNumber !== game.moves.length + 1) {
    throw createError(409, 'Move already processed or stale');
  }

  // Validate the move server-side
  const result = validateMove(game.fen, {
    from: input.from,
    to: input.to,
    promotion: input.promotion,
  });

  if (!result.valid || !result.san || !result.newFen) {
    throw createError(400, 'Illegal move for current position');
  }

  const ply = game.moves.length + 1;
  const now = new Date();

  // Calculate time spent if clocks are active
  let spentTimeMs: number | undefined;
  if (game.clocks?.activeSince) {
    spentTimeMs = now.getTime() - game.clocks.activeSince.getTime();

    // Update clocks
    if (currentTurn === 'white') {
      game.clocks.whiteRemainingMs -= spentTimeMs;
      if (game.timeControl?.incrementMs) {
        game.clocks.whiteRemainingMs += game.timeControl.incrementMs;
      }
    } else {
      game.clocks.blackRemainingMs -= spentTimeMs;
      if (game.timeControl?.incrementMs) {
        game.clocks.blackRemainingMs += game.timeControl.incrementMs;
      }
    }

    // Check for timeout
    if (game.clocks.whiteRemainingMs <= 0) {
      game.clocks.whiteRemainingMs = 0;
      game.status = GameStatus.COMPLETED;
      game.result = '0-1';
      game.terminationReason = 'timeout';
      game.completedAt = now;
      await game.save();
      await recordGameCompletion(game);
      return { san: result.san, fen: result.newFen, ply, gameOver: true, result: '0-1', reason: 'timeout' };
    }
    if (game.clocks.blackRemainingMs <= 0) {
      game.clocks.blackRemainingMs = 0;
      game.status = GameStatus.COMPLETED;
      game.result = '1-0';
      game.terminationReason = 'timeout';
      game.completedAt = now;
      await game.save();
      await recordGameCompletion(game);
      return { san: result.san, fen: result.newFen, ply, gameOver: true, result: '1-0', reason: 'timeout' };
    }

    // Switch active clock
    game.clocks.activeColor = currentTurn === 'white' ? 'black' : 'white';
    game.clocks.activeSince = now;
  }

  // Add the move
  game.moves.push({
    ply,
    from: input.from,
    to: input.to,
    san: result.san,
    fenAfter: result.newFen,
    movedAt: now,
    spentTimeMs,
  });

  game.fen = result.newFen;

  // Check for game over
  if (result.gameOver) {
    game.status = GameStatus.COMPLETED;
    game.result = result.result || '*';
    game.terminationReason = result.reason || undefined;
    game.completedAt = now;
  }

  await game.save();

  if (result.gameOver) {
    await recordGameCompletion(game);
  }

  return {
    san: result.san,
    fen: result.newFen,
    ply,
    gameOver: result.gameOver || false,
    result: result.result,
    reason: result.reason,
  };
}

export async function resignGame(gameId: string, userId: string): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  if (game.status !== GameStatus.ACTIVE) {
    throw createError(400, 'Game is not active');
  }

  const isWhite = game.whitePlayer.userId?.toString() === userId;
  const isBlack = game.blackPlayer.userId?.toString() === userId;

  if (!isWhite && !isBlack) {
    throw createError(403, 'Not a participant in this game');
  }

  game.status = GameStatus.COMPLETED;
  game.result = isWhite ? '0-1' : '1-0';
  game.terminationReason = 'resignation';
  game.completedAt = new Date();

  await game.save();
  await recordGameCompletion(game);
  return game;
}

export async function endGameByTimeout(gameId: string, loserColor: 'white' | 'black'): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  game.status = GameStatus.COMPLETED;
  game.result = loserColor === 'white' ? '0-1' : '1-0';
  game.terminationReason = 'timeout';
  game.completedAt = new Date();

  if (game.clocks) {
    if (loserColor === 'white') {
      game.clocks.whiteRemainingMs = 0;
    } else {
      game.clocks.blackRemainingMs = 0;
    }
  }

  await game.save();
  await recordGameCompletion(game);
  return game;
}

export async function endGameByDraw(gameId: string): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  game.status = GameStatus.COMPLETED;
  game.result = '1/2-1/2';
  game.terminationReason = 'draw_agreement';
  game.completedAt = new Date();

  await game.save();
  await recordGameCompletion(game);
  return game;
}

export async function abandonGame(gameId: string, disconnectedUserId: string): Promise<IGame> {
  const game = await Game.findById(gameId);
  if (!game) {
    throw createError(404, 'Game not found');
  }

  const isWhite = game.whitePlayer.userId?.toString() === disconnectedUserId;

  game.status = GameStatus.ABANDONED;
  game.result = isWhite ? '0-1' : '1-0';
  game.terminationReason = 'abandonment';
  game.completedAt = new Date();

  await game.save();
  await recordGameCompletion(game);
  return game;
}

/** Find an active online game for a user (to support reconnection) */
export async function findActiveOnlineGame(userId: string): Promise<IGame | null> {
  return Game.findOne({
    mode: GameMode.ONLINE,
    status: { $in: [GameStatus.ACTIVE, GameStatus.WAITING_FOR_OPPONENT] },
    $or: [
      { 'whitePlayer.userId': userId },
      { 'blackPlayer.userId': userId },
    ],
  });
}

/** Check if a user is a participant in a specific game */
export function isParticipant(game: IGame, userId: string): { isWhite: boolean; isBlack: boolean; isPlayer: boolean } {
  const isWhite = game.whitePlayer.userId?.toString() === userId;
  const isBlack = game.blackPlayer.userId?.toString() === userId;
  return { isWhite, isBlack, isPlayer: isWhite || isBlack };
}

/** Get the opponent's userId from a game */
export function getOpponentUserId(game: IGame, userId: string): string | null {
  const isWhite = game.whitePlayer.userId?.toString() === userId;
  const isBlack = game.blackPlayer.userId?.toString() === userId;
  if (isWhite) return game.blackPlayer.userId?.toString() ?? null;
  if (isBlack) return game.whitePlayer.userId?.toString() ?? null;
  return null;
}
