import type { PieceColor } from '../../types/chess';

export const TIME_CONTROLS = [
  { label: '1 min', value: { initialMs: 60000, incrementMs: 0 } },
  { label: '3 min', value: { initialMs: 180000, incrementMs: 0 } },
  { label: '5 min', value: { initialMs: 300000, incrementMs: 0 } },
  { label: '10 min', value: { initialMs: 600000, incrementMs: 0 } },
  { label: '3+2', value: { initialMs: 180000, incrementMs: 2000 } },
  { label: '5+3', value: { initialMs: 300000, incrementMs: 3000 } },
  { label: '15+10', value: { initialMs: 900000, incrementMs: 10000 } },
];

export type TimeControlValue = (typeof TIME_CONTROLS)[number]['value'];

export const LOW_TIME_MS = 30_000;
export const DISCONNECT_TIMEOUT_S = 60;

const DEFAULT_TIME_CONTROL_INDEX = 3; // 10 min

export function resolveDefaultTimeControl(defaultTimeControl?: string): TimeControlValue {
  const match = TIME_CONTROLS.find((timeControl) => {
    const baseMinutes = Math.round(timeControl.value.initialMs / 60000);
    const incrementSeconds = Math.round(timeControl.value.incrementMs / 1000);
    return `${baseMinutes}+${incrementSeconds}` === defaultTimeControl;
  });

  return match?.value ?? TIME_CONTROLS[DEFAULT_TIME_CONTROL_INDEX].value;
}

export function resolvePreferredColor(value?: string): 'random' | 'white' | 'black' {
  if (value === 'white' || value === 'black') {
    return value;
  }
  return 'random';
}

export function formatClockTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Reads the active color straight from the FEN (field 2) without parsing the whole position. */
export function getActiveColorFromFen(fen: string): PieceColor {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function isPlayersTurn(fen: string, yourColor?: 'white' | 'black' | null): boolean {
  if (!yourColor) return false;
  const active = getActiveColorFromFen(fen);
  return (yourColor === 'white' && active === 'w') || (yourColor === 'black' && active === 'b');
}

/** Each side starts with 15 non-king pieces; captured = 15 minus what remains on the board. */
const NON_KING_PIECES_PER_SIDE = 15;

export function getCapturedCounts(fen: string): { capturedByWhite: number; capturedByBlack: number } {
  const placement = fen.split(' ')[0];
  let whiteRemaining = 0;
  let blackRemaining = 0;

  for (const char of placement) {
    if (char === 'K' || char === 'k' || char === '/' || (char >= '1' && char <= '8')) continue;
    if (char >= 'A' && char <= 'Z') whiteRemaining += 1;
    else if (char >= 'a' && char <= 'z') blackRemaining += 1;
  }

  return {
    capturedByWhite: NON_KING_PIECES_PER_SIDE - blackRemaining,
    capturedByBlack: NON_KING_PIECES_PER_SIDE - whiteRemaining,
  };
}

export function getResultText(result: string, yourColor?: 'white' | 'black' | null): string {
  if (result === '*') return '';
  if (result === '1/2-1/2') return 'Draw!';
  const youWon =
    (yourColor === 'white' && result === '1-0') ||
    (yourColor === 'black' && result === '0-1');
  return youWon ? 'You Win!' : 'You Lose!';
}
