import { useState, useEffect, useRef, useCallback } from 'react';

/** px added/removed per zoom click */
const ZOOM_STEP = 60;
/** Minimum board size in px */
const MIN_BOARD_SIZE = 240;
/** Viewport chrome to reserve vertically (mobile app bar + padding) */
const TOP_CHROME_HEIGHT = 60;

export interface UseBoardZoomReturn {
  /** Attach this ref to the board column wrapper element in BoardLayout */
  boardColRef: React.RefObject<HTMLDivElement>;
  /** Explicit board column width in px when zoomed; null = let CSS control */
  boardWidth: number | null;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** Current zoom as a percentage of the natural (unzoomed) board width */
  zoomPercent: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
}

export function useBoardZoom(): UseBoardZoomReturn {
  const [zoomSteps, setZoomSteps] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [winW, setWinW] = useState(window.innerWidth);
  const [winH, setWinH] = useState(window.innerHeight);

  const boardColRef = useRef<HTMLDivElement>(null);
  const naturalWidthRef = useRef<number | null>(null);
  const zoomStepsRef = useRef(0);
  zoomStepsRef.current = zoomSteps;

  // Track window size; clamp zoom when viewport shrinks
  useEffect(() => {
    const onResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;
      setWinW(newW);
      setWinH(newH);
      const nw = naturalWidthRef.current;
      if (nw !== null) {
        const newMax = Math.min(newW - 60, newH - TOP_CHROME_HEIGHT);
        setZoomSteps((prev) => {
          const maxSteps = Math.floor((newMax - nw) / ZOOM_STEP);
          return prev > maxSteps ? Math.max(0, maxSteps) : prev;
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Measure natural width when the board column first renders (and whenever it
  // changes while unzoomed — e.g. sidebar toggled, orientation change).
  useEffect(() => {
    const el = boardColRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      // Only snapshot while at 0 zoom so we don't record a zoomed size
      if (zoomStepsRef.current !== 0) return;
      const w = el.offsetWidth;
      if (w > 50) {
        naturalWidthRef.current = w;
        setNaturalWidth(w);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
    // Re-attach observer if naturalWidth resets (e.g. layout remount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxBoardSize = Math.min(winW - 60, winH - TOP_CHROME_HEIGHT);

  const boardWidth =
    naturalWidth !== null && zoomSteps !== 0
      ? Math.max(MIN_BOARD_SIZE, Math.min(maxBoardSize, naturalWidth + zoomSteps * ZOOM_STEP))
      : null;

  const effectiveWidth = boardWidth ?? naturalWidth ?? 0;

  const canZoomIn =
    naturalWidth !== null &&
    naturalWidth + (zoomSteps + 1) * ZOOM_STEP <= maxBoardSize;

  const canZoomOut =
    naturalWidth !== null &&
    naturalWidth + (zoomSteps - 1) * ZOOM_STEP >= MIN_BOARD_SIZE;

  const zoomPercent =
    naturalWidth && naturalWidth > 0 && effectiveWidth > 0
      ? Math.round((effectiveWidth / naturalWidth) * 100)
      : 100;

  /** Lazily snapshot natural width on first click if ResizeObserver hasn't fired yet */
  const ensureNaturalWidth = useCallback(() => {
    if (naturalWidth === null) {
      const el = boardColRef.current;
      if (el) {
        const w = el.offsetWidth;
        if (w > 50) {
          naturalWidthRef.current = w;
          setNaturalWidth(w);
        }
      }
    }
  }, [naturalWidth]);

  const handleZoomIn = useCallback(() => {
    ensureNaturalWidth();
    setZoomSteps((s) => s + 1);
  }, [ensureNaturalWidth]);

  const handleZoomOut = useCallback(() => {
    ensureNaturalWidth();
    setZoomSteps((s) => s - 1);
  }, [ensureNaturalWidth]);

  return {
    boardColRef,
    boardWidth,
    canZoomIn,
    canZoomOut,
    zoomPercent,
    handleZoomIn,
    handleZoomOut,
  };
}
