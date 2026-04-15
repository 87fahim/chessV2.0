import { Chess } from 'chess.js';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function fenToTurn(fen: string): 'w' | 'b' {
  const parts = fen.split(' ');
  return (parts[1] as 'w' | 'b') || 'w';
}

export function fenToMoveNumber(fen: string): number {
  const parts = fen.split(' ');
  return parseInt(parts[5], 10) || 1;
}
