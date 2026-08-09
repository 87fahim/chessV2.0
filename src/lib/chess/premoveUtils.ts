import type { Chess, Square as ChessSquare } from 'chess.js';
import type { PieceColor, PieceType } from '../../types/chess';
import { FILES } from './boardUtils';

export interface QueuedPremove {
  from: string;
  to: string;
  promotion?: string;
}

const RANK_CHARS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Own-piece map after applying queued premoves in order.
 * This enables chaining premoves with the same piece across future turns.
 */
export function computeVirtualOwnPieces(
  game: Chess,
  playerColor: PieceColor | undefined,
  premoveQueue: QueuedPremove[] | undefined,
): Map<string, PieceType> {
  const virtual = new Map<string, { color: PieceColor; type: PieceType }>();

  for (const file of FILES) {
    for (const rank of RANK_CHARS) {
      const square = `${file}${rank}`;
      const piece = game.get(square as ChessSquare);
      if (!piece) continue;
      virtual.set(square, {
        color: piece.color as PieceColor,
        type: piece.type as PieceType,
      });
    }
  }

  if (playerColor && premoveQueue && premoveQueue.length > 0) {
    for (const pm of premoveQueue) {
      const movingPiece = virtual.get(pm.from);
      if (!movingPiece || movingPiece.color !== playerColor) continue;

      virtual.delete(pm.from);
      const promoteRank = playerColor === 'w' ? '8' : '1';
      const promotedType =
        movingPiece.type === 'p' && pm.promotion && pm.to[1] === promoteRank
          ? (pm.promotion as PieceType)
          : movingPiece.type;

      virtual.set(pm.to, { color: movingPiece.color, type: promotedType });
    }
  }

  const own = new Map<string, PieceType>();
  for (const [square, piece] of virtual) {
    if (piece.color === playerColor) own.set(square, piece.type);
  }
  return own;
}

/** Locates the king of the given color, e.g. to highlight a check. */
export function findKingSquare(game: Chess, color: PieceColor): string | null {
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return `${FILES[c]}${8 - r}`;
      }
    }
  }
  return null;
}
