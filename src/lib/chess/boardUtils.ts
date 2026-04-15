import type { PieceColor, PieceType } from '../../types/chess';

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function getSquareColor(file: number, rank: number): 'light' | 'dark' {
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
}

export function squareToCoords(square: string): { col: number; row: number } {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square[1], 10);
  return { col, row };
}

export function coordsToSquare(col: number, row: number): string {
  return `${FILES[col]}${8 - row}`;
}

export function getBoardSquares(flipped: boolean): string[][] {
  const board: string[][] = [];
  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
  const files = flipped ? [...FILES].reverse() : [...FILES];

  for (const rank of ranks) {
    const row: string[] = [];
    for (const file of files) {
      row.push(`${file}${rank}`);
    }
    board.push(row);
  }
  return board;
}

export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

/* SVG piece images – Vite resolves the imports at build time */
const pieceImages = import.meta.glob<{ default: string }>(
  '../../assets/pieces/*.svg',
  { eager: true },
);

/** Build a lookup: "wk" → resolved URL */
const pieceImageMap: Record<string, string> = {};
for (const [path, mod] of Object.entries(pieceImages)) {
  // path looks like "../../assets/pieces/wk.svg"
  const key = path.split('/').pop()!.replace('.svg', '');
  pieceImageMap[key] = mod.default;
}

export function getPieceImage(color: PieceColor, type: PieceType): string {
  return pieceImageMap[`${color}${type}`];
}

export function getPieceValue(type: PieceType): number {
  const values: Record<PieceType, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
  };
  return values[type];
}
