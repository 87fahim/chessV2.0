import { useState, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { PieceColor, PieceType } from '../../types/chess';
import type { Difficulty } from '../../types/game';
import type {
  AnalysisSettings,
  BoardPosition,
  CastlingRights,
  DragSource,
  PieceOnBoard,
} from './boardEditorTypes';
import { buildFen, parseFenToPosition } from './fenBuilder';
import { validatePosition, canAddPiece, canMovePiece, normalizeCastlingRights } from './positionValidation';
import { getStockfishService, parseUciMove } from './stockfishService';
import { useGameSounds } from '../../hooks/useGameSounds';
import {
  DEFAULT_ANALYSIS_SETTINGS,
  DEFAULT_CASTLING,
  DEFAULT_FEN,
  EMPTY_CASTLING,
  normalizeAnalysisError,
  validateSearchSettings,
  type StoredAnalysisResult,
} from './boardEditorDefaults';
import { usePositionHistory } from './usePositionHistory';
import { useMovePreview, type PreviewStep } from './useMovePreview';

export function useBoardEditor() {
  const { playMoveOutcome } = useGameSounds();
  const history = usePositionHistory(DEFAULT_FEN);
  const {
    position,
    setPosition,
    sideToMove,
    setSideToMove,
    castling,
    setCastling,
    enPassant,
    setEnPassant,
    halfMoveClock,
    setHalfMoveClock,
    fullMoveNumber,
    setFullMoveNumber,
    pushUndo,
    applySnapshot,
  } = history;

  const [isFlipped, setIsFlipped] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>(DEFAULT_ANALYSIS_SETTINGS);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<StoredAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [highlightSquares, setHighlightSquares] = useState<{ from: string; to: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const preview = useMovePreview(applySnapshot, setHighlightSquares);

  const fen = useMemo(
    () => buildFen(position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber),
    [position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber],
  );

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

  const clearAnalysis = useCallback(() => {
    preview.cancel();
    setAnalysisResult(null);
    setAnalysisError(null);
    setHighlightSquares(null);
  }, [preview]);

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
    [position, pushUndo, setPosition, setCastling, setEnPassant, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
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
    [position, pushUndo, setPosition, setCastling, setEnPassant, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
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
    [position, pushUndo, setPosition, setCastling, setEnPassant, clearAnalysis, getSyncedCastling, castling, analysisSettings.resetEnPassantOnEdit],
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
    if (history.undo()) {
      clearAnalysis();
    }
  }, [history, clearAnalysis]);

  const redo = useCallback(() => {
    if (history.redo()) {
      clearAnalysis();
    }
  }, [history, clearAnalysis]);

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
  }, [pushUndo, setPosition, setSideToMove, setCastling, setEnPassant, setHalfMoveClock, setFullMoveNumber, clearAnalysis]);

  const clearBoard = useCallback(() => {
    pushUndo();
    setPosition({});
    setCastling({ ...EMPTY_CASTLING });
    setEnPassant('-');
    setHalfMoveClock(0);
    setFullMoveNumber(1);
    clearAnalysis();
  }, [pushUndo, setPosition, setCastling, setEnPassant, setHalfMoveClock, setFullMoveNumber, clearAnalysis]);

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
  }, [position, pushUndo, setPosition, setCastling, setEnPassant, clearAnalysis]);

  const flipBoard = useCallback(() => {
    setIsFlipped((f) => !f);
  }, []);

  // --- Metadata updates ---

  const updateSideToMove = useCallback((side: PieceColor) => {
    pushUndo();
    setSideToMove(side);
    clearAnalysis();
  }, [pushUndo, setSideToMove, clearAnalysis]);

  const updateCastling = useCallback((key: keyof CastlingRights, value: boolean) => {
    const nextCastling = getSyncedCastling(position, { ...castling, [key]: value });
    pushUndo();
    setCastling(nextCastling);
    clearAnalysis();
  }, [pushUndo, setCastling, clearAnalysis, getSyncedCastling, position, castling]);

  const updateEnPassant = useCallback((value: string) => {
    pushUndo();
    setEnPassant(value || '-');
    clearAnalysis();
  }, [pushUndo, setEnPassant, clearAnalysis]);

  const updateHalfMoveClock = useCallback((value: number) => {
    pushUndo();
    setHalfMoveClock(Math.max(0, value));
    clearAnalysis();
  }, [pushUndo, setHalfMoveClock, clearAnalysis]);

  const updateFullMoveNumber = useCallback((value: number) => {
    pushUndo();
    setFullMoveNumber(Math.max(1, value));
    clearAnalysis();
  }, [pushUndo, setFullMoveNumber, clearAnalysis]);

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
  }, [pushUndo, setPosition, setSideToMove, setCastling, setEnPassant, setHalfMoveClock, setFullMoveNumber, clearAnalysis, getSyncedCastling]);

  // --- Analysis settings ---

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
  }, [position, setCastling, clearAnalysis]);

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
  }, [position, pushUndo, setCastling, clearAnalysis]);

  // --- Engine analysis ---

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const findBestMove = useCallback(async () => {
    if (!canAnalyze || isAnalyzing) return;

    const settingsError = validateSearchSettings(analysisSettings);
    if (settingsError) {
      setAnalysisError(settingsError);
      return;
    }

    // Create a new abort controller for this analysis
    const controller = new AbortController();
    abortControllerRef.current = controller;

    preview.cancel();
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);
    setHighlightSquares(null);

    try {
      const service = getStockfishService();
      const result = await service.analyze(fen, {
        difficulty,
        searchMode: analysisSettings.searchMode,
        searchDepth: analysisSettings.searchDepth,
        moveTimeMs: analysisSettings.moveTimeMs,
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

        setAnalysisResult({ ...result, san, analyzedFen: fen });
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
  }, [canAnalyze, isAnalyzing, fen, difficulty, analysisSettings, preview]);

  const applyBestMove = useCallback(() => {
    if (!analysisResult?.bestMove) return;

    preview.cancel();

    try {
      // Use chess.js for correct handling of castling, en passant, etc.
      const game = new Chess(analysisResult.analyzedFen ?? fen);
      const { from, to, promotion } = parseUciMove(analysisResult.bestMove);
      const move = game.move({ from, to, promotion });
      if (!move) return;

      playMoveOutcome({
        san: move.san,
        captured: !!move.captured,
        promotion: move.promotion,
        isCheck: game.isCheck(),
        isCheckmate: game.isCheckmate(),
      });

      const parsed = parseFenToPosition(game.fen());
      pushUndo();
      applySnapshot(parsed);
    } catch {
      // Fallback: manually move the piece
      const { from, to, promotion } = parseUciMove(analysisResult.bestMove);
      const sourcePosition = parseFenToPosition(analysisResult.analyzedFen ?? fen).position;
      const piece = sourcePosition[from];
      if (!piece) return;
      pushUndo();
      setPosition(() => {
        const next = { ...sourcePosition };
        delete next[from];
        next[to] = promotion ? { color: piece.color, type: promotion as PieceType } : piece;
        return next;
      });
      setSideToMove((prev) => (prev === 'w' ? 'b' : 'w'));
    }
    clearAnalysis();
  }, [analysisResult, fen, pushUndo, applySnapshot, setPosition, setSideToMove, clearAnalysis, playMoveOutcome, preview]);

  const showSuggestedMoves = useCallback(() => {
    if (!analysisResult?.bestMove || preview.status === 'playing') return;

    const uciMoves = (analysisResult.pv?.trim().split(/\s+/).filter(Boolean) ?? []);
    const movesToPreview = uciMoves[0] === analysisResult.bestMove
      ? uciMoves
      : [analysisResult.bestMove, ...uciMoves];
    const startingFen = analysisResult.analyzedFen ?? fen;
    const game = new Chess(startingFen);
    const previewSteps: PreviewStep[] = [];

    for (const uci of movesToPreview) {
      try {
        const { from, to, promotion } = parseUciMove(uci);
        const move = game.move({ from, to, promotion });
        if (!move) break;
        previewSteps.push({ fen: game.fen(), from: move.from, to: move.to });
      } catch {
        break;
      }
    }

    if (previewSteps.length === 0) return;

    const startPosition = parseFenToPosition(startingFen);
    const startSnapshot = history.snapshot();
    pushUndo();
    preview.start(previewSteps, startSnapshot, startPosition);
  }, [analysisResult, fen, history, pushUndo, preview]);

  const restoreSuggestedMoves = useCallback(() => {
    if (!preview.restore()) return;

    if (analysisResult?.bestMove) {
      const { from, to } = parseUciMove(analysisResult.bestMove);
      setHighlightSquares(analysisSettings.highlightSuggestedMove ? { from, to } : null);
    } else {
      setHighlightSquares(null);
    }
  }, [analysisResult, analysisSettings.highlightSuggestedMove, preview]);

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
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    isAnalyzing,
    movePreviewStatus: preview.status,
    isShowingMoves: preview.status === 'playing',
    analysisResult,
    analysisError,
    highlightSquares,
    findBestMove,
    cancelAnalysis,
    applyBestMove,
    showSuggestedMoves,
    pauseSuggestedMoves: preview.pause,
    resumeSuggestedMoves: preview.resume,
    restoreSuggestedMoves,
  };
}
