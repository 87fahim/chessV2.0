import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';

export interface Premove {
  from: string;
  to: string;
  promotion?: string;
}

export function usePremoveQueue() {
  const [queue, setQueue] = useState<Premove[]>([]);

  const addPremove = useCallback((premove: Premove) => {
    setQueue((prev) => [...prev, premove]);
  }, []);

  const clearPremoves = useCallback(() => {
    setQueue([]);
  }, []);

  /** Set of all squares involved in any queued premove (for highlighting). */
  const premoveSquares = useMemo(() => {
    const squares = new Set<string>();
    for (const pm of queue) {
      squares.add(pm.from);
      squares.add(pm.to);
    }
    return squares;
  }, [queue]);

  /**
   * Validate and dequeue the first premove against the given FEN.
   * - If valid: removes it from the queue and returns it.
   * - If invalid: clears the entire queue and returns null.
   * - If queue is empty: returns null (no clear).
   */
  const processNextPremove = useCallback(
    (fen: string): Premove | null => {
      if (queue.length === 0) return null;

      const premove = queue[0];
      const game = new Chess(fen);

      try {
        const result = game.move({
          from: premove.from,
          to: premove.to,
          promotion: (premove.promotion as 'q' | 'r' | 'b' | 'n') || undefined,
        });

        if (result) {
          setQueue((prev) => prev.slice(1));
          return premove;
        }
      } catch {
        // Move is no longer legal
      }

      // First premove invalid → clear entire queue
      setQueue([]);
      return null;
    },
    [queue],
  );

  return {
    queue,
    premoveSquares,
    addPremove,
    clearPremoves,
    processNextPremove,
  };
}
