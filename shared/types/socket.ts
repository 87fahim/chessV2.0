import type { ClockState, MoveRecord, PlayerInfo } from './game.js';

// Client → Server payloads
export interface QueueJoinPayload {
  preferredColor?: 'white' | 'black' | 'random';
  rated?: boolean;
  timeControl: { initialMs: number; incrementMs: number };
}

export interface GameJoinPayload {
  gameId: string;
}

export interface GameMovePayload {
  gameId: string;
  move: {
    from: string;
    to: string;
    promotion?: string;
  };
  clientMoveNumber?: number;
}

export interface GameResignPayload {
  gameId: string;
}

export interface DrawPayload {
  gameId: string;
}

export interface SyncRequestPayload {
  gameId: string;
}

// Server → Client payloads
export interface MatchFoundPayload {
  gameId: string;
  whiteUserId: string;
  blackUserId: string;
  yourColor: 'white' | 'black';
  whiteName: string;
  blackName: string;
  timeControl: { initialMs: number; incrementMs: number };
}

export interface GameStatePayload {
  gameId: string;
  fen: string;
  moves: MoveRecord[];
  status: string;
  result: string;
  clocks: ClockState | null;
  whitePlayer: PlayerInfo;
  blackPlayer: PlayerInfo;
  drawOfferedBy?: string | null;
}

export interface MoveAcceptedPayload {
  gameId: string;
  move: {
    from: string;
    to: string;
    san: string;
    ply: number;
  };
  fen: string;
  clocks: ClockState | null;
}

export interface MoveRejectedPayload {
  gameId: string;
  reason: string;
}

export interface GameEndedPayload {
  gameId: string;
  result: string;
  reason: string;
}

export interface ClockUpdatePayload {
  gameId: string;
  clocks: ClockState;
}

export interface OpponentPresencePayload {
  gameId: string;
  userId: string;
  online: boolean;
}

export interface AbortWarningPayload {
  gameId: string;
  secondsLeft: number;
  reason: 'disconnect' | 'inactivity';
}

export interface GameResumablePayload {
  gameId: string;
}
