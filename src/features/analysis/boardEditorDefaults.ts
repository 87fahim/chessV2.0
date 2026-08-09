import type { PieceColor } from '../../types/chess';
import type {
  AnalysisSettings,
  BoardPosition,
  CastlingRights,
  PositionSnapshot,
} from './boardEditorTypes';
import { MAX_MOVE_TIME_MS, MAX_SEARCH_DEPTH } from './boardEditorTypes';
import type { AnalysisResult } from './stockfishService';

export const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const DEFAULT_CASTLING: CastlingRights = { K: true, Q: true, k: true, q: true };
export const EMPTY_CASTLING: CastlingRights = { K: false, Q: false, k: false, q: false };
export const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  searchMode: 'depth',
  searchDepth: 15,
  moveTimeMs: 1200,
  autoFixCastling: false,
  resetEnPassantOnEdit: true,
  highlightSuggestedMove: true,
  showPrincipalVariation: true,
};
export const MOVE_PREVIEW_DELAY_MS = 650;

export type StoredAnalysisResult = AnalysisResult & {
  san?: string;
  analyzedFen?: string;
};

export type MovePreviewStatus = 'idle' | 'playing' | 'paused' | 'finished';

export function takeSnapshot(state: {
  position: BoardPosition;
  sideToMove: PieceColor;
  castling: CastlingRights;
  enPassant: string;
  halfMoveClock: number;
  fullMoveNumber: number;
}): PositionSnapshot {
  return {
    position: { ...state.position },
    sideToMove: state.sideToMove,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    halfMoveClock: state.halfMoveClock,
    fullMoveNumber: state.fullMoveNumber,
  };
}

export function normalizeAnalysisError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Engine error';

  if (
    message.includes('Failed to fetch') ||
    message.includes('Backend engine is unavailable') ||
    message.includes('Backend engine endpoint failed')
  ) {
    return 'Analysis engine is unavailable. Start the backend server and ensure Stockfish is configured correctly.';
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'Analysis timed out. Try a lower depth or shorter time.';
  }

  if (message.includes('Timed out')) {
    return 'Analysis timed out. Try a lower depth or shorter time.';
  }

  return message;
}

/** Returns an error message when the search settings are out of range, or null when valid. */
export function validateSearchSettings(settings: AnalysisSettings): string | null {
  const { searchMode, searchDepth, moveTimeMs } = settings;
  if (searchMode === 'depth') {
    if (!searchDepth || searchDepth < 1 || searchDepth > MAX_SEARCH_DEPTH || !Number.isInteger(searchDepth)) {
      return `Depth must be a whole number between 1 and ${MAX_SEARCH_DEPTH}.`;
    }
    return null;
  }
  if (!moveTimeMs || moveTimeMs < 100 || moveTimeMs > MAX_MOVE_TIME_MS) {
    return `Time must be between 0.1 and ${MAX_MOVE_TIME_MS / 1000} seconds.`;
  }
  return null;
}
