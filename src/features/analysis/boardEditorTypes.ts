import type { PieceColor, PieceType } from '../../types/chess';

export type EngineSearchMode = 'depth' | 'time';

export interface PieceOnBoard {
  color: PieceColor;
  type: PieceType;
}

export type BoardPosition = Record<string, PieceOnBoard>;

export interface CastlingRights {
  K: boolean; // White kingside
  Q: boolean; // White queenside
  k: boolean; // Black kingside
  q: boolean; // Black queenside
}

export interface PositionSnapshot {
  position: BoardPosition;
  sideToMove: PieceColor;
  castling: CastlingRights;
  enPassant: string;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface ValidationError {
  message: string;
  severity: 'error' | 'warning';
}

export interface EngineResult {
  bestMove: string;
  bestMoveSan?: string;
  from: string;
  to: string;
  promotion?: string;
  evaluation?: string;
  pv?: string;
  depth: number;
}

// Must stay in sync with the server-side caps in
// server/src/services/stockfishService.ts (MAX_SEARCH_DEPTH / MAX_MOVE_TIME_MS).
export const MAX_SEARCH_DEPTH = 24;
export const MAX_MOVE_TIME_MS = 30000;

export interface AnalysisSettings {
  searchMode: EngineSearchMode;
  searchDepth: number;
  moveTimeMs: number;
  autoFixCastling: boolean;
  resetEnPassantOnEdit: boolean;
  highlightSuggestedMove: boolean;
  showPrincipalVariation: boolean;
}

export type DragSource =
  | { type: 'board'; square: string; piece: PieceOnBoard }
  | { type: 'spare'; piece: PieceOnBoard };
