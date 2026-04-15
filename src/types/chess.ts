export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Square {
  file: string;
  rank: number;
}

export interface ChessMove {
  from: string;
  to: string;
  promotion?: string;
  san?: string;
  color?: PieceColor;
  piece?: PieceType;
  captured?: PieceType;
  flags?: string;
}

export interface BoardPosition {
  fen: string;
  turn: PieceColor;
  moveNumber: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
}

export interface CapturedPieces {
  w: PieceType[];
  b: PieceType[];
}
