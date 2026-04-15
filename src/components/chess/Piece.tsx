import React from 'react';
import { Box } from '@mui/material';
import { getPieceImage } from '../../lib/chess/boardUtils';
import type { PieceColor, PieceType } from '../../types/chess';

interface PieceProps {
  type: PieceType;
  color: PieceColor;
  /** When true the piece is being dragged — hide it on the board */
  isDragging?: boolean;
}

const Piece: React.FC<PieceProps> = ({ type, color, isDragging }) => {
  return (
    <Box
      component="img"
      src={getPieceImage(color, type)}
      alt={`${color}${type}`}
      draggable={false}                            /* native img drag disabled; we use the square wrapper */
      sx={{
        width: '80%',
        height: '80%',
        objectFit: 'contain',
        userSelect: 'none',
        pointerEvents: 'none',                      /* clicks go through to square */
        opacity: isDragging ? 0.25 : 1,
        filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))',
      }}
    />
  );
};

export default Piece;
