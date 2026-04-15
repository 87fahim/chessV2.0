import { Server as SocketIOServer } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from '../middleware/socketAuth.js';
import { registerGameHandlers } from './gameSocket.js';
import { registerMatchmakingHandlers } from './matchmakingSocket.js';
import { registerPresenceHandlers } from './presenceSocket.js';
import { startTimeoutScheduler, stopTimeoutScheduler } from '../services/timeoutScheduler.js';
import { removeFromQueueSilent, purgeStaleEntries } from '../services/matchmakingService.js';
import * as gameService from '../services/gameService.js';
import { SocketEvents } from '../constants/socketEvents.js';
import { logger } from '../utils/logger.js';

// Track connected users: userId -> Set<socketId>
export const connectedUsers = new Map<string, Set<string>>();

/** Interval for periodic stale-queue cleanup */
let staleQueueInterval: ReturnType<typeof setInterval> | null = null;
const STALE_QUEUE_CHECK_MS = 60_000; // every 60s

export function initializeSocketIO(io: SocketIOServer): void {
  // Apply auth middleware
  io.use(socketAuthMiddleware);

  // Start the timeout scheduler (clock + disconnect timers)
  startTimeoutScheduler(io);

  // Periodically purge stale matchmaking queue entries
  staleQueueInterval = setInterval(async () => {
    try {
      const count = await purgeStaleEntries();
      if (count > 0) logger.info(`Purged ${count} stale queue entries`);
    } catch (err) {
      logger.error('Stale queue purge error', err);
    }
  }, STALE_QUEUE_CHECK_MS);

  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.user?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Track connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Register all event handlers
    registerGameHandlers(io, socket);
    registerMatchmakingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    // Auto-rejoin: check if user has an active online game and tell client (FR-30, FR-31)
    try {
      const activeGame = await gameService.findActiveOnlineGame(userId);
      if (activeGame && activeGame.status === 'active') {
        socket.emit(SocketEvents.GAME_RESUMABLE, {
          gameId: activeGame._id.toString(),
        });
      }
    } catch (err) {
      logger.error('Active game lookup on connect error', err);
    }

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${userId})`);

      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          // If user fully disconnected, remove from matchmaking queue silently
          try {
            await removeFromQueueSilent(userId);
          } catch {
            // ignore - not in queue
          }
        }
      }
    });
  });
}

export function shutdownSocketIO(): void {
  stopTimeoutScheduler();
  if (staleQueueInterval) {
    clearInterval(staleQueueInterval);
    staleQueueInterval = null;
  }
}

export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}
