import React from 'react';
import { Box } from '@mui/material';

interface BoardLayoutProps {
  /** The board component (+ any controls directly below/above it) */
  board: React.ReactNode;
  /** Mode-specific side panel content (status, move list, clocks, etc.) */
  panel: React.ReactNode;
  /** Panel fixed width on large screens. Defaults to 400. */
  panelWidth?: number;
}

/**
 * Unified responsive layout for all game modes.
 *
 * Wide screens (≥ 1200 px):  [ panel (left) | board (right) ]
 * Narrow / mobile:            [ board (top)  | panel (bottom) ]
 *
 * The board column is capped so it never overflows the viewport height,
 * and the panel gets a fixed width while the board takes remaining space.
 */
const BoardLayout: React.FC<BoardLayoutProps> = ({ board, panel, panelWidth = 400 }) => (
  <Box
    sx={{
      display: 'flex',
      gap: { xs: 1.5, lg: 2 },
      p: { xs: 1, lg: 2 },
      height: '100%',
      flexDirection: { xs: 'column', lg: 'row' },
      alignItems: { xs: 'stretch', lg: 'flex-start' },
    }}
  >
    {/* ── Panel ── LEFT on wide screens, BOTTOM on mobile ── */}
    <Box
      sx={{
        order: { xs: 2, lg: 1 },
        flex: { xs: '1 1 auto', lg: `0 1 ${panelWidth}px` },
        width: { xs: '100%', lg: panelWidth },
        minWidth: 0,
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: { xs: 'auto', lg: 300 },
      }}
    >
      {panel}
    </Box>

    {/* ── Board ── RIGHT on wide screens, TOP on mobile ── */}
    <Box
      sx={{
        order: { xs: 1, lg: 2 },
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        // Cap board height/width to viewport so it never overflows
        maxWidth: { lg: 'min(700px, calc(100vh - 180px))' },
        // On narrow screens add horizontal padding so the board isn't edge-to-edge
        '@media (max-width:1023.95px)': {
          px: '80px',
          boxSizing: 'border-box',
        },
      }}
    >
      {board}
    </Box>
  </Box>
);

export default BoardLayout;
