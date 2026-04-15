import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth.js';
import { SocketEvents } from '../constants/socketEvents.js';
import * as matchmakingService from '../services/matchmakingService.js';
import { logger } from '../utils/logger.js';

export function registerMatchmakingHandlers(io: SocketIOServer, socket: AuthenticatedSocket): void {
  const userId = socket.user!.userId;
  const username = socket.user!.username;

  // Join queue
  socket.on(
    SocketEvents.QUEUE_JOIN,
    async (data: {
      preferredColor?: string;
      rated?: boolean;
      timeControl: { initialMs: number; incrementMs: number };
    }) => {
      try {
        await matchmakingService.joinQueue({
          userId,
          username,
          preferredColor: data.preferredColor,
          rated: data.rated,
          timeControl: data.timeControl,
        });

        socket.emit(SocketEvents.QUEUE_JOINED, { message: 'Joined queue' });

        // Try to find a match immediately
        const match = await matchmakingService.findMatch(userId);
        if (match) {
          // Notify both players
          const whiteSocketIds = getSocketIdsForUser(io, match.whiteUserId);
          const blackSocketIds = getSocketIdsForUser(io, match.blackUserId);

          const matchPayload = {
            gameId: match.gameId,
            whiteUserId: match.whiteUserId,
            blackUserId: match.blackUserId,
            whiteName: match.whiteName,
            blackName: match.blackName,
            timeControl: match.timeControl,
          };

          for (const sid of whiteSocketIds) {
            io.to(sid).emit(SocketEvents.MATCH_FOUND, { ...matchPayload, yourColor: 'white' });
          }
          for (const sid of blackSocketIds) {
            io.to(sid).emit(SocketEvents.MATCH_FOUND, { ...matchPayload, yourColor: 'black' });
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to join queue';
        socket.emit(SocketEvents.ERROR, { message });
        logger.error('Queue join error', error);
      }
    }
  );

  // Leave queue
  socket.on(SocketEvents.QUEUE_LEAVE, async () => {
    try {
      await matchmakingService.leaveQueue(userId);
      socket.emit(SocketEvents.QUEUE_LEFT, { message: 'Left queue' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to leave queue';
      socket.emit(SocketEvents.ERROR, { message });
    }
  });
}

function getSocketIdsForUser(io: SocketIOServer, userId: string): string[] {
  const ids: string[] = [];
  for (const [socketId, socket] of io.sockets.sockets) {
    const authSocket = socket as AuthenticatedSocket;
    if (authSocket.user?.userId === userId) {
      ids.push(socketId);
    }
  }
  return ids;
}
