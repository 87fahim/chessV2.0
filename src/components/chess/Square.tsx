import React from 'react';
import { Box } from '@mui/material';
import Piece from './Piece';
import type { PieceColor, PieceType } from '../../types/chess';

interface SquareProps {
  square: string;
  piece: { type: PieceType; color: PieceColor } | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isDragSource: boolean;
  isDragOver: boolean;
  /** Label shown in the top-left (rank number) */
  rankLabel?: string | number;
  /** Label shown in the bottom-right (file letter) */
  fileLabel?: string;
  onPointerDown: (e: React.PointerEvent, square: string) => void;
}

const Square: React.FC<SquareProps> = ({
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isLastMove,
  isCheck,
  isDragSource,
  isDragOver,
  rankLabel,
  fileLabel,
  onPointerDown,
}) => {
  const getBgColor = () => {
    if (isCheck) return isLight ? '#f7a5a5' : '#e04040';
    if (isSelected) return isLight ? '#829ee0' : '#5d7bc4';
    if (isDragOver && isLegalMove) return isLight ? '#b3d4a5' : '#6aad55';
    if (isLastMove) return isLight ? '#ced26b' : '#a9a238';
    return isLight ? '#ecd8b4' : '#ae7b4e';
  };

  const labelColor = isLight ? 'rgba(100,60,30,0.7)' : 'rgba(240,220,190,0.7)';

  return (
    <Box
      data-square={square}
      onPointerDown={(e) => onPointerDown(e, square)}
      sx={{
        width: '100%',
        aspectRatio: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: getBgColor(),
        position: 'relative',
        cursor: piece ? 'grab' : isLegalMove ? 'pointer' : 'default',
        transition: 'background-color 0.12s ease',
        touchAction: 'none',
      }}
    >
      {/* Rank label — top-left corner */}
      {rankLabel != null && (
        <Box
          sx={{
            position: 'absolute',
            top: 2,
            left: 3,
            fontSize: '0.65rem',
            fontWeight: 700,
            lineHeight: 1,
            color: labelColor,
            pointerEvents: 'none',
          }}
        >
          {rankLabel}
        </Box>
      )}
      {/* File label — bottom-right corner */}
      {fileLabel && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 1,
            right: 3,
            fontSize: '0.65rem',
            fontWeight: 700,
            lineHeight: 1,
            color: labelColor,
            pointerEvents: 'none',
          }}
        >
          {fileLabel}
        </Box>
      )}

      {/* Legal move indicator */}
      {isLegalMove && !piece && (
        <Box
          sx={{
            width: '28%',
            height: '28%',
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.15)',
            position: 'absolute',
          }}
        />
      )}
      {/* Capture indicator */}
      {isLegalMove && piece && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            border: '5px solid rgba(0,0,0,0.15)',
            position: 'absolute',
            boxSizing: 'border-box',
          }}
        />
      )}
      {piece && <Piece type={piece.type} color={piece.color} isDragging={isDragSource} />}
    </Box>
  );
};

export default Square;
