import type { BoardPosition, CastlingRights } from './boardEditorTypes';
import type { PieceColor, PieceType } from '../../types/chess';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function pieceToFenChar(color: PieceColor, type: PieceType): string {
  const ch = type;
  return color === 'w' ? ch.toUpperCase() : ch.toLowerCase();
}

export function buildFen(
  position: BoardPosition,
  sideToMove: PieceColor,
  castling: CastlingRights,
  enPassant: string,
  halfMoveClock: number,
  fullMoveNumber: number,
): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const file of FILES) {
      const square = `${file}${rank}`;
      const piece = position[square];
      if (piece) {
        if (empty > 0) {
          row += empty;
          empty = 0;
        }
        row += pieceToFenChar(piece.color, piece.type);
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rows.push(row);
  }

  let castlingStr = '';
  if (castling.K) castlingStr += 'K';
  if (castling.Q) castlingStr += 'Q';
  if (castling.k) castlingStr += 'k';
  if (castling.q) castlingStr += 'q';
  if (!castlingStr) castlingStr = '-';

  return `${rows.join('/')} ${sideToMove} ${castlingStr} ${enPassant || '-'} ${halfMoveClock} ${fullMoveNumber}`;
}

export function parseFenToPosition(fen: string): {
  position: BoardPosition;
  sideToMove: PieceColor;
  castling: CastlingRights;
  enPassant: string;
  halfMoveClock: number;
  fullMoveNumber: number;
} {
  const parts = fen.trim().split(/\s+/);
  const boardPart = parts[0];
  const sideToMove = (parts[1] || 'w') as PieceColor;
  const castlingStr = parts[2] || '-';
  const enPassant = parts[3] || '-';
  const halfMoveClock = parseInt(parts[4], 10) || 0;
  const fullMoveNumber = parseInt(parts[5], 10) || 1;

  const position: BoardPosition = {};
  const rows = boardPart.split('/');

  for (let rankIdx = 0; rankIdx < rows.length && rankIdx < 8; rankIdx++) {
    const rank = 8 - rankIdx;
    let fileIdx = 0;
    for (const ch of rows[rankIdx]) {
      if (ch >= '1' && ch <= '8') {
        fileIdx += parseInt(ch, 10);
      } else {
        const color: PieceColor = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase() as PieceType;
        if (fileIdx < 8) {
          const square = `${FILES[fileIdx]}${rank}`;
          position[square] = { color, type };
        }
        fileIdx++;
      }
    }
  }

  const castling: CastlingRights = {
    K: castlingStr.includes('K'),
    Q: castlingStr.includes('Q'),
    k: castlingStr.includes('k'),
    q: castlingStr.includes('q'),
  };

  return { position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber };
}
