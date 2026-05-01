import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import Piece from './Piece';
import { BOARD_THEME, getBoardSquareBackground, getMoveColorTheme } from '../../lib/chess/boardTheme';
import { getBoardSquares, getSquareColor, getPieceImage, FILES, RANKS } from '../../lib/chess/boardUtils';
import { useAppSelector } from '../../hooks/useStore';
import type { PieceColor, PieceType } from '../../types/chess';
import type { BoardPosition, DragSource, PieceOnBoard } from '../../features/analysis/boardEditorTypes';

const DRAG_THRESHOLD = 4;
const SPARE_PIECE_TYPES: PieceType[] = ['k', 'q', 'r', 'b', 'n', 'p'];

interface EditableBoardProps {
  position: BoardPosition;
  isFlipped: boolean;
  highlightSquares?: { from: string; to: string } | null;
  onDrop: (source: DragSource, targetSquare: string | null) => void;
}

const EditableBoard: React.FC<EditableBoardProps> = ({
  position,
  isFlipped,
  highlightSquares,
  onDrop,
}) => {
  const boardTheme = useAppSelector((state) => state.settings.data.boardTheme);
  const moveColorTheme = useAppSelector((state) => state.settings.data.moveColorTheme);
  const moveTheme = getMoveColorTheme(moveColorTheme);
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeDrag, setActiveDrag] = useState<DragSource | null>(null);
  const [dragPiece, setDragPiece] = useState<PieceOnBoard | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [squareSize, setSquareSize] = useState(0);

  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  const boardSquares = getBoardSquares(isFlipped);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSquareSize(rect.width / 8);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const squareAtPoint = useCallback(
    (px: number, py: number): string | null => {
      const el = boardRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const col = Math.floor((px - rect.left) / squareSize);
      const row = Math.floor((py - rect.top) / squareSize);
      if (col < 0 || col > 7 || row < 0 || row > 7) return null;
      return boardSquares[row]?.[col] ?? null;
    },
    [boardSquares, squareSize],
  );

  // --- Board piece drag ---
  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent, square: string) => {
      const piece = position[square];
      if (!piece) return;

      pointerOrigin.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;
      setActiveDrag({ type: 'board', square, piece });
      setDragPiece(piece);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position],
  );

  // --- Spare piece drag ---
  const handleSparePointerDown = useCallback(
    (e: React.PointerEvent, color: PieceColor, type: PieceType) => {
      pointerOrigin.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;
      const piece: PieceOnBoard = { color, type };
      setActiveDrag({ type: 'spare', piece });
      setDragPiece(piece);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!activeDrag || !pointerOrigin.current) return;

      const dx = e.clientX - pointerOrigin.current.x;
      const dy = e.clientY - pointerOrigin.current.y;

      if (!isDragging.current) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        isDragging.current = true;
      }

      setCursorPos({ x: e.clientX, y: e.clientY });
      setDragOverSquare(squareAtPoint(e.clientX, e.clientY));
    },
    [activeDrag, squareAtPoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (isDragging.current && activeDrag) {
        const toSquare = squareAtPoint(e.clientX, e.clientY);
        onDrop(activeDrag, toSquare);
      }

      setActiveDrag(null);
      setDragPiece(null);
      setDragOverSquare(null);
      setCursorPos(null);
      pointerOrigin.current = null;
      isDragging.current = false;
    },
    [activeDrag, squareAtPoint, onDrop],
  );

  const files = isFlipped ? [...FILES].reverse() : [...FILES];
  const ranks = isFlipped ? [...RANKS].reverse() : [...RANKS];
  const topColor: PieceColor = isFlipped ? 'w' : 'b';
  const bottomColor: PieceColor = isFlipped ? 'b' : 'w';

  const sparePieceSize = squareSize > 0 ? squareSize * 0.75 : 40;

  const renderSpareRow = (color: PieceColor) => (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        justifyContent: 'center',
        py: 0.5,
        minHeight: sparePieceSize + 8,
      }}
    >
      {SPARE_PIECE_TYPES.map((type) => (
        <Box
          key={`${color}${type}`}
          onPointerDown={(e) => handleSparePointerDown(e, color, type)}
          sx={{
            width: sparePieceSize,
            height: sparePieceSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            borderRadius: 1,
            bgcolor: 'action.hover',
            touchAction: 'none',
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <Box
            component="img"
            src={getPieceImage(color, type)}
            alt={`${color}${type}`}
            draggable={false}
            sx={{
              width: '80%',
              height: '80%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        margin: '20px auto',
        position: 'relative',
        width: '80%',
        maxWidth: '100%',
        mx: 'auto',
        userSelect: 'none',
        '@media (min-width:1024px)': {
          maxWidth: 800,
        },
      }}
    >
      {/* Top spare pieces */}
      {renderSpareRow(topColor)}

      {/* Board grid */}
      <Box
        ref={boardRef}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          border: BOARD_THEME.border,
          borderRadius: BOARD_THEME.borderRadius,
          overflow: 'hidden',
          boxShadow: BOARD_THEME.boxShadow,
        }}
      >
        {boardSquares.map((row, rowIdx) =>
          row.map((square, colIdx) => {
            const piece = position[square];
            const fileIdx = isFlipped ? 7 - colIdx : colIdx;
            const rankIdx = isFlipped ? rowIdx : 7 - rowIdx;
            const isLight = getSquareColor(fileIdx, rankIdx) === 'light';
            const isHighlightFrom = highlightSquares?.from === square;
            const isHighlightTo = highlightSquares?.to === square;
            const isDragSourceSquare =
              activeDrag?.type === 'board' &&
              activeDrag.square === square &&
              isDragging.current;
            const isDragOver = dragOverSquare === square;

            const labelColor = isLight ? BOARD_THEME.labelOnLight : BOARD_THEME.labelOnDark;

            let overlayColor: string | undefined;
            if (isHighlightFrom || isHighlightTo) {
              overlayColor = isLight ? moveTheme.highlightLight : moveTheme.highlightDark;
            } else if (isDragOver) {
              overlayColor = isLight ? moveTheme.dragOverLight : moveTheme.dragOverDark;
            }

            const backgroundStyles = getBoardSquareBackground(boardTheme, isLight, overlayColor);

            return (
              <Box
                key={square}
                data-square={square}
                onPointerDown={(e) => handleBoardPointerDown(e, square)}
                sx={{
                  width: '100%',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...backgroundStyles,
                  position: 'relative',
                  cursor: piece ? 'grab' : 'default',
                  transition: 'background-image 0.12s ease, background-color 0.12s ease',
                  touchAction: 'none',
                }}
              >
                {/* Rank label */}
                {colIdx === 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      left: 3,
                      fontSize: '1rem',
                      fontWeight: 700,
                      lineHeight: 1,
                      color: labelColor,
                      pointerEvents: 'none',
                    }}
                  >
                    {ranks[rowIdx]}
                  </Box>
                )}
                {/* File label */}
                {rowIdx === 7 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 1,
                      right: 3,
                      fontSize: '1rem',
                      fontWeight: 700,
                      lineHeight: 1,
                      color: labelColor,
                      pointerEvents: 'none',
                    }}
                  >
                    {files[colIdx]}
                  </Box>
                )}

                {piece && (
                  <Piece
                    type={piece.type}
                    color={piece.color}
                    isDragging={isDragSourceSquare}
                  />
                )}
              </Box>
            );
          }),
        )}
      </Box>

      {/* Bottom spare pieces */}
      {renderSpareRow(bottomColor)}

      {/* Floating drag piece */}
      {cursorPos && dragPiece && (
        <Box
          component="img"
          src={getPieceImage(dragPiece.color, dragPiece.type)}
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
      )}
    </Box>
  );
};

export default EditableBoard;
