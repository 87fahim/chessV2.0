import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

/** px of permanent drawer – shown on screens ≥ 1536px */
const PERMANENT_DRAWER_WIDTH = 260;
/** MUI lg breakpoint */
const LG_BREAKPOINT = 1200;
/** Permanent-drawer breakpoint */
const PERM_DRAWER_BREAKPOINT = 1536;

interface BoardLayoutProps {
  /** The board component (+ controls row, already includes ZoomControls) */
  board: React.ReactNode;
  /** Mode-specific side panel content (status, move list, clocks, etc.) */
  panel: React.ReactNode;
  /** Panel fixed width on large screens. Defaults to 400. */
  panelWidth?: number;
  /**
   * Explicit board column width in px when zoomed (from useBoardZoom).
   * null / undefined = let CSS control the width (default / unzoomed state).
   */
  boardWidth?: number | null;
  /** Ref to attach to the board column div – used by useBoardZoom to measure natural width. */
  boardColRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Unified responsive layout for all game modes.
 *
 * Wide screens (≥ 1200 px):  [ panel (left) | board (right) ]
 * Narrow / mobile:            [ board (top)  | panel (bottom) ]
 *
 * When boardWidth is provided (zoomed) and the board + panel no longer fit
 * side-by-side, the panel automatically drops below the board.
 */
const BoardLayout: React.FC<BoardLayoutProps> = ({
  board,
  panel,
  panelWidth = 400,
  boardWidth = null,
  boardColRef,
}) => {
  const [winW, setWinW] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isLargeScreen = winW >= LG_BREAKPOINT;
  const hasPermanentDrawer = winW >= PERM_DRAWER_BREAKPOINT;
  const contentW = winW - (hasPermanentDrawer ? PERMANENT_DRAWER_WIDTH : 0);

  // Drop to column layout if zoomed board + panel no longer fit side-by-side
  const forceColumn =
    isLargeScreen &&
    boardWidth !== null &&
    boardWidth + panelWidth + 48 > contentW; // 48px = layout gap + padding

  const useColumn = !isLargeScreen || forceColumn;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: useColumn ? 1.5 : 2,
        p: { xs: 1, lg: 2 },
        height: '100%',
        flexDirection: useColumn ? 'column' : 'row',
        alignItems: useColumn ? 'stretch' : 'flex-start',
        ...(useColumn
          ? {
              '@media (max-height: 760px)': {
                gap: 0.5,
                p: 0.5,
              },
            }
          : {}),
      }}
    >
      {/* ── Panel ── */}
      <Box
        sx={{
          order: useColumn ? 2 : 1,
          flex: useColumn ? '1 1 auto' : `0 1 ${panelWidth}px`,
          width: useColumn ? '100%' : panelWidth,
          minWidth: 0,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: useColumn ? 'auto' : 300,
        }}
      >
        {panel}
      </Box>

      {/* ── Board column ── */}
      <Box
        ref={boardColRef}
        sx={{
          order: useColumn ? 1 : 2,
          // When zoomed: fixed px width; otherwise let CSS flex/max-width control
          ...(boardWidth
            ? { flex: `0 0 ${boardWidth}px`, width: boardWidth, maxWidth: boardWidth }
            : {
                flex: '1 1 auto',
                width: '100%',
                maxWidth: isLargeScreen ? 'min(700px, calc(100vh - 180px))' : 'min(100%, 560px)',
                mx: useColumn ? 'auto' : 0,
              }),
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          boxSizing: 'border-box',
        }}
      >
        {board}
      </Box>
    </Box>
  );
};

export default BoardLayout;
