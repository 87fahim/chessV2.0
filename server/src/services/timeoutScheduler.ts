import { Server as SocketIOServer } from 'socket.io';
import { Game } from '../models/Game.js';
import { GameStatus } from '../constants/gameStatus.js';
import { GameMode } from '../constants/gameMode.js';
import { SocketEvents } from '../constants/socketEvents.js';
import { calculateRemainingTime } from './clockService.js';
import { logger } from '../utils/logger.js';

/** How often the scheduler ticks (ms) */
const TICK_INTERVAL_MS = 1000;

/** How long a player may stay disconnected before abandonment (ms) */
export const DISCONNECT_FORFEIT_MS = 60_000; // 60 seconds

/** How long a player may idle (no move) before losing (ms) */
const MOVE_INACTIVITY_MS = 60_000; // 60 seconds

/** Warn the connected player at these intervals before abandonment */
const WARN_AT_SECONDS = [30, 15, 5];

// In-memory tracking of disconnected players per game
// gameId → { userId, disconnectedAt }
const disconnected = new Map<string, { userId: string; disconnectedAt: number }>();

let tickInterval: ReturnType<typeof setInterval> | null = null;
let ioRef: SocketIOServer | null = null;

export function startTimeoutScheduler(io: SocketIOServer): void {
  ioRef = io;
  if (tickInterval) return;
  tickInterval = setInterval(tick, TICK_INTERVAL_MS);
  logger.info('Timeout scheduler started');
}

export function stopTimeoutScheduler(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  disconnected.clear();
  ioRef = null;
}

/**
 * Mark a player as disconnected from a game.
 * Starts the abandonment countdown.
 */
export function markDisconnected(gameId: string, userId: string): void {
  disconnected.set(`${gameId}:${userId}`, { userId, disconnectedAt: Date.now() });
}

/**
 * Clear the disconnected record (player reconnected or game ended).
 */
export function markReconnected(gameId: string, userId: string): void {
  disconnected.delete(`${gameId}:${userId}`);
}

/**
 * Clear all disconnect records for a game (game ended).
 */
export function clearGameDisconnects(gameId: string): void {
  for (const key of disconnected.keys()) {
    if (key.startsWith(`${gameId}:`)) {
      disconnected.delete(key);
    }
  }
}

async function tick(): Promise<void> {
  if (!ioRef) return;

  try {
    // Find all active online games with clocks
    const activeGames = await Game.find({
      mode: GameMode.ONLINE,
      status: GameStatus.ACTIVE,
      'clocks.activeSince': { $exists: true, $ne: null },
    }).lean();

    const now = Date.now();

    for (const game of activeGames) {
      const gameId = game._id.toString();
      const roomId = `game:${gameId}`;

      // 1. Check clock timeout
      const clocks = calculateRemainingTime(game as any);
      if (clocks) {
        if (clocks.whiteRemainingMs <= 0 || clocks.blackRemainingMs <= 0) {
          const loser: 'white' | 'black' = clocks.whiteRemainingMs <= 0 ? 'white' : 'black';
          const result = loser === 'white' ? '0-1' : '1-0';

          await Game.findByIdAndUpdate(gameId, {
            status: GameStatus.COMPLETED,
            result,
            terminationReason: 'timeout',
            completedAt: new Date(),
            'clocks.whiteRemainingMs': Math.max(0, clocks.whiteRemainingMs),
            'clocks.blackRemainingMs': Math.max(0, clocks.blackRemainingMs),
          });

          ioRef.to(roomId).emit(SocketEvents.GAME_ENDED, {
            gameId,
            result,
            reason: 'timeout',
          });

          clearGameDisconnects(gameId);
          logger.info(`Game ${gameId} ended by timeout (${loser} lost)`);
          continue;
        }
      }

      // 2. Check per-move inactivity (1 minute without making a move)
      if (game.clocks?.activeSince) {
        const elapsed = now - new Date(game.clocks.activeSince).getTime();
        if (elapsed >= MOVE_INACTIVITY_MS) {
          const loser = game.clocks.activeColor as 'white' | 'black';
          const result = loser === 'white' ? '0-1' : '1-0';

          await Game.findByIdAndUpdate(gameId, {
            status: GameStatus.COMPLETED,
            result,
            terminationReason: 'timeout',
            completedAt: new Date(),
          });

          ioRef.to(roomId).emit(SocketEvents.GAME_ENDED, {
            gameId,
            result,
            reason: 'inactivity',
          });

          clearGameDisconnects(gameId);
          logger.info(`Game ${gameId} ended by inactivity (${loser} didn't move in 60s)`);
          continue;
        }

        // Send inactivity warnings at specific intervals
        const secondsLeft = Math.max(0, Math.ceil((MOVE_INACTIVITY_MS - elapsed) / 1000));
        if (WARN_AT_SECONDS.includes(secondsLeft)) {
          ioRef.to(roomId).emit(SocketEvents.GAME_ABORT_WARNING, {
            gameId,
            secondsLeft,
            reason: 'inactivity',
          });
        }
      }

      // 3. Check disconnect abandonment
      for (const [key, info] of disconnected.entries()) {
        if (!key.startsWith(`${gameId}:`)) continue;

        const elapsed = now - info.disconnectedAt;
        const secondsLeft = Math.max(0, Math.ceil((DISCONNECT_FORFEIT_MS - elapsed) / 1000));

        if (elapsed >= DISCONNECT_FORFEIT_MS) {
          // Forfeit the disconnected player
          const isWhite = game.whitePlayer?.userId?.toString() === info.userId;
          const result = isWhite ? '0-1' : '1-0';

          await Game.findByIdAndUpdate(gameId, {
            status: GameStatus.ABANDONED,
            result,
            terminationReason: 'abandonment',
            completedAt: new Date(),
          });

          ioRef.to(roomId).emit(SocketEvents.GAME_ENDED, {
            gameId,
            result,
            reason: 'abandonment',
          });

          clearGameDisconnects(gameId);
          logger.info(`Game ${gameId} ended by abandonment (user ${info.userId})`);
          break;
        }

        // Send warning at specific intervals
        if (WARN_AT_SECONDS.includes(secondsLeft)) {
          ioRef.to(roomId).emit(SocketEvents.GAME_ABORT_WARNING, {
            gameId,
            secondsLeft,
            reason: 'disconnect',
          });
        }
      }
    }
  } catch (err) {
    logger.error('Timeout scheduler tick error', err);
  }
}
