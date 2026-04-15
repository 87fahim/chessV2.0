import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/socketAuth.js';
import { SocketEvents } from '../constants/socketEvents.js';
import { isUserOnline } from './index.js';

export function registerPresenceHandlers(_io: SocketIOServer, socket: AuthenticatedSocket): void {
  socket.on(SocketEvents.PRESENCE_PING, () => {
    // Acknowledge presence — client can use this to confirm connection
    socket.emit('presence:pong', { timestamp: Date.now() });
  });
}

export function checkPresence(userId: string): { online: boolean } {
  return { online: isUserOnline(userId) };
}
