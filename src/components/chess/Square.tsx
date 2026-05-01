import React from 'react';
import { Box } from '@mui/material';
import Piece from './Piece';
import { BOARD_THEME, getBoardSquareBackground, getMoveColorTheme } from '../../lib/chess/boardTheme';
import type { PieceColor, PieceType } from '../../types/chess';

interface SquareProps {
  boardTheme?: string;
  moveColorTheme?: string;
  square: string;
  piece: { type: PieceType; color: PieceColor } | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isPremove?: boolean;
  isDragSource: boolean;
  isDragOver: boolean;
  /** Label shown in the top-left (rank number) */
  rankLabel?: string | number;
  /** Label shown in the bottom-right (file letter) */
  fileLabel?: string;
  onPointerDown: (e: React.PointerEvent, square: string) => void;
}

const Square: React.FC<SquareProps> = ({
  boardTheme,
  moveColorTheme,
  square,
  piece,
  isLight,
  isSelected,
  isLegalMove,
  isLastMove,
  isCheck,
  isPremove,
  isDragSource,
  isDragOver,
  rankLabel,
  fileLabel,
  onPointerDown,
}) => {
  const moveTheme = getMoveColorTheme(moveColorTheme);
  const overlayColor = (() => {
    if (isCheck) return isLight ? moveTheme.checkLight : moveTheme.checkDark;
    if (isSelected) return isLight ? moveTheme.selectedLight : moveTheme.selectedDark;
    if (isPremove) return isLight ? moveTheme.premoveLight : moveTheme.premoveDark;
    if (isDragOver && isLegalMove) return isLight ? moveTheme.dragOverLight : moveTheme.dragOverDark;
    if (isLastMove) return isLight ? moveTheme.lastMoveLight : moveTheme.lastMoveDark;
    return undefined;
  })();

  const labelColor = isLight ? BOARD_THEME.labelOnLight : BOARD_THEME.labelOnDark;
  const backgroundStyles = getBoardSquareBackground(boardTheme, isLight, overlayColor);

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
        ...backgroundStyles,
        position: 'relative',
        cursor: piece ? 'grab' : isLegalMove ? 'pointer' : 'default',
        transition: 'background-image 0.12s ease, background-color 0.12s ease',
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
            backgroundColor: moveTheme.legalMoveDot,
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
            border: `5px solid ${moveTheme.captureIndicator}`,
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
