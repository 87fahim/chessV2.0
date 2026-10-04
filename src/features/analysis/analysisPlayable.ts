import { Chess } from 'chess.js';

function flipSideToMove(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 2) return fen;
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  return parts.join(' ');
}

function sideName(turn: 'w' | 'b'): string {
  return turn === 'w' ? 'White' : 'Black';
}

/**
 * Whether the current side can actually make a legal chess move.
 * chess.js accepts some illegal FENs (opponent already in check/mate),
 * so those have to be checked explicitly.
 */
export function playablePositionError(fen: string): string | null {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return 'This position is not a legal chess position';
  }

  const side = sideName(game.turn());
  const opponent = sideName(game.turn() === 'w' ? 'b' : 'w');

  try {
    const opponentToMove = new Chess(flipSideToMove(fen));
    if (opponentToMove.inCheck()) {
      if (opponentToMove.isCheckmate()) {
        return `${opponent} is already checkmated, so ${side} cannot move`;
      }
      return `${opponent} is in check, so ${side} cannot move`;
    }
  } catch {
    return 'This position is not a legal chess position';
  }

  if (game.isCheckmate()) {
    return `${side} is checkmated and has no legal move`;
  }

  if (game.moves().length === 0) {
    return `${side} has no legal move`;
  }

  return null;
}
