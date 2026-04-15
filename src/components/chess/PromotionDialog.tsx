import React from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import { getPieceImage } from '../../lib/chess/boardUtils';
import type { PieceColor, PieceType } from '../../types/chess';

interface PromotionDialogProps {
  color: PieceColor;
  onSelect: (piece: string) => void;
  onCancel: () => void;
}

const PROMOTION_PIECES: PieceType[] = ['q', 'r', 'b', 'n'];

const PromotionDialog: React.FC<PromotionDialogProps> = ({ color, onSelect, onCancel }) => {
  return (
    <Box
      onClick={onCancel}
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0,0,0,0.5)',
        zIndex: 10,
        borderRadius: '4px',
      }}
    >
      <Paper
        elevation={8}
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'flex',
          gap: 1,
          p: 2,
          borderRadius: 2,
        }}
      >
        {PROMOTION_PIECES.map((piece) => (
          <IconButton
            key={piece}
            onClick={() => onSelect(piece)}
            sx={{
              width: 56,
              height: 56,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            <Box
              component="img"
              src={getPieceImage(color, piece)}
              alt={`${color}${piece}`}
              sx={{ width: 44, height: 44, objectFit: 'contain' }}
            />
          </IconButton>
        ))}
      </Paper>
    </Box>
  );
};

export default PromotionDialog;
