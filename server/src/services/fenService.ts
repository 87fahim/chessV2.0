import { Chess } from 'chess.js';

export function validateFen(fen: string): { valid: boolean; error?: string } {
  try {
    new Chess(fen);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Invalid FEN' };
  }
}

export function fenToTurn(fen: string): 'white' | 'black' {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? 'white' : 'black';
}

export function generatePgn(moves: Array<{ san: string; ply: number }>): string {
  let pgn = '';
  for (const move of moves) {
    if (move.ply % 2 === 1) {
      pgn += `${Math.ceil(move.ply / 2)}. `;
    }
    pgn += `${move.san} `;
  }
  return pgn.trim();
}
