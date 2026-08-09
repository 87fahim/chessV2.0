import React from 'react';
import { Box } from '@mui/material';
import { getPieceImage } from '../../lib/chess/boardUtils';
import type { PieceColor, PieceType } from '../../types/chess';

interface DragPieceOverlayProps {
  piece: { color: PieceColor; type: PieceType };
  cursorPos: { x: number; y: number };
  squareSize: number;
}

/** Floating piece image that follows the cursor during a drag. */
const DragPieceOverlay: React.FC<DragPieceOverlayProps> = ({ piece, cursorPos, squareSize }) => (
  <Box
    component="img"
    src={getPieceImage(piece.color, piece.type)}
    alt=""
    sx={{
      position: 'fixed',
      left: cursorPos.x,
      top: cursorPos.y,
      width: squareSize * 0.85,
      height: squareSize * 0.85,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 1000,
      filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.45))',
    }}
  />
);

export default DragPieceOverlay;
