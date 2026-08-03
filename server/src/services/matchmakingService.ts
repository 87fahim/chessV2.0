import { MatchmakingQueue, IMatchmakingQueue } from '../models/MatchmakingQueue.js';
import { Game } from '../models/Game.js';
import { GameStatus } from '../constants/gameStatus.js';
import { GameMode } from '../constants/gameMode.js';
import { createError } from '../middleware/errorMiddleware.js';

/** Max age in ms for a queue entry before automatic expiration */
const QUEUE_STALE_MS = 10 * 60 * 1000; // 10 minutes

export interface QueueJoinInput {
  userId: string;
  username: string;
  preferredColor?: string;
  rated?: boolean;
  timeControl: {
    initialMs: number;
    incrementMs: number;
  };
}

export interface MatchResult {
  gameId: string;
  whiteUserId: string;
  blackUserId: string;
  whiteName: string;
  blackName: string;
  timeControl: { initialMs: number; incrementMs: number };
}

export async function joinQueue(input: QueueJoinInput): Promise<IMatchmakingQueue> {
  // Check if already in queue
  const existing = await MatchmakingQueue.findOne({ userId: input.userId });
  if (existing) {
    throw createError(409, 'Already in matchmaking queue');
  }

  // Check if already in an active game
  const activeGame = await Game.findOne({
    status: { $in: [GameStatus.ACTIVE, GameStatus.WAITING_FOR_OPPONENT] },
    mode: GameMode.ONLINE,
    $or: [
      { 'whitePlayer.userId': input.userId },
      { 'blackPlayer.userId': input.userId },
    ],
  });

  if (activeGame) {
    throw createError(409, 'Already in an active game');
  }

  const entry = await MatchmakingQueue.create({
    userId: input.userId,
    username: input.username,
    preferredColor: input.preferredColor || 'random',
    rated: input.rated || false,
    timeControl: input.timeControl,
  });

  return entry;
}

export async function leaveQueue(userId: string): Promise<void> {
  const result = await MatchmakingQueue.deleteOne({ userId });
  if (result.deletedCount === 0) {
    throw createError(404, 'Not in matchmaking queue');
  }
}

export async function getQueueStatus(userId: string): Promise<{ inQueue: boolean; position?: number }> {
  const entry = await MatchmakingQueue.findOne({ userId });
  if (!entry) {
    return { inQueue: false };
  }

  const position = await MatchmakingQueue.countDocuments({
    timeControl: entry.timeControl,
    joinedAt: { $lte: entry.joinedAt },
  });

  return { inQueue: true, position };
}

export async function findMatch(userId: string): Promise<MatchResult | null> {
  const myEntry = await MatchmakingQueue.findOne({ userId });
  if (!myEntry) return null;

  // Only the later joiner may create the match (userId tie-break on equal
  // joinedAt). Combined with atomic deletes, concurrent findMatch calls cannot
  // both create active games for the same pair.
  const opponent = await MatchmakingQueue.findOneAndDelete({
    userId: { $ne: userId },
    'timeControl.initialMs': myEntry.timeControl.initialMs,
    'timeControl.incrementMs': myEntry.timeControl.incrementMs,
    rated: myEntry.rated,
    $or: [
      { joinedAt: { $lt: myEntry.joinedAt } },
      {
        joinedAt: myEntry.joinedAt,
        userId: { $lt: myEntry.userId },
      },
    ],
  }).sort({ joinedAt: 1 });

  if (!opponent) return null;

  const claimedSelf = await MatchmakingQueue.findOneAndDelete({ userId });
  if (!claimedSelf) {
    // Another path already claimed us; put the opponent back in queue.
    await MatchmakingQueue.create({
      userId: opponent.userId,
      username: opponent.username,
      rating: opponent.rating,
      preferredColor: opponent.preferredColor,
      rated: opponent.rated,
      timeControl: opponent.timeControl,
      joinedAt: opponent.joinedAt,
    });
    return null;
  }

  // Determine colors
  let whiteUserId = claimedSelf.userId.toString();
  let blackUserId = opponent.userId.toString();
  let whiteName = claimedSelf.username;
  let blackName = opponent.username;

  if (claimedSelf.preferredColor === 'black' || opponent.preferredColor === 'white') {
    [whiteUserId, blackUserId] = [blackUserId, whiteUserId];
    [whiteName, blackName] = [blackName, whiteName];
  } else if (claimedSelf.preferredColor === 'random' && opponent.preferredColor === 'random') {
    if (Math.random() < 0.5) {
      [whiteUserId, blackUserId] = [blackUserId, whiteUserId];
      [whiteName, blackName] = [blackName, whiteName];
    }
  }

  // Create the game
  const game = await Game.create({
    mode: GameMode.ONLINE,
    status: GameStatus.ACTIVE,
    whitePlayer: {
      type: 'user',
      userId: whiteUserId,
      name: whiteName,
    },
    blackPlayer: {
      type: 'user',
      userId: blackUserId,
      name: blackName,
    },
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    timeControl: claimedSelf.timeControl,
    clocks: {
      whiteRemainingMs: claimedSelf.timeControl.initialMs,
      blackRemainingMs: claimedSelf.timeControl.initialMs,
      activeColor: 'white',
      activeSince: new Date(),
    },
  });

  return {
    gameId: game._id.toString(),
    whiteUserId,
    blackUserId,
    whiteName,
    blackName,
    timeControl: claimedSelf.timeControl,
  };
}

/** Remove a player from queue if they disconnect */
export async function removeFromQueueSilent(userId: string): Promise<void> {
  await MatchmakingQueue.deleteOne({ userId });
}

/** Purge stale queue entries older than QUEUE_STALE_MS */
export async function purgeStaleEntries(): Promise<number> {
  const cutoff = new Date(Date.now() - QUEUE_STALE_MS);
  const result = await MatchmakingQueue.deleteMany({ joinedAt: { $lt: cutoff } });
  return result.deletedCount;
}
