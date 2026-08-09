import { describe, expect, it } from 'vitest';
import {
  INITIAL_ONLINE,
  applyDisconnectForfeit,
  applyGameEnded,
  applyMoveAccepted,
  moveOutcomeFromSan,
  resolveYourColor,
  type OnlineGameState,
} from './onlineGameState';
import type { GameEndedPayload, MoveAcceptedPayload } from '../../shared/types/socket';

function activeGame(overrides: Partial<OnlineGameState> = {}): OnlineGameState {
  return {
    ...INITIAL_ONLINE,
    gameId: 'g1',
    status: 'active',
    yourColor: 'white',
    clocks: { whiteRemainingMs: 60000, blackRemainingMs: 60000, activeColor: 'white' },
    ...overrides,
  };
}

describe('resolveYourColor', () => {
  it('matches by user id', () => {
    expect(resolveYourColor('u1', { userId: 'u1' }, { userId: 'u2' }, null)).toBe('white');
    expect(resolveYourColor('u2', { userId: 'u1' }, { userId: 'u2' }, null)).toBe('black');
  });

  it('falls back when there is no match or no user', () => {
    expect(resolveYourColor(null, { userId: 'u1' }, { userId: 'u2' }, 'black')).toBe('black');
    expect(resolveYourColor('u3', { userId: 'u1' }, { userId: 'u2' }, 'white')).toBe('white');
  });
});

describe('applyMoveAccepted', () => {
  it('appends the move, updates fen and clears the abort warning', () => {
    const prev = activeGame({ abortWarning: { secondsLeft: 10, reason: 'disconnect' } });
    const payload = {
      gameId: 'g1',
      fen: 'after-move-fen',
      move: { from: 'e2', to: 'e4', san: 'e4', ply: 1 },
      clocks: { whiteRemainingMs: 59000, blackRemainingMs: 60000, activeColor: 'black' },
    } as MoveAcceptedPayload;

    const next = applyMoveAccepted(prev, payload);
    expect(next.fen).toBe('after-move-fen');
    expect(next.moves).toHaveLength(1);
    expect(next.abortWarning).toBeNull();
    expect(next.clocks?.activeColor).toBe('black');
  });
});

describe('applyGameEnded', () => {
  it('marks abandonment separately from normal completion', () => {
    const prev = activeGame();
    const abandoned = applyGameEnded(prev, { gameId: 'g1', result: '1-0', reason: 'abandonment' } as GameEndedPayload);
    expect(abandoned.status).toBe('abandoned');

    const finished = applyGameEnded(prev, { gameId: 'g1', result: '0-1', reason: 'checkmate' } as GameEndedPayload);
    expect(finished.status).toBe('completed');
    expect(finished.result).toBe('0-1');
    expect(finished.terminationReason).toBe('checkmate');
  });
});

describe('applyDisconnectForfeit', () => {
  it('awards the win to the connected player', () => {
    const prev = activeGame({ opponentOnline: false, yourColor: 'white' });
    const next = applyDisconnectForfeit(prev);
    expect(next.status).toBe('abandoned');
    expect(next.result).toBe('1-0');
    expect(next.terminationReason).toBe('abandonment');
  });

  it('does nothing when the game is not active or the opponent is online', () => {
    const online = activeGame({ opponentOnline: true });
    expect(applyDisconnectForfeit(online)).toBe(online);

    const finished = activeGame({ status: 'completed', opponentOnline: false });
    expect(applyDisconnectForfeit(finished)).toBe(finished);
  });
});

describe('moveOutcomeFromSan', () => {
  it('derives capture, check, checkmate, and promotion flags', () => {
    expect(moveOutcomeFromSan('exd5')).toMatchObject({ captured: true, isCheck: false });
    expect(moveOutcomeFromSan('Qh5+')).toMatchObject({ isCheck: true, isCheckmate: false });
    expect(moveOutcomeFromSan('Qxf7#')).toMatchObject({ captured: true, isCheck: true, isCheckmate: true });
    expect(moveOutcomeFromSan('e8=Q')).toMatchObject({ promotion: 'p' });
  });
});
