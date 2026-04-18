import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { PieceColor, PieceType } from '../../types/chess';
import type { Difficulty } from '../../types/game';
import type {
  AnalysisSettings,
  BoardPosition,
  CastlingRights,
  PieceOnBoard,
  PositionSnapshot,
  DragSource,
} from './boardEditorTypes';
import { buildFen, parseFenToPosition } from './fenBuilder';
import { validatePosition, canAddPiece, canMovePiece, normalizeCastlingRights } from './positionValidation';
import { getStockfishService, parseUciMove } from './stockfishService';
import type { AnalysisResult } from './stockfishService';

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const DEFAULT_CASTLING: CastlingRights = { K: true, Q: true, k: true, q: true };
const EMPTY_CASTLING: CastlingRights = { K: false, Q: false, k: false, q: false };
const DEFAULT_ANALYSIS_SETTINGS: AnalysisSettings = {
  searchMode: 'depth',
  searchDepth: 15,
  moveTimeMs: 1200,
  autoFixCastling: false,
  resetEnPassantOnEdit: true,
  highlightSuggestedMove: true,
  showPrincipalVariation: true,
};

function takeSnapshot(state: {
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

export function useBoardEditor() {
  const startParsed = parseFenToPosition(DEFAULT_FEN);
  const [position, setPosition] = useState<BoardPosition>({ ...startParsed.position });
  const [sideToMove, setSideToMove] = useState<PieceColor>('w');
  const [castling, setCastling] = useState<CastlingRights>({ ...DEFAULT_CASTLING });
  const [enPassant, setEnPassant] = useState('-');
  const [halfMoveClock, setHalfMoveClock] = useState(0);
  const [fullMoveNumber, setFullMoveNumber] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS);

  const [undoStack, setUndoStack] = useState<PositionSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<PositionSnapshot[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<(AnalysisResult & { san?: string }) | null>(() => {
    try {
      const saved = sessionStorage.getItem('analysis_result');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<{ from: string; to: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fen = useMemo(
    () => buildFen(position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber),
    [position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber],
  );

  // Persist analysis result & FEN to sessionStorage
  useEffect(() => {
    if (analysisResult) {
      sessionStorage.setItem('analysis_result', JSON.stringify(analysisResult));
      sessionStorage.setItem('analysis_fen', fen);
    } else {
      sessionStorage.removeItem('analysis_result');
      sessionStorage.removeItem('analysis_fen');
    }
  }, [analysisResult, fen]);

  // Restore FEN and highlight on mount
  useEffect(() => {
    const savedFen = sessionStorage.getItem('analysis_fen');
    if (savedFen && savedFen !== DEFAULT_FEN) {
      const parsed = parseFenToPosition(savedFen);
      if (parsed) {
        setPosition({ ...parsed.position });
        setSideToMove(parsed.sideToMove);
        setCastling({ ...parsed.castling });
        setEnPassant(parsed.enPassant);
        setHalfMoveClock(parsed.halfMoveClock);
        setFullMoveNumber(parsed.fullMoveNumber);
      }
    }
    // Restore highlight from persisted result
    const saved = sessionStorage.getItem('analysis_result');
    if (saved) {
      try {
        const result = JSON.parse(saved);
        if (result?.bestMove) {
          const { from, to } = parseUciMove(result.bestMove);
          setHighlightSquares({ from, to });
        }
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fenValidationError = useMemo(() => {
    try {
      new Chess(fen);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid FEN state';
    }
  }, [fen]);

  const validationErrors = useMemo(() => {
    const errors = validatePosition(position, castling, enPassant);
    if (fenValidationError) {
      errors.unshift({ message: fenValidationError, severity: 'error' });
    }
    return errors;
  }, [position, castling, enPassant, fenValidationError]);

  const canAnalyze = useMemo(
    () => !validationErrors.some((error) => error.severity === 'error'),
    [validationErrors],
  );

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setRedoStack([]);
  }, [position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber]);

  const clearAnalysis = useCallback(() => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setHighlightSquares(null);
  }, []);

  const normalizeAnalysisError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Engine error';

    if (
      message.includes('Failed to fetch') ||
      message.includes('Backend local engine is unavailable') ||
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
  }, []);

  const getSyncedCastling = useCallback(
    (nextPosition: BoardPosition, nextCastling: CastlingRights) => (
      analysisSettings.autoFixCastling
        ? normalizeCastlingRights(nextPosition, nextCastling)
        : nextCastling
    ),
    [analysisSettings.autoFixCastling],
  );

  // --- Board mutations ---

  const movePiece = useCallback(
    (from: string, to: string) => {
      const check = canMovePiece(position, from, to);
      if (!check.allowed) return check.reason;

      const nextPosition = { ...position };
      const piece = nextPosition[from];
      delete nextPosition[from];
      nextPosition[to] = piece;

      pushUndo();
      setPosition(nextPosition);
      setCastling(getSyncedCastling(nextPosition, castling));
      if (analysisSettings.resetEnPassantOnEdit) {
        setEnPassant('-');
      }
      clearAnalysis();
      return undefined;
    },
    [position, pushUndo, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
  );

  const addPiece = useCallback(
    (square: string, piece: PieceOnBoard) => {
      const existing = position[square];
      if (existing && existing.color === piece.color) return undefined;

      const validation = canAddPiece(position, square, piece);
      if (!validation.allowed) return validation.reason;

      const nextPosition = { ...position, [square]: { ...piece } };

      pushUndo();
      setPosition(nextPosition);
      setCastling(getSyncedCastling(nextPosition, castling));
      if (analysisSettings.resetEnPassantOnEdit) {
        setEnPassant('-');
      }
      clearAnalysis();
      return undefined;
    },
    [position, pushUndo, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
  );

  const removePiece = useCallback(
    (square: string) => {
      if (!position[square]) return;
      const nextPosition = { ...position };
      delete nextPosition[square];

      pushUndo();
      setPosition(nextPosition);
      setCastling(getSyncedCastling(nextPosition, castling));
      if (analysisSettings.resetEnPassantOnEdit) {
        setEnPassant('-');
      }
      clearAnalysis();
    },
    [position, pushUndo, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
  );

  const handleDrop = useCallback(
    (source: DragSource, targetSquare: string | null) => {
      if (!targetSquare) {
        if (source.type === 'board') {
          removePiece(source.square);
        }
        return;
      }

      if (source.type === 'board') {
        movePiece(source.square, targetSquare);
      } else {
        addPiece(targetSquare, source.piece);
      }
    },
    [movePiece, addPiece, removePiece],
  );

  // --- Undo / Redo ---

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [
      ...r,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setUndoStack((u) => u.slice(0, -1));
    setPosition(prev.position);
    setSideToMove(prev.sideToMove);
    setCastling(prev.castling);
    setEnPassant(prev.enPassant);
    setHalfMoveClock(prev.halfMoveClock);
    setFullMoveNumber(prev.fullMoveNumber);
    clearAnalysis();
  }, [undoStack, position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber, clearAnalysis]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [
      ...u,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setRedoStack((r) => r.slice(0, -1));
    setPosition(next.position);
    setSideToMove(next.sideToMove);
    setCastling(next.castling);
    setEnPassant(next.enPassant);
    setHalfMoveClock(next.halfMoveClock);
    setFullMoveNumber(next.fullMoveNumber);
    clearAnalysis();
  }, [redoStack, position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber, clearAnalysis]);

  // --- Board presets ---

  const resetToStart = useCallback(() => {
    pushUndo();
    const parsed = parseFenToPosition(DEFAULT_FEN);
    setPosition(parsed.position);
    setSideToMove('w');
    setCastling({ ...DEFAULT_CASTLING });
    setEnPassant('-');
    setHalfMoveClock(0);
    setFullMoveNumber(1);
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const clearBoard = useCallback(() => {
    pushUndo();
    setPosition({});
    setCastling({ ...EMPTY_CASTLING });
    setEnPassant('-');
    setHalfMoveClock(0);
    setFullMoveNumber(1);
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const keepKingsOnly = useCallback(() => {
    pushUndo();
    const next: BoardPosition = {};
    for (const [square, piece] of Object.entries(position)) {
      if (piece.type === 'k') next[square] = piece;
    }
    setPosition(next);
    setCastling({ ...EMPTY_CASTLING });
    setEnPassant('-');
    clearAnalysis();
  }, [position, pushUndo, clearAnalysis]);

  const flipBoard = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  // --- Metadata updates ---

  const updateSideToMove = useCallback((side: PieceColor) => {
    pushUndo();
    setSideToMove(side);
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const updateCastling = useCallback((key: keyof CastlingRights, value: boolean) => {
    const nextCastling = getSyncedCastling(position, { ...castling, [key]: value });
    pushUndo();
    setCastling(nextCastling);
    clearAnalysis();
  }, [pushUndo, clearAnalysis, getSyncedCastling, position, castling]);

  const updateEnPassant = useCallback((value: string) => {
    pushUndo();
    setEnPassant(value || '-');
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const updateHalfMoveClock = useCallback((value: number) => {
    pushUndo();
    setHalfMoveClock(Math.max(0, value));
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const updateFullMoveNumber = useCallback((value: number) => {
    pushUndo();
    setFullMoveNumber(Math.max(1, value));
    clearAnalysis();
  }, [pushUndo, clearAnalysis]);

  const loadFen = useCallback((fenStr: string) => {
    try {
      new Chess(fenStr);
      const parsed = parseFenToPosition(fenStr);
      pushUndo();
      setPosition(parsed.position);
      setSideToMove(parsed.sideToMove);
      setCastling(getSyncedCastling(parsed.position, parsed.castling));
      setEnPassant(parsed.enPassant);
      setHalfMoveClock(parsed.halfMoveClock);
      setFullMoveNumber(parsed.fullMoveNumber);
      clearAnalysis();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid FEN string';
    }
  }, [pushUndo, clearAnalysis, getSyncedCastling]);

  const updateSearchMode = useCallback((mode: AnalysisSettings['searchMode']) => {
    setAnalysisSettings((prev) => ({ ...prev, searchMode: mode }));
  }, []);

  const updateSearchDepth = useCallback((value: string) => {
    // Allow empty string so user can clear and retype
    const num = value === '' ? NaN : Number(value);
    if (value === '' || !isNaN(num)) {
      setAnalysisSettings((prev) => ({ ...prev, searchDepth: isNaN(num) ? 0 : num }));
    }
  }, []);

  const updateMoveTimeMs = useCallback((value: string) => {
    const num = value === '' ? NaN : Number(value);
    if (value === '' || !isNaN(num)) {
      setAnalysisSettings((prev) => ({ ...prev, moveTimeMs: isNaN(num) ? 0 : Math.round(num * 1000) }));
    }
  }, []);

  const setAutoFixCastling = useCallback((value: boolean) => {
    setAnalysisSettings((prev) => ({ ...prev, autoFixCastling: value }));
    if (value) {
      setCastling((prev) => normalizeCastlingRights(position, prev));
    }
    clearAnalysis();
  }, [position, clearAnalysis]);

  const setResetEnPassantOnEdit = useCallback((value: boolean) => {
    setAnalysisSettings((prev) => ({ ...prev, resetEnPassantOnEdit: value }));
  }, []);

  const setHighlightSuggestedMove = useCallback((value: boolean) => {
    setAnalysisSettings((prev) => ({ ...prev, highlightSuggestedMove: value }));
    if (!value) {
      setHighlightSquares(null);
    }
  }, []);

  const setShowPrincipalVariation = useCallback((value: boolean) => {
    setAnalysisSettings((prev) => ({ ...prev, showPrincipalVariation: value }));
  }, []);

  const fixCastlingRightsNow = useCallback(() => {
    pushUndo();
    setCastling((prev) => normalizeCastlingRights(position, prev));
    clearAnalysis();
  }, [position, pushUndo, clearAnalysis]);

  // --- Engine analysis ---

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const findBestMove = useCallback(async () => {
    if (!canAnalyze || isAnalyzing) return;

    // Validate search parameters
    const { searchMode, searchDepth, moveTimeMs } = analysisSettings;
    if (searchMode === 'depth') {
      if (!searchDepth || searchDepth < 1 || searchDepth > 60 || !Number.isInteger(searchDepth)) {
        setAnalysisError('Depth must be a whole number between 1 and 60.');
        return;
      }
    } else {
      if (!moveTimeMs || moveTimeMs < 100 || moveTimeMs > 120000) {
        setAnalysisError('Time must be between 0.1 and 120 seconds.');
        return;
      }
    }

    // Create a new abort controller for this analysis
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setHighlightSquares(null);

    try {
      const service = getStockfishService();
      const result = await service.analyze(fen, {
        difficulty,
        searchMode,
        searchDepth,
        moveTimeMs,
      }, controller.signal);

      if (!result.bestMove || result.bestMove === '(none)') {
        setAnalysisResult(null);
        setAnalysisError('No legal moves available');
      } else {
        let san: string | undefined;
        try {
          const game = new Chess(fen);
          const { from, to, promotion } = parseUciMove(result.bestMove);
          const move = game.move({ from, to, promotion });
          san = move?.san;
        } catch { /* ignore - SAN conversion failed for non-standard position */ }

        setAnalysisResult({ ...result, san });
        const { from, to } = parseUciMove(result.bestMove);
        setHighlightSquares(analysisSettings.highlightSuggestedMove ? { from, to } : null);
      }
    } catch (err) {
      // Don't show error if user cancelled
      if (controller.signal.aborted) {
        setAnalysisError(null);
      } else {
        setAnalysisError(normalizeAnalysisError(err));
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, [canAnalyze, isAnalyzing, fen, difficulty, analysisSettings, normalizeAnalysisError]);

  const applyBestMove = useCallback(() => {
    if (!analysisResult?.bestMove) return;

    try {
      // Use chess.js for correct handling of castling, en passant, etc.
      const game = new Chess(fen);
      const { from, to, promotion } = parseUciMove(analysisResult.bestMove);
      game.move({ from, to, promotion });
      const parsed = parseFenToPosition(game.fen());
      pushUndo();
      setPosition(parsed.position);
      setSideToMove(parsed.sideToMove);
      setCastling(parsed.castling);
      setEnPassant(parsed.enPassant);
      setHalfMoveClock(parsed.halfMoveClock);
      setFullMoveNumber(parsed.fullMoveNumber);
    } catch {
      // Fallback: manually move the piece
      const { from, to, promotion } = parseUciMove(analysisResult.bestMove);
      const piece = position[from];
      if (!piece) return;
      pushUndo();
      setPosition((prev) => {
        const next = { ...prev };
        delete next[from];
        next[to] = promotion ? { color: piece.color, type: promotion as PieceType } : piece;
        return next;
      });
      setSideToMove((prev) => (prev === 'w' ? 'b' : 'w'));
    }
    clearAnalysis();
  }, [analysisResult, fen, position, pushUndo, clearAnalysis]);

  return {
    position,
    sideToMove,
    castling,
    enPassant,
    halfMoveClock,
    fullMoveNumber,
    fen,
    isFlipped,
    difficulty,
    analysisSettings,

    validationErrors,
    canAnalyze,

    handleDrop,
    movePiece,
    addPiece,
    removePiece,

    resetToStart,
    clearBoard,
    keepKingsOnly,
    flipBoard,

    updateSideToMove,
    updateCastling,
    updateEnPassant,
    updateHalfMoveClock,
    updateFullMoveNumber,
    setDifficulty,
    loadFen,
    updateSearchMode,
    updateSearchDepth,
    updateMoveTimeMs,
    setAutoFixCastling,
    setResetEnPassantOnEdit,
    setHighlightSuggestedMove,
    setShowPrincipalVariation,
    fixCastlingRightsNow,

    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    isAnalyzing,
    analysisResult,
    analysisError,
    highlightSquares,
    findBestMove,
    cancelAnalysis,
    applyBestMove,
  };
}
