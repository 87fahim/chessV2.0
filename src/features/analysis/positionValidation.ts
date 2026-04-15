import type { BoardPosition, CastlingRights, ValidationError } from './boardEditorTypes';
import type { PieceColor, PieceType } from '../../types/chess';

interface PieceCounts {
  k: number;
  q: number;
  r: number;
  b: number;
  n: number;
  p: number;
  total: number;
}

function countPieces(position: BoardPosition, color: PieceColor): PieceCounts {
  const counts: PieceCounts = { k: 0, q: 0, r: 0, b: 0, n: 0, p: 0, total: 0 };
  for (const piece of Object.values(position)) {
    if (piece.color === color) {
      counts[piece.type]++;
      counts.total++;
    }
  }
  return counts;
}

function findKing(position: BoardPosition, color: PieceColor): string | null {
  for (const [square, piece] of Object.entries(position)) {
    if (piece.color === color && piece.type === 'k') return square;
  }
  return null;
}

function areSquaresAdjacent(sq1: string, sq2: string): boolean {
  const f1 = sq1.charCodeAt(0) - 97;
  const r1 = parseInt(sq1[1], 10);
  const f2 = sq2.charCodeAt(0) - 97;
  const r2 = parseInt(sq2[1], 10);
  return Math.abs(f1 - f2) <= 1 && Math.abs(r1 - r2) <= 1;
}

function areKingsAdjacent(position: BoardPosition): boolean {
  const wKing = findKing(position, 'w');
  const bKing = findKing(position, 'b');
  if (!wKing || !bKing) return false;
  return areSquaresAdjacent(wKing, bKing);
}

export function normalizeCastlingRights(
  position: BoardPosition,
  castling: CastlingRights,
): CastlingRights {
  const normalized = { ...castling };

  if (normalized.K) {
    const wk = position['e1'];
    const wr = position['h1'];
    normalized.K = !!wk && wk.color === 'w' && wk.type === 'k' && !!wr && wr.color === 'w' && wr.type === 'r';
  }
  if (normalized.Q) {
    const wk = position['e1'];
    const wr = position['a1'];
    normalized.Q = !!wk && wk.color === 'w' && wk.type === 'k' && !!wr && wr.color === 'w' && wr.type === 'r';
  }
  if (normalized.k) {
    const bk = position['e8'];
    const br = position['h8'];
    normalized.k = !!bk && bk.color === 'b' && bk.type === 'k' && !!br && br.color === 'b' && br.type === 'r';
  }
  if (normalized.q) {
    const bk = position['e8'];
    const br = position['a8'];
    normalized.q = !!bk && bk.color === 'b' && bk.type === 'k' && !!br && br.color === 'b' && br.type === 'r';
  }

  return normalized;
}

export function isValidEnPassantSquare(value: string): boolean {
  return value === '-' || /^[a-h][36]$/i.test(value);
}

export function validateCastlingRights(
  position: BoardPosition,
  castling: CastlingRights,
): ValidationError[] {
  const warnings: ValidationError[] = [];

  if (castling.K) {
    const wk = position['e1'];
    const wr = position['h1'];
    if (!wk || wk.color !== 'w' || wk.type !== 'k' || !wr || wr.color !== 'w' || wr.type !== 'r') {
      warnings.push({ message: 'White O-O: king not on e1 or rook not on h1', severity: 'warning' });
    }
  }
  if (castling.Q) {
    const wk = position['e1'];
    const wr = position['a1'];
    if (!wk || wk.color !== 'w' || wk.type !== 'k' || !wr || wr.color !== 'w' || wr.type !== 'r') {
      warnings.push({ message: 'White O-O-O: king not on e1 or rook not on a1', severity: 'warning' });
    }
  }
  if (castling.k) {
    const bk = position['e8'];
    const br = position['h8'];
    if (!bk || bk.color !== 'b' || bk.type !== 'k' || !br || br.color !== 'b' || br.type !== 'r') {
      warnings.push({ message: 'Black O-O: king not on e8 or rook not on h8', severity: 'warning' });
    }
  }
  if (castling.q) {
    const bk = position['e8'];
    const br = position['a8'];
    if (!bk || bk.color !== 'b' || bk.type !== 'k' || !br || br.color !== 'b' || br.type !== 'r') {
      warnings.push({ message: 'Black O-O-O: king not on e8 or rook not on a8', severity: 'warning' });
    }
  }

  return warnings;
}

export function validatePosition(
  position: BoardPosition,
  castling: CastlingRights,
  enPassant?: string,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const whiteCounts = countPieces(position, 'w');
  const blackCounts = countPieces(position, 'b');

  if (whiteCounts.k === 0) errors.push({ message: 'White must have exactly one king', severity: 'error' });
  if (whiteCounts.k > 1) errors.push({ message: 'White cannot have more than one king', severity: 'error' });
  if (blackCounts.k === 0) errors.push({ message: 'Black must have exactly one king', severity: 'error' });
  if (blackCounts.k > 1) errors.push({ message: 'Black cannot have more than one king', severity: 'error' });

  if (whiteCounts.p > 8) errors.push({ message: 'White cannot have more than 8 pawns', severity: 'error' });
  if (blackCounts.p > 8) errors.push({ message: 'Black cannot have more than 8 pawns', severity: 'error' });

  if (whiteCounts.total > 16) errors.push({ message: 'White cannot have more than 16 pieces', severity: 'error' });
  if (blackCounts.total > 16) errors.push({ message: 'Black cannot have more than 16 pieces', severity: 'error' });

  // Pawns on rank 1 or 8
  for (const [square, piece] of Object.entries(position)) {
    if (piece.type === 'p') {
      const rank = parseInt(square[1], 10);
      if (rank === 1 || rank === 8) {
        errors.push({
          message: `${piece.color === 'w' ? 'White' : 'Black'} pawn on ${square} is invalid (rank ${rank})`,
          severity: 'error',
        });
      }
    }
  }

  // King adjacency
  if (whiteCounts.k === 1 && blackCounts.k === 1 && areKingsAdjacent(position)) {
    errors.push({ message: 'Kings cannot be on adjacent squares', severity: 'error' });
  }

  if (enPassant && !isValidEnPassantSquare(enPassant)) {
    errors.push({ message: 'En passant target must be - or a square on rank 3 or 6', severity: 'error' });
  }

  // Castling warnings
  errors.push(...validateCastlingRights(position, castling));

  return errors;
}

export function isAnalyzable(position: BoardPosition, castling: CastlingRights): boolean {
  const errors = validatePosition(position, castling);
  return !errors.some((e) => e.severity === 'error');
}

export function canAddPiece(
  position: BoardPosition,
  square: string,
  piece: { color: PieceColor; type: PieceType },
): { allowed: boolean; reason?: string } {
  const counts = countPieces(position, piece.color);
  const colorName = piece.color === 'w' ? 'White' : 'Black';
  const existing = position[square];

  // Same-color piece already there → no-op (handled by caller)
  if (existing && existing.color === piece.color) {
    return { allowed: false };
  }

  // King limit
  if (piece.type === 'k' && counts.k >= 1) {
    return { allowed: false, reason: `${colorName} already has a king` };
  }

  // Pawn limit
  if (piece.type === 'p' && counts.p >= 8) {
    return { allowed: false, reason: `${colorName} already has 8 pawns` };
  }

  // Total limit (replacing an opposite-color piece doesn't increase count)
  if (counts.total >= 16 && (!existing || existing.color === piece.color)) {
    return { allowed: false, reason: `${colorName} already has 16 pieces` };
  }

  // Pawn rank restriction
  if (piece.type === 'p') {
    const rank = parseInt(square[1], 10);
    if (rank === 1 || rank === 8) {
      return { allowed: false, reason: 'Pawns cannot be placed on rank 1 or 8' };
    }
  }

  // King adjacency check
  if (piece.type === 'k') {
    const otherColor = piece.color === 'w' ? 'b' : 'w';
    const otherKing = findKing(position, otherColor);
    if (otherKing && areSquaresAdjacent(square, otherKing)) {
      return { allowed: false, reason: 'Kings cannot be on adjacent squares' };
    }
  }

  return { allowed: true };
}

export function canMovePiece(
  position: BoardPosition,
  from: string,
  to: string,
): { allowed: boolean; reason?: string } {
  if (from === to) return { allowed: false };

  const piece = position[from];
  if (!piece) return { allowed: false };

  const target = position[to];
  // Same-color target → no-op
  if (target && target.color === piece.color) return { allowed: false };

  // Pawn rank restriction
  if (piece.type === 'p') {
    const rank = parseInt(to[1], 10);
    if (rank === 1 || rank === 8) {
      return { allowed: false, reason: 'Pawns cannot be placed on rank 1 or 8' };
    }
  }

  // King adjacency after move
  if (piece.type === 'k') {
    const otherColor = piece.color === 'w' ? 'b' : 'w';
    for (const [sq, p] of Object.entries(position)) {
      if (sq !== from && p.color === otherColor && p.type === 'k') {
        if (areSquaresAdjacent(to, sq)) {
          return { allowed: false, reason: 'Kings cannot be on adjacent squares' };
        }
      }
    }
  }

  return { allowed: true };
}
