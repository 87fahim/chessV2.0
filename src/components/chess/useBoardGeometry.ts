import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Tracks the rendered square size of the board element and maps
 * page coordinates back to a square name (for drag & drop).
 */
export function useBoardGeometry(boardSquares: string[][]) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [squareSize, setSquareSize] = useState(0);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSquareSize(rect.width / 8);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const squareAtPoint = useCallback(
    (px: number, py: number): string | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const col = Math.floor((px - rect.left) / squareSize);
      const row = Math.floor((py - rect.top) / squareSize);
      if (col < 0 || col > 7 || row < 0 || row > 7) return null;
      return boardSquares[row]?.[col] ?? null;
    },
    [boardSquares, squareSize],
  );

  return { boardRef, squareSize, squareAtPoint };
}
