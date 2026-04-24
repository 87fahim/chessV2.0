/**
 * Single source of truth for all chess board visual constants.
 * Import this in Square, ChessBoard, ReplayBoard, and EditableBoard to keep
 * the board appearance identical across every game mode.
 */
export const BOARD_THEME = {
  // Base square colors
  light: '#ecd8b4',
  dark: '#ae7b4e',

  // Last-move highlight
  lastMoveLight: '#ced26b',
  lastMoveDark: '#a9a238',

  // King in check
  checkLight: '#f7a5a5',
  checkDark: '#e04040',

  // Selected square
  selectedLight: '#829ee0',
  selectedDark: '#5d7bc4',

  // Premove squares
  premoveLight: '#aab4d0',
  premoveDark: '#7b88a8',

  // Drag-over / legal-move drop target
  dragOverLight: '#b3d4a5',
  dragOverDark: '#6aad55',

  // Analysis / best-move highlight (EditableBoard)
  highlightLight: '#acd46b',
  highlightDark: '#87a843',

  // Coordinate labels
  labelOnLight: 'rgba(100,60,30,0.7)',
  labelOnDark: 'rgba(240,220,190,0.7)',

  // Board wrapper
  border: '2px solid #333',
  borderRadius: '4px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
} as const;
