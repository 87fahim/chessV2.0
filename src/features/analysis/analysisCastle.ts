import { Chess } from 'chess.js';
import type { PieceColor } from '../../types/chess';
import type { BoardPosition, CastlingRights } from './boardEditorTypes';
import { buildFen, parseFenToPosition } from './fenBuilder';

export function isCastleKingDestination(from: string, to: string): boolean {
  return (
    (from === 'e1' && (to === 'g1' || to === 'c1')) ||
    (from === 'e8' && (to === 'g8' || to === 'c8'))
  );
}

/**
 * If the king drag is a legal castle (rights, empty path, not in/through check),
 * return the resulting pieces and rights. Otherwise null so the editor can
 * treat it as a normal king placement.
 */
export function tryLegalCastle(
  position: BoardPosition,
  from: string,
  to: string,
  castling: CastlingRights,
  enPassant: string,
  halfMoveClock: number,
  fullMoveNumber: number,
): { position: BoardPosition; castling: CastlingRights; enPassant: string } | null {
  const king = position[from];
  if (!king || king.type !== 'k' || !isCastleKingDestination(from, to)) {
    return null;
  }

  const color: PieceColor = king.color;
  if ((color === 'w' && from !== 'e1') || (color === 'b' && from !== 'e8')) {
    return null;
  }

  try {
    const fen = buildFen(position, color, castling, enPassant, halfMoveClock, fullMoveNumber);
    const game = new Chess(fen);
    const move = game.move({ from, to });
    if (!move || (move.san !== 'O-O' && move.san !== 'O-O-O')) {
      return null;
    }

    const parsed = parseFenToPosition(game.fen());
    return {
      position: parsed.position,
      castling: parsed.castling,
      enPassant: parsed.enPassant,
    };
  } catch {
    return null;
  }
}

export function sideAtBottom(flipped: boolean): PieceColor {
  return flipped ? 'b' : 'w';
}
