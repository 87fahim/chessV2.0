import React from 'react';
import { Box } from '@mui/material';
import { Chess } from 'chess.js';
import Piece from './Piece';
import { BOARD_THEME, getBoardSquareBackground, getMoveColorTheme } from '../../lib/chess/boardTheme';
import { getBoardSquares, getSquareColor, FILES } from '../../lib/chess/boardUtils';
import { useAppSelector } from '../../hooks/useStore';
import type { PieceColor, PieceType } from '../../types/chess';

interface ReplayBoardProps {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  isFlipped?: boolean;
}

const ReplayBoard: React.FC<ReplayBoardProps> = ({ fen, lastMove, isFlipped = false }) => {
  const settings = useAppSelector((state) => state.settings.data);
  const boardTheme = settings.boardTheme;
  const moveColorTheme = settings.moveColorTheme;
  const showCoordinates = settings.showCoordinates === true;
  const highlightLastMove = settings.highlightLastMove !== false;
  const highlightCheck = settings.highlightCheck !== false;
  const animationsEnabled = settings.animationEnabled !== false;
  const moveTheme = getMoveColorTheme(moveColorTheme);
  const game = new Chess(fen);
  const board = game.board();
  const boardSquares = getBoardSquares(isFlipped);

  const isInCheck = game.inCheck();
  const kingSq = (() => {
    if (!isInCheck) return null;
    const turn = game.turn();
    for (const row of board) {
      for (const sq of row) {
        if (sq?.type === 'k' && sq.color === turn) return sq.square;
      }
    }
    return null;
  })();

  const getSquareOverlay = (square: string, isLight: boolean) => {
    if (highlightCheck && square === kingSq) return isLight ? moveTheme.checkLight : moveTheme.checkDark;
    if (highlightLastMove && lastMove && (square === lastMove.from || square === lastMove.to)) {
      return isLight ? moveTheme.lastMoveLight : moveTheme.lastMoveDark;
    }
    return undefined;
  };

  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '1',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        userSelect: 'none',
        border: BOARD_THEME.border,
        borderRadius: BOARD_THEME.borderRadius,
        overflow: 'hidden',
        boxShadow: BOARD_THEME.boxShadow,
      }}
    >
      {boardSquares.flat().map((square) => {
        const col = FILES.indexOf(square[0] as typeof FILES[number]);
        const rank = parseInt(square[1], 10);
        const isLight = getSquareColor(col, 8 - rank) === 'light';

        // Find piece at this square
        const chessPiece = game.get(square as Parameters<typeof game.get>[0]);

        // Edge labels
        const isFirstCol = isFlipped ? square[0] === 'h' : square[0] === 'a';
        const isLastRow = isFlipped ? square[1] === '8' : square[1] === '1';
        const rankLabel = isFirstCol ? square[1] : undefined;
        const fileLabel = isLastRow ? square[0] : undefined;

        const labelColor = isLight ? BOARD_THEME.labelOnLight : BOARD_THEME.labelOnDark;
        const backgroundStyles = getBoardSquareBackground(
          boardTheme,
          isLight,
          getSquareOverlay(square, isLight),
        );

        return (
          <Box
            key={square}
            data-square={square}
            sx={{
              width: '100%',
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...backgroundStyles,
              position: 'relative',
              transition: animationsEnabled ? 'background-image 0.12s ease, background-color 0.12s ease' : 'none',
            }}
          >
            {showCoordinates && rankLabel && (
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
            {showCoordinates && fileLabel && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 2,
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
            {chessPiece && (
              <Piece
                type={chessPiece.type as PieceType}
                color={chessPiece.color as PieceColor}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default ReplayBoard;
