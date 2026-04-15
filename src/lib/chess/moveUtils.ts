import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import type { ChessMove } from '../../types/chess';

export function getLegalMoves(game: Chess, square: string): string[] {
  const moves = game.moves({ square: square as Square, verbose: true });
  return moves.map((m) => m.to);
}

export function isPromotion(game: Chess, from: string, to: string): boolean {
  const moves = game.moves({ square: from as Square, verbose: true });
  return moves.some((m) => m.to === to && m.promotion);
}

export function makeMove(game: Chess, from: string, to: string, promotion?: string): ChessMove | null {
  try {
    const result = game.move({ from, to, promotion });
    if (!result) return null;
    return {
      from: result.from,
      to: result.to,
      promotion: result.promotion,
      san: result.san,
      color: result.color,
      piece: result.piece,
      captured: result.captured || undefined,
      flags: result.flags,
    };
  } catch {
    return null;
  }
}

export function getRandomMove(game: Chess): ChessMove | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;
  const move = moves[Math.floor(Math.random() * moves.length)];
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    san: move.san,
    color: move.color,
    piece: move.piece,
    captured: move.captured || undefined,
  };
}
