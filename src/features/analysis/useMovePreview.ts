import { useCallback, useEffect, useRef, useState } from 'react';
import type { PositionSnapshot } from './boardEditorTypes';
import { parseFenToPosition } from './fenBuilder';
import { MOVE_PREVIEW_DELAY_MS, type MovePreviewStatus } from './boardEditorDefaults';

export interface PreviewStep {
  fen: string;
  from: string;
  to: string;
}

/**
 * Plays a sequence of engine moves on the board with a delay between steps.
 * Owns the timer/run-id machinery so useBoardEditor only deals with intent
 * (start / pause / resume / cancel / restore).
 */
export function useMovePreview(
  applySnapshot: (snapshot: PositionSnapshot) => void,
  setHighlightSquares: (highlight: { from: string; to: string } | null) => void,
) {
  const [status, setStatusState] = useState<MovePreviewStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runIdRef = useRef(0);
  const statusRef = useRef<MovePreviewStatus>('idle');
  const startSnapshotRef = useRef<PositionSnapshot | null>(null);
  const stepsRef = useRef<PreviewStep[]>([]);
  const stepIndexRef = useRef(0);
  const playNextStepRef = useRef<(runId: number) => void>(() => undefined);

  const setStatus = useCallback((next: MovePreviewStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stepsRef.current = [];
    stepIndexRef.current = 0;
    startSnapshotRef.current = null;
    setStatus('idle');
  }, [setStatus]);

  useEffect(() => () => {
    runIdRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  playNextStepRef.current = (runId: number) => {
    if (runIdRef.current !== runId || statusRef.current !== 'playing') {
      return;
    }

    const step = stepsRef.current[stepIndexRef.current];
    if (!step) {
      setStatus('finished');
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      if (runIdRef.current !== runId || statusRef.current !== 'playing') {
        return;
      }

      const parsed = parseFenToPosition(step.fen);
      applySnapshot(parsed);
      setHighlightSquares({ from: step.from, to: step.to });
      stepIndexRef.current += 1;

      if (stepIndexRef.current >= stepsRef.current.length) {
        setStatus('finished');
      } else {
        playNextStepRef.current(runId);
      }
    }, MOVE_PREVIEW_DELAY_MS);
  };

  const start = useCallback(
    (steps: PreviewStep[], startSnapshot: PositionSnapshot, startPosition: PositionSnapshot) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      startSnapshotRef.current = startSnapshot;
      stepsRef.current = steps;
      stepIndexRef.current = 0;
      applySnapshot(startPosition);
      setHighlightSquares(null);
      setStatus('playing');
      playNextStepRef.current(runId);
    },
    [applySnapshot, setHighlightSquares, setStatus],
  );

  const pause = useCallback(() => {
    if (statusRef.current !== 'playing') return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus('paused');
  }, [setStatus]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    setStatus('playing');
    playNextStepRef.current(runIdRef.current);
  }, [setStatus]);

  /** Returns true when a preview was active and the starting position was restored. */
  const restore = useCallback(() => {
    const snapshot = startSnapshotRef.current;
    if (!snapshot) return false;

    runIdRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    applySnapshot(snapshot);
    stepsRef.current = [];
    stepIndexRef.current = 0;
    startSnapshotRef.current = null;
    setStatus('idle');
    return true;
  }, [applySnapshot, setStatus]);

  return { status, start, pause, resume, cancel, restore };
}
