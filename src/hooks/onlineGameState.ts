import type {
  GameEndedPayload,
  GameStatePayload,
  MoveAcceptedPayload,
} from '../../shared/types/socket';

export interface OnlineGameState {
  gameId: string | null;
  fen: string;
  moves: Array<{ from: string; to: string; san: string; ply: number }>;
  yourColor: 'white' | 'black' | null;
  status: string;
  result: string;
  terminationReason: string | null;
  clocks: { whiteRemainingMs: number; blackRemainingMs: number; activeColor: string } | null;
  whitePlayer: { type: string; name: string; userId?: string } | null;
  blackPlayer: { type: string; name: string; userId?: string } | null;
  opponentOnline: boolean;
  abortWarning: { secondsLeft: number; reason: string } | null;
}

export const INITIAL_ONLINE: OnlineGameState = {
  gameId: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  yourColor: null,
  status: 'idle',
  result: '*',
  terminationReason: null,
  clocks: null,
  whitePlayer: null,
  blackPlayer: null,
  opponentOnline: true,
  abortWarning: null,
};

export function resolveYourColor(
  currentUserId: string | null,
  whitePlayer: { userId?: string } | null | undefined,
  blackPlayer: { userId?: string } | null | undefined,
  fallback: 'white' | 'black' | null,
): 'white' | 'black' | null {
  if (!currentUserId) return fallback;
  if (whitePlayer?.userId === currentUserId) return 'white';
  if (blackPlayer?.userId === currentUserId) return 'black';
  return fallback;
}

/** State after a full server sync (GAME_STATE). */
export function applyGameStatePayload(
  prev: OnlineGameState,
  data: GameStatePayload,
  currentUserId: string | null,
): OnlineGameState {
  return {
    ...prev,
    gameId: data.gameId,
    fen: data.fen,
    moves: data.moves.map((m) => ({ from: m.from, to: m.to, san: m.san, ply: m.ply })),
    yourColor: resolveYourColor(currentUserId, data.whitePlayer, data.blackPlayer, prev.yourColor),
    status: data.status,
    result: data.result,
    clocks: data.clocks,
    whitePlayer: data.whitePlayer,
    blackPlayer: data.blackPlayer,
  };
}

/** State after the server accepted a move. */
export function applyMoveAccepted(prev: OnlineGameState, data: MoveAcceptedPayload): OnlineGameState {
  return {
    ...prev,
    fen: data.fen,
    moves: [...prev.moves, data.move],
    clocks: data.clocks ?? prev.clocks,
    abortWarning: null,
  };
}

/** State after the server declared the game over. */
export function applyGameEnded(prev: OnlineGameState, data: GameEndedPayload): OnlineGameState {
  return {
    ...prev,
    status: data.reason === 'abandonment' ? 'abandoned' : 'completed',
    result: data.result,
    terminationReason: data.reason,
    abortWarning: null,
    opponentOnline: true,
  };
}

/**
 * Client-side fallback when the opponent stays disconnected past the
 * forfeit window and the server hasn't ended the game yet.
 */
export function applyDisconnectForfeit(prev: OnlineGameState): OnlineGameState {
  if (prev.status !== 'active' || prev.opponentOnline) {
    return prev;
  }

  const result = prev.yourColor === 'white'
    ? '1-0'
    : prev.yourColor === 'black'
      ? '0-1'
      : prev.result;

  return {
    ...prev,
    status: 'abandoned',
    result,
    terminationReason: 'abandonment',
    abortWarning: null,
  };
}

/** Sound cue flags derived from a SAN move string. */
export function moveOutcomeFromSan(san: string) {
  return {
    san,
    captured: san.includes('x'),
    promotion: san.includes('=') ? 'p' : undefined,
    isCheck: san.includes('+') || san.includes('#'),
    isCheckmate: san.includes('#'),
  };
}
