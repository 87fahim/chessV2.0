import { describe, expect, it } from 'vitest';
import {
  formatClockTime,
  getActiveColorFromFen,
  getCapturedCounts,
  getResultText,
  isPlayersTurn,
  resolveDefaultTimeControl,
  resolvePreferredColor,
  TIME_CONTROLS,
} from './onlinePlayUtils';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('resolveDefaultTimeControl', () => {
  it('matches a settings string like "5+0" to the right time control', () => {
    expect(resolveDefaultTimeControl('5+0')).toEqual({ initialMs: 300000, incrementMs: 0 });
    expect(resolveDefaultTimeControl('3+2')).toEqual({ initialMs: 180000, incrementMs: 2000 });
    expect(resolveDefaultTimeControl('15+10')).toEqual({ initialMs: 900000, incrementMs: 10000 });
  });

  it('falls back to 10 min for unknown or missing values', () => {
    expect(resolveDefaultTimeControl(undefined)).toEqual({ initialMs: 600000, incrementMs: 0 });
    expect(resolveDefaultTimeControl('99+99')).toEqual({ initialMs: 600000, incrementMs: 0 });
  });

  it('covers every listed time control', () => {
    for (const tc of TIME_CONTROLS) {
      const label = `${Math.round(tc.value.initialMs / 60000)}+${Math.round(tc.value.incrementMs / 1000)}`;
      expect(resolveDefaultTimeControl(label)).toEqual(tc.value);
    }
  });
});

describe('resolvePreferredColor', () => {
  it('accepts white and black', () => {
    expect(resolvePreferredColor('white')).toBe('white');
    expect(resolvePreferredColor('black')).toBe('black');
  });

  it('defaults everything else to random', () => {
    expect(resolvePreferredColor(undefined)).toBe('random');
    expect(resolvePreferredColor('blue')).toBe('random');
    expect(resolvePreferredColor('random')).toBe('random');
  });
});

describe('formatClockTime', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatClockTime(600000)).toBe('10:00');
    expect(formatClockTime(65000)).toBe('1:05');
    expect(formatClockTime(999)).toBe('0:00');
  });

  it('clamps negative values to zero', () => {
    expect(formatClockTime(-5000)).toBe('0:00');
  });
});

describe('getActiveColorFromFen', () => {
  it('reads the active color from the FEN', () => {
    expect(getActiveColorFromFen(STARTING_FEN)).toBe('w');
    expect(getActiveColorFromFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')).toBe('b');
  });
});

describe('isPlayersTurn', () => {
  it('is true when the FEN active color matches the player', () => {
    expect(isPlayersTurn(STARTING_FEN, 'white')).toBe(true);
    expect(isPlayersTurn(STARTING_FEN, 'black')).toBe(false);
  });

  it('is false without an assigned color', () => {
    expect(isPlayersTurn(STARTING_FEN, null)).toBe(false);
    expect(isPlayersTurn(STARTING_FEN, undefined)).toBe(false);
  });
});

describe('getCapturedCounts', () => {
  it('reports zero captures for the starting position', () => {
    expect(getCapturedCounts(STARTING_FEN)).toEqual({ capturedByWhite: 0, capturedByBlack: 0 });
  });

  it('counts missing pieces per side', () => {
    // Black queen and one black pawn missing; one white knight missing.
    const fen = 'rnb1kbnr/ppp1pppp/8/8/8/8/PPPPPPPP/RB1QKBNR w KQkq - 0 1';
    const counts = getCapturedCounts(fen);
    expect(counts.capturedByWhite).toBe(2);
    expect(counts.capturedByBlack).toBe(1);
  });

  it('handles kings-only endgames', () => {
    expect(getCapturedCounts('8/8/8/4k3/8/8/8/4K3 w - - 0 1')).toEqual({
      capturedByWhite: 15,
      capturedByBlack: 15,
    });
  });
});

describe('getResultText', () => {
  it('returns empty for an ongoing game', () => {
    expect(getResultText('*', 'white')).toBe('');
  });

  it('reports draws', () => {
    expect(getResultText('1/2-1/2', 'white')).toBe('Draw!');
  });

  it('reports win/lose from the player perspective', () => {
    expect(getResultText('1-0', 'white')).toBe('You Win!');
    expect(getResultText('1-0', 'black')).toBe('You Lose!');
    expect(getResultText('0-1', 'black')).toBe('You Win!');
    expect(getResultText('0-1', 'white')).toBe('You Lose!');
  });
});
