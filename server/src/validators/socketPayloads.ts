import { z } from 'zod';
import type { AuthenticatedSocket } from '../middleware/socketAuth.js';
import { SocketEvents } from '../constants/socketEvents.js';

const MAX_INITIAL_MS = 60 * 60 * 1000; // 60 minutes
const MAX_INCREMENT_MS = 60 * 1000; // 60 seconds

export const queueJoinSchema = z.object({
  preferredColor: z.enum(['white', 'black', 'random']).optional(),
  rated: z.boolean().optional(),
  timeControl: z.object({
    initialMs: z.number().int().positive().max(MAX_INITIAL_MS),
    incrementMs: z.number().int().min(0).max(MAX_INCREMENT_MS),
  }),
});

export const gameIdSchema = z.object({
  gameId: z.string().min(1).max(64),
});

export const gameMoveSchema = z.object({
  gameId: z.string().min(1).max(64),
  move: z.object({
    from: z.string().regex(/^[a-h][1-8]$/),
    to: z.string().regex(/^[a-h][1-8]$/),
    promotion: z.enum(['q', 'r', 'b', 'n']).optional(),
  }),
  clientMoveNumber: z.number().int().positive().max(1000).optional(),
});

export type QueueJoinPayload = z.infer<typeof queueJoinSchema>;
export type GameIdPayload = z.infer<typeof gameIdSchema>;
export type GameMovePayload = z.infer<typeof gameMoveSchema>;

/** Parse a socket payload and emit a validation error when it fails. */
export function parseSocketPayload<T>(
  socket: AuthenticatedSocket,
  schema: z.ZodType<T>,
  data: unknown,
): T | null {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    socket.emit(SocketEvents.ERROR, { message: 'Invalid socket payload' });
    return null;
  }
  return parsed.data;
}
