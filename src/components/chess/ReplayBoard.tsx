import React from 'react';
import { Box } from '@mui/material';
import { Chess } from 'chess.js';
import Piece from './Piece';
import { BOARD_THEME } from '../../lib/chess/boardTheme';
import { getBoardSquares, getSquareColor, FILES, RANKS } from '../../lib/chess/boardUtils';
import type { PieceColor, PieceType } from '../../types/chess';

interface ReplayBoardProps {
  fen: string;
  lastMove?: { from: string; to: string } | null;
  isFlipped?: boolean;
}

const ReplayBoard: React.FC<ReplayBoardProps> = ({ fen, lastMove, isFlipped = false }) => {
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

  const getSquareBg = (square: string, isLight: boolean) => {
    if (square === kingSq) return isLight ? BOARD_THEME.checkLight : BOARD_THEME.checkDark;
    if (lastMove && (square === lastMove.from || square === lastMove.to))
      return isLight ? BOARD_THEME.lastMoveLight : BOARD_THEME.lastMoveDark;
    return isLight ? BOARD_THEME.light : BOARD_THEME.dark;
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
              backgroundColor: getSquareBg(square, isLight),
              position: 'relative',
              transition: 'background-color 0.12s ease',
            }}
          >
            {rankLabel && (
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
            {fileLabel && (
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
