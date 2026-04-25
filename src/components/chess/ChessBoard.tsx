import React, { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Box } from '@mui/material';
import { Chess } from 'chess.js';
import type { Square as ChessSquare } from 'chess.js';
import SquareComponent from './Square';
import PromotionDialog from './PromotionDialog';
import { BOARD_THEME } from '../../lib/chess/boardTheme';
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
  onPremove?: (from: string, to: string, promotion?: string) => void;
  onClearPremoves?: () => void;
  premoveQueue?: Array<{ from: string; to: string; promotion?: string }>;
  premoveSquares?: Set<string>;
  playerColor?: PieceColor;
}

/* Threshold in px before a pointerdown is considered a drag rather than a click */
const DRAG_THRESHOLD = 4;

const ChessBoard: React.FC<ChessBoardProps> = ({ onMove, onPremove, onClearPremoves, premoveQueue, premoveSquares, playerColor }) => {
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

  /* --- Premove selection state -------------------------------------- */
  const [premoveFrom, setPremoveFrom] = useState<string | null>(null);
  const [premovePromotionPending, setPremovePromotionPending] = useState<{ from: string; to: string } | null>(null);

  const game = new Chess(fen);
  const board = game.board();
  const boardSquares = getBoardSquares(isFlipped);
  const isInCheck = game.inCheck();
  const currentTurn = game.turn();

  /**
   * Virtual own-piece map after applying queued premoves in order.
   * This enables chaining premoves with the same piece across future turns.
   */
  const virtualOwnPieces = useMemo(() => {
    const virtual = new Map<string, { color: PieceColor; type: PieceType }>();
    const rankChars = ['1', '2', '3', '4', '5', '6', '7', '8'];

    for (const file of FILES) {
      for (const rank of rankChars) {
        const square = `${file}${rank}`;
        const piece = game.get(square as ChessSquare);
        if (!piece) continue;
        virtual.set(square, {
          color: piece.color as PieceColor,
          type: piece.type as PieceType,
        });
      }
    }

    if (!playerColor || !premoveQueue || premoveQueue.length === 0) {
      const own = new Map<string, PieceType>();
      for (const [square, piece] of virtual) {
        if (piece.color === playerColor) own.set(square, piece.type);
      }
      return own;
    }

    for (const pm of premoveQueue) {
      const movingPiece = virtual.get(pm.from);
      if (!movingPiece || movingPiece.color !== playerColor) continue;

      virtual.delete(pm.from);
      const promoteRank = playerColor === 'w' ? '8' : '1';
      const promotedType =
        movingPiece.type === 'p' && pm.promotion && pm.to[1] === promoteRank
          ? (pm.promotion as PieceType)
          : movingPiece.type;

      virtual.set(pm.to, { color: movingPiece.color, type: promotedType });
    }

    const own = new Map<string, PieceType>();
    for (const [square, piece] of virtual) {
      if (piece.color === playerColor) own.set(square, piece.type);
    }
    return own;
  }, [fen, game, playerColor, premoveQueue]);

  /** True when the player can queue premoves (opponent's turn, game active). */
  const inPremoveMode = !!(onPremove && playerColor && currentTurn !== playerColor && status === 'playing');

  /* Clear premove selection when leaving premove mode */
  useEffect(() => {
    if (!inPremoveMode) {
      setPremoveFrom(null);
    }
  }, [inPremoveMode]);

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
      if (promotionPending || premovePromotionPending) return;

      /* ---------- Premove click mode ---------- */
      if (inPremoveMode) {
        if (premoveFrom) {
          // Clicked same square → deselect
          if (premoveFrom === square) {
            setPremoveFrom(null);
            dispatch(clearSelection());
            return;
          }

          // Clicked an actual own piece on the real board → switch selection
          const actualPiece = game.get(square as ChessSquare);
          if (actualPiece && actualPiece.color === playerColor) {
            setPremoveFrom(square);
            dispatch(setSelectedSquare({ square, legalMoves: [] }));
            return;
          }

          // Any other square → queue premove, auto-select destination for unlimited chaining
          // Check if this looks like a pawn promotion
          const srcType = virtualOwnPieces.get(premoveFrom);
          if (srcType === 'p') {
            const promoRank = playerColor === 'w' ? '8' : '1';
            if (square[1] === promoRank) {
              setPremovePromotionPending({ from: premoveFrom, to: square });
              return;
            }
          }

          onPremove!(premoveFrom, square);
          // Keep destination selected so user can keep chaining indefinitely
          setPremoveFrom(square);
          dispatch(setSelectedSquare({ square, legalMoves: [] }));
          return;
        }

        // No source selected yet → allow selecting actual own piece or any premove destination square
        const piece = game.get(square as ChessSquare);
        const isActualOwnPiece = piece && piece.color === playerColor;
        const isVirtualOwnPiece = !!playerColor && virtualOwnPieces.has(square);
        const isPremoveDestination = premoveSquares?.has(square) ?? false;
        if (isActualOwnPiece || isVirtualOwnPiece || isPremoveDestination) {
          setPremoveFrom(square);
          dispatch(setSelectedSquare({ square, legalMoves: [] }));
        }
        return;
      }

      /* ---------- Normal click mode ---------- */
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
    [selectedSquare, legalMoves, fen, status, promotionPending, premovePromotionPending, currentTurn, inPremoveMode, premoveFrom, playerColor, dispatch, onMove, onPremove, game, virtualOwnPieces],
  );

  /* ---- Pointer handlers -------------------------------------------- */

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, square: string) => {
      if (status !== 'playing' || promotionPending || premovePromotionPending) return;

      const piece = game.get(square as ChessSquare);

      // Store origin to detect drag vs click later
      pointerOrigin.current = { x: e.clientX, y: e.clientY };
      isDragging.current = false;
      pendingClickSquare.current = square;

      if (inPremoveMode) {
        const isActualOwnPiece = piece && piece.color === playerColor;
        const virtualType = playerColor ? virtualOwnPieces.get(square) : undefined;
        const isDraggable = isActualOwnPiece || !!virtualType;
        if (isDraggable) {
          const pColor = (piece?.color ?? playerColor) as PieceColor;
          const pType = (piece?.type ?? virtualType ?? 'p') as PieceType;
          setDragPiece({ color: pColor, type: pType });
          setDragSource(square);
          setDragLegalMoves([]); // No legal-move hints for premoves
          setPremoveFrom(square);
          dispatch(setSelectedSquare({ square, legalMoves: [] }));
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
        return;
      }

      const isOwnPiece = piece && piece.color === currentTurn;

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
    [fen, status, promotionPending, premovePromotionPending, currentTurn, inPremoveMode, playerColor, dispatch, game],
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
        const toSquare = squareAtPoint(e.clientX, e.clientY);

        if (inPremoveMode) {
          // Premove drag drop
          if (toSquare && toSquare !== dragSource) {
            const srcPiece = game.get(dragSource as ChessSquare);
            if (srcPiece?.type === 'p') {
              const promoRank = playerColor === 'w' ? '8' : '1';
              if (toSquare[1] === promoRank) {
                setPremovePromotionPending({ from: dragSource, to: toSquare });
                setPremoveFrom(null);
                dispatch(clearSelection());
                // Fall through to reset drag state below
                setDragSource(null);
                setDragPiece(null);
                setDragLegalMoves([]);
                setDragOverSquare(null);
                setCursorPos(null);
                pointerOrigin.current = null;
                isDragging.current = false;
                pendingClickSquare.current = null;
                return;
              }
            }
            onPremove?.(dragSource, toSquare);
            // Auto-select destination for chaining
            setPremoveFrom(toSquare);
            dispatch(setSelectedSquare({ square: toSquare, legalMoves: [] }));
          } else {
            setPremoveFrom(null);
            dispatch(clearSelection());
          }
        } else {
          // Normal drag drop
          if (toSquare && dragLegalMoves.includes(toSquare)) {
            if (isPromotion(game, dragSource, toSquare)) {
              dispatch(setPromotionPending({ from: dragSource, to: toSquare }));
            } else {
              onMove(dragSource, toSquare);
            }
          } else {
            dispatch(clearSelection());
          }
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
    [dragSource, dragLegalMoves, game, dispatch, onMove, onPremove, squareAtPoint, handleClick, inPremoveMode, playerColor],
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

  /* ---- Premove promotion handlers --------------------------------- */
  const handlePremovePromotion = useCallback(
    (piece: string) => {
      if (premovePromotionPending) {
        onPremove?.(premovePromotionPending.from, premovePromotionPending.to, piece);
        // Auto-select destination for chaining after promotion
        setPremoveFrom(premovePromotionPending.to);
        dispatch(setSelectedSquare({ square: premovePromotionPending.to, legalMoves: [] }));
        setPremovePromotionPending(null);
      }
    },
    [premovePromotionPending, onPremove, dispatch],
  );

  const handlePremovePromotionCancel = useCallback(() => {
    setPremovePromotionPending(null);
  }, []);

  /* ---- Right-click clears premoves -------------------------------- */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (onClearPremoves && premoveSquares && premoveSquares.size > 0) {
        e.preventDefault();
        onClearPremoves();
        setPremoveFrom(null);
        dispatch(clearSelection());
      }
    },
    [onClearPremoves, premoveSquares, dispatch],
  );

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
      onContextMenu={handleContextMenu}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        mx: 0,
        userSelect: 'none',
      }}
    >
      <Box
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
                isPremove={premoveSquares?.has(square) ?? false}
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

      {/* Premove Promotion Dialog */}
      {premovePromotionPending && playerColor && (
        <PromotionDialog
          color={playerColor}
          onSelect={handlePremovePromotion}
          onCancel={handlePremovePromotionCancel}
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
