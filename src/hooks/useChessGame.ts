import { useCallback, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { useAppDispatch, useAppSelector } from './useStore';
import {
  newGame,
  moveMade,
  undoMove,
  flipBoard,
  gameOver,
  resetGame,
} from '../features/game/gameSlice';
import { makeMove } from '../lib/chess/moveUtils';
import { DEFAULT_FEN } from '../lib/chess/fen';
import { getStockfishService, parseUciMove } from '../features/analysis/stockfishService';
import type { GameMode, Difficulty } from '../types/game';
import type { PieceColor, PieceType } from '../types/chess';
import { useGameSounds } from './useGameSounds';

export function useChessGame() {
  const dispatch = useAppDispatch();
  const gameState = useAppSelector((s) => s.game);
  const defaultBoardFlipped = useAppSelector((s) => s.settings.data.boardFlipped === true);
  const { playGameStart, playGameEnd, playIllegalMove, playMoveOutcome } = useGameSounds();
  const computerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isComputerThinking, setIsComputerThinking] = useState(false);

  const checkGameEnd = useCallback(
    (game: Chess) => {
      if (game.isCheckmate()) {
        const winner = game.turn() === 'w' ? '0-1' : '1-0';
        dispatch(gameOver({ result: winner, reason: 'checkmate' }));
        return true;
      }
      if (game.isStalemate()) {
        playGameEnd();
        dispatch(gameOver({ result: '1/2-1/2', reason: 'stalemate' }));
        return true;
      }
      if (game.isThreefoldRepetition()) {
        playGameEnd();
        dispatch(gameOver({ result: '1/2-1/2', reason: 'repetition' }));
        return true;
      }
      if (game.isInsufficientMaterial()) {
        playGameEnd();
        dispatch(gameOver({ result: '1/2-1/2', reason: 'insufficient_material' }));
        return true;
      }
      if (game.isDraw()) {
        playGameEnd();
        dispatch(gameOver({ result: '1/2-1/2', reason: 'draw' }));
        return true;
      }
      return false;
    },
    [dispatch, playGameEnd],
  );

  const handleComputerMove = useCallback(
    (fen: string, difficulty: Difficulty = gameState.difficulty) => {
      const game = new Chess(fen);
      if (game.isGameOver()) return;

      if (computerTimeoutRef.current) {
        clearTimeout(computerTimeoutRef.current);
      }

      setEngineError(null);
      setIsComputerThinking(true);

      // Delay based on difficulty
      const delays: Record<Difficulty, number> = { easy: 300, medium: 600, hard: 900 };
      const delay = delays[difficulty];

      computerTimeoutRef.current = setTimeout(async () => {
        const computerGame = new Chess(fen);
        try {
          const service = getStockfishService();
          const analysis = await service.analyze(fen, {
            difficulty,
            searchMode: 'time',
            searchDepth: difficulty === 'easy' ? 8 : difficulty === 'medium' ? 12 : 16,
            moveTimeMs: difficulty === 'easy' ? 250 : difficulty === 'medium' ? 700 : 1200,
          });

          if (!analysis.bestMove || analysis.bestMove === '(none)') {
            setEngineError('Computer engine did not return a legal move.');
            return;
          }

          const { from, to, promotion } = parseUciMove(analysis.bestMove);
          const move = computerGame.move({
            from,
            to,
            promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined,
          });

          if (!move) {
            return;
          }

          dispatch(
            moveMade({
              fen: computerGame.fen(),
              san: move.san,
              from: move.from,
              to: move.to,
              captured: move.captured as PieceType | undefined,
              color: move.color as PieceColor,
            }),
          );

          playMoveOutcome({
            san: move.san,
            captured: !!move.captured,
            promotion: move.promotion,
            isCheck: computerGame.isCheck(),
            isCheckmate: computerGame.isCheckmate(),
          });

          checkGameEnd(computerGame);
        } catch (error) {
          const reason = error instanceof Error ? error.message : 'Unknown engine error';
          setEngineError(`Computer engine unavailable. Ensure backend is running. ${reason}`);
        } finally {
          setIsComputerThinking(false);
        }
      }, delay);
    },
    [dispatch, gameState.difficulty, checkGameEnd, playMoveOutcome],
  );

  const startNewGame = useCallback(
    (mode: GameMode, playerColor: PieceColor, difficulty: Difficulty) => {
      if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
      setEngineError(null);
      setIsComputerThinking(false);
      dispatch(newGame({
        mode,
        playerColor,
        difficulty,
        isFlipped: defaultBoardFlipped ? playerColor === 'w' : playerColor === 'b',
      }));
      playGameStart();

      if (mode === 'vs-computer' && playerColor === 'b') {
        handleComputerMove(DEFAULT_FEN, difficulty);
      }
    },
    [defaultBoardFlipped, dispatch, handleComputerMove, playGameStart],
  );

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const game = new Chess(gameState.fen);
      const result = makeMove(game, from, to, promotion);
      if (!result || !result.san) {
        playIllegalMove();
        return;
      }

      setEngineError(null);

      dispatch(
        moveMade({
          fen: game.fen(),
          san: result.san,
          from: result.from,
          to: result.to,
          captured: result.captured,
          color: result.color as PieceColor,
        }),
      );

      playMoveOutcome({
        san: result.san,
        captured: !!result.captured,
        promotion: result.promotion,
        isCheck: game.isCheck(),
        isCheckmate: game.isCheckmate(),
      });

      if (checkGameEnd(game)) return;

      // Computer responds in vs-computer mode
      if (gameState.mode === 'vs-computer') {
        handleComputerMove(game.fen());
      }
    },
    [dispatch, gameState.fen, gameState.mode, checkGameEnd, handleComputerMove, playIllegalMove, playMoveOutcome],
  );

  const handleUndo = useCallback(() => {
    if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    setIsComputerThinking(false);
    setEngineError(null);
    dispatch(undoMove());
  }, [dispatch]);

  const handleFlip = useCallback(() => dispatch(flipBoard()), [dispatch]);

  const handleResign = useCallback(() => {
    const result = gameState.playerColor === 'w' ? '0-1' : '1-0';
    playGameEnd();
    dispatch(gameOver({ result, reason: 'resignation' }));
  }, [dispatch, gameState.playerColor, playGameEnd]);

  const handleReset = useCallback(() => {
    if (computerTimeoutRef.current) clearTimeout(computerTimeoutRef.current);
    setIsComputerThinking(false);
    setEngineError(null);
    dispatch(resetGame());
  }, [dispatch]);

  const retryComputerMove = useCallback(() => {
    if (gameState.mode !== 'vs-computer' || gameState.status !== 'playing') return;

    const game = new Chess(gameState.fen);
    const isPlayerTurn =
      (game.turn() === 'w' && gameState.playerColor === 'w') ||
      (game.turn() === 'b' && gameState.playerColor === 'b');

    if (!isPlayerTurn) {
      handleComputerMove(gameState.fen, gameState.difficulty);
    }
  }, [gameState.difficulty, gameState.fen, gameState.mode, gameState.playerColor, gameState.status, handleComputerMove]);

  return {
    gameState,
    engineError,
    isComputerThinking,
    startNewGame,
    handleMove,
    handleUndo,
    handleFlip,
    handleResign,
    handleReset,
    retryComputerMove,
  };
}
