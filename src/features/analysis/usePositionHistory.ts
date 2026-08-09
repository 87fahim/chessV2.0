import { useCallback, useState } from 'react';
import type { PieceColor } from '../../types/chess';
import type { BoardPosition, CastlingRights, PositionSnapshot } from './boardEditorTypes';
import { parseFenToPosition } from './fenBuilder';
import { DEFAULT_CASTLING, takeSnapshot } from './boardEditorDefaults';

/**
 * Owns the editable position (pieces + FEN metadata) and its undo/redo history.
 * Analysis concerns live in useBoardEditor, which composes this hook.
 */
export function usePositionHistory(initialFen: string) {
  const startParsed = parseFenToPosition(initialFen);
  const [position, setPosition] = useState<BoardPosition>({ ...startParsed.position });
  const [sideToMove, setSideToMove] = useState<PieceColor>('w');
  const [castling, setCastling] = useState<CastlingRights>({ ...DEFAULT_CASTLING });
  const [enPassant, setEnPassant] = useState('-');
  const [halfMoveClock, setHalfMoveClock] = useState(0);
  const [fullMoveNumber, setFullMoveNumber] = useState(1);

  const [undoStack, setUndoStack] = useState<PositionSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<PositionSnapshot[]>([]);

  const snapshot = useCallback(
    () => takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    [position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber],
  );

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [
      ...prev,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setRedoStack([]);
  }, [position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber]);

  const applySnapshot = useCallback((snap: PositionSnapshot) => {
    setPosition(snap.position);
    setSideToMove(snap.sideToMove);
    setCastling(snap.castling);
    setEnPassant(snap.enPassant);
    setHalfMoveClock(snap.halfMoveClock);
    setFullMoveNumber(snap.fullMoveNumber);
  }, []);

  /** Returns true when a snapshot was restored (callers may clear analysis then). */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return false;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [
      ...r,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setUndoStack((u) => u.slice(0, -1));
    applySnapshot(prev);
    return true;
  }, [undoStack, position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber, applySnapshot]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return false;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [
      ...u,
      takeSnapshot({ position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber }),
    ]);
    setRedoStack((r) => r.slice(0, -1));
    applySnapshot(next);
    return true;
  }, [redoStack, position, sideToMove, castling, enPassant, halfMoveClock, fullMoveNumber, applySnapshot]);

  return {
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
    snapshot,
    pushUndo,
    applySnapshot,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  };
}
