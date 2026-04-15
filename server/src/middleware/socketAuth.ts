import { Socket } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    logger.warn('Socket connection rejected: no token');
    next(new Error('Authentication token required'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.user = payload;
    next();
  } catch {
    logger.warn('Socket connection rejected: invalid token');
    next(new Error('Invalid or expired token'));
  }
}
