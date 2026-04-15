import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { Chess } from 'chess.js';
import type { Square as ChessSquare } from 'chess.js';
import SquareComponent from './Square';
import PromotionDialog from './PromotionDialog';
import { getBoardSquares, getSquareColor, getPieceImage, FILES, RANKS } from '../../lib/chess/boardUtils';
import { getLegalMoves, isPromotion } from '../../lib/chess/moveUtils';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import {
  setSelectedSquare,
  clearSelection,
  setPromotionPending,
} from '../../features/game/gameSlice';
import type { PieceColor, PieceType } from '../../types/chess';

interface ChessBoardProps {
  onMove: (from: string, to: string, promotion?: string) => void;
}

/* Threshold in px before a pointerdown is considered a drag rather than a click */
const DRAG_THRESHOLD = 4;

const ChessBoard: React.FC<ChessBoardProps> = ({ onMove }) => {
  const dispatch = useAppDispatch();
  const { fen, selectedSquare, legalMoves, lastMove, isFlipped, promotionPending, status } =
    useAppSelector((s) => s.game);

  /* --- Drag state --------------------------------------------------- */
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragPiece, setDragPiece] = useState<{ color: PieceColor; type: PieceType } | null>(null);
  const [dragLegalMoves, setDragLegalMoves] = useState<string[]>([]);
  const [dragOverSquare, setDragOverSquare] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [squareSize, setSquareSize] = useState(0);

  /* Track whether pointer moved enough to be a drag */
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const pendingClickSquare = useRef<string | null>(null);

  const game = new Chess(fen);
  const board = game.board();
  const boardSquares = getBoardSquares(isFlipped);
  const isInCheck = game.inCheck();
  const currentTurn = game.turn();

  /* Compute square size whenever the board element resizes */
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

  /* ---- Utility: which square is at a given page coordinate? -------- */
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

  /* ---- Click handler (used when pointer released without drag) ----- */
  const handleClick = useCallback(
    (square: string) => {
      if (status !== 'playing') return;
      if (promotionPending) return;

      if (selectedSquare && legalMoves.includes(square)) {
        if (isPromotion(game, selectedSquare, square)) {
          dispatch(setPromotionPending({ from: selectedSquare, to: square }));
        } else {
          onMove(selectedSquare, square);
        }
        return;
      }

      const piece = game.get(square as ChessSquare);
      if (piece && piece.color === currentTurn) {
        const moves = getLegalMoves(game, square);
        dispatch(setSelectedSquare({ square, legalMoves: moves }));
        return;
      }

      dispatch(clearSelection());
    },
    [selectedSquare, legalMoves, fen, status, promotionPending, currentTurn, dispatch, onMove, game],
  );

  /* ---- Pointer handlers -------------------------------------------- */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, square: string) => {
      if (status !== 'playing' || promotionPending) return;

      const piece = game.get(square as ChessSquare);
      const isOwnPiece = piece && piece.color === currentTurn;

      // Store origin to detect drag vs click later
      pointerOrigin.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;
      pendingClickSquare.current = square;

      if (isOwnPiece) {
        // Prepare drag payload (don't start visual drag yet — wait for threshold)
        setDragPiece({ color: piece.color as PieceColor, type: piece.type as PieceType });
        const moves = getLegalMoves(game, square);
        setDragSource(square);
        setDragLegalMoves(moves);
        dispatch(setSelectedSquare({ square, legalMoves: moves }));

        // Capture pointer so we get events even if cursor leaves the board
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    },
    [fen, status, promotionPending, currentTurn, dispatch, game],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragSource || !pointerOrigin.current) return;

      const dx = e.clientX - pointerOrigin.current.x;
      const dy = e.clientY - pointerOrigin.current.y;

      if (!isDragging.current) {
        if (Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;
        isDragging.current = true;
      }

      setCursorPos({ x: e.clientX, y: e.clientY });

      const sq = squareAtPoint(e.clientX, e.clientY);
      setDragOverSquare(sq);
    },
    [dragSource, squareAtPoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      if (isDragging.current && dragSource) {
        // Complete the drop
        const toSquare = squareAtPoint(e.clientX, e.clientY);
        if (toSquare && dragLegalMoves.includes(toSquare)) {
          if (isPromotion(game, dragSource, toSquare)) {
            dispatch(setPromotionPending({ from: dragSource, to: toSquare }));
          } else {
            onMove(dragSource, toSquare);
          }
        } else {
          dispatch(clearSelection());
        }
      } else if (pendingClickSquare.current) {
        // It was a click, not a drag
        handleClick(pendingClickSquare.current);
      }

      // Reset drag state
      setDragSource(null);
      setDragPiece(null);
      setDragLegalMoves([]);
      setDragOverSquare(null);
      setCursorPos(null);
      pointerOrigin.current = null;
      isDragging.current = false;
      pendingClickSquare.current = null;
    },
    [dragSource, dragLegalMoves, game, dispatch, onMove, squareAtPoint, handleClick],
  );

  /* ---- end pointer handlers --------------------------------------- */

  const handlePromotion = useCallback(
    (piece: string) => {
      if (promotionPending) {
        onMove(promotionPending.from, promotionPending.to, piece);
        dispatch(setPromotionPending(null));
      }
    },
    [promotionPending, onMove, dispatch],
  );

  const handlePromotionCancel = useCallback(() => {
    dispatch(setPromotionPending(null));
    dispatch(clearSelection());
  }, [dispatch]);

  // Find king square if in check
  let kingSquare: string | null = null;
  if (isInCheck) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === currentTurn) {
          kingSquare = `${FILES[c]}${8 - r}`;
        }
      }
    }
  }

  const files = isFlipped ? [...FILES].reverse() : [...FILES];
  const ranks = isFlipped ? [...RANKS].reverse() : [...RANKS];

  return (
    <Box
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: '100%', lg: 800 },
        mx: 0,
        userSelect: 'none',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          border: '2px solid #333',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {boardSquares.map((row, rowIdx) =>
          row.map((square, colIdx) => {
            const piece = game.get(square as ChessSquare);
            const fileIdx = isFlipped ? 7 - colIdx : colIdx;
            const rankIdx = isFlipped ? rowIdx : 7 - rowIdx;
            const isLight = getSquareColor(fileIdx, rankIdx) === 'light';

            return (
              <SquareComponent
                key={square}
                square={square}
                piece={piece ? { type: piece.type as PieceType, color: piece.color as PieceColor } : null}
                isLight={isLight}
                isSelected={selectedSquare === square}
                isLegalMove={legalMoves.includes(square) || dragLegalMoves.includes(square)}
                isLastMove={lastMove?.from === square || lastMove?.to === square}
                isCheck={kingSquare === square}
                isDragSource={dragSource === square && isDragging.current}
                isDragOver={dragOverSquare === square}
                rankLabel={colIdx === 0 ? ranks[rowIdx] : undefined}
                fileLabel={rowIdx === 7 ? files[colIdx] : undefined}
                onPointerDown={handlePointerDown}
              />
            );
          }),
        )}
      </Box>

      {/* Promotion Dialog */}
      {promotionPending && (
        <PromotionDialog
          color={currentTurn}
          onSelect={handlePromotion}
          onCancel={handlePromotionCancel}
        />
      )}

      {/* Floating drag piece – centered on cursor */}
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

export default ChessBoard;
