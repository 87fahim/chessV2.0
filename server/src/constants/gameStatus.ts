export const GameStatus = {
  PENDING: 'pending',
  WAITING_FOR_OPPONENT: 'waiting_for_opponent',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  CANCELLED: 'cancelled',
} as const;

export type GameStatusType = (typeof GameStatus)[keyof typeof GameStatus];
