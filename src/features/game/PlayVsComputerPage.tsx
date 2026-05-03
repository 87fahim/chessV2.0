import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Chess } from 'chess.js';
import ChessBoard from '../../components/chess/ChessBoard';
import MoveList from '../../components/chess/MoveList';
import CapturedPieces from '../../components/chess/CapturedPieces';
import GameControls from '../../components/chess/GameControls';
import GameStartCurtain from '../../components/chess/GameStartCurtain';
import GameEndDialog from '../../components/chess/GameEndDialog';
import { useChessGame } from '../../hooks/useChessGame';
import { usePremoveQueue } from '../../hooks/usePremoveQueue';
import BoardLayout from '../../components/chess/BoardLayout';
import ZoomControls from '../../components/chess/ZoomControls';
import { useBoardZoom } from '../../hooks/useBoardZoom';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { saveCurrentGame, autoSaveGame } from '../savedGames/savedGamesSlice';
import type { PieceColor } from '../../types/chess';
import type { Difficulty } from '../../types/game';

type ComputerColorChoice = PieceColor | 'random';

function resolveComputerColorChoice(value?: string): ComputerColorChoice {
  if (value === 'black') {
    return 'b';
  }
  if (value === 'random') {
    return 'random';
  }
  return 'w';
}

function resolveComputerDifficulty(value?: string): Difficulty {
  if (value === 'easy' || value === 'hard') {
    return value;
  }
  return 'medium';
}

function resolveComputerPlayerColor(choice: ComputerColorChoice): PieceColor {
  if (choice === 'random') {
    return Math.random() < 0.5 ? 'w' : 'b';
  }
  return choice;
}

const PlayVsComputerPage: React.FC = () => {
  const zoom = useBoardZoom();
  const {
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
  } = useChessGame();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const settings = useAppSelector((s) => s.settings.data);
  const defaultSelectedColor = resolveComputerColorChoice(settings.preferredColor);
  const defaultSelectedDifficulty = resolveComputerDifficulty(settings.defaultDifficulty);

  const [showNewGameDialog, setShowNewGameDialog] = useState(gameState.status === 'idle');
  const [selectedColorOverride, setSelectedColorOverride] = useState<ComputerColorChoice | null>(null);
  const [selectedDifficultyOverride, setSelectedDifficultyOverride] = useState<Difficulty | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showCurtain, setShowCurtain] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const prevStatusRef = useRef(gameState.status);
  const autoSavedRef = useRef(false);
  const gameStartedAtRef = useRef<string | null>(null);
  const selectedColor = selectedColorOverride ?? defaultSelectedColor;
  const selectedDifficulty = selectedDifficultyOverride ?? defaultSelectedDifficulty;

  /* --- Premove queue ----------------------------------------------- */
  const { queue: premoveQueue, premoveSquares, addPremove, clearPremoves, processNextPremove } = usePremoveQueue();

  const resetNewGameOptions = useCallback(() => {
    setSelectedColorOverride(null);
    setSelectedDifficultyOverride(null);
  }, []);

  // Show curtain when transitioning to 'playing'
  useEffect(() => {
    if (prevStatusRef.current !== 'playing' && gameState.status === 'playing') {
      setShowCurtain(true);
      gameStartedAtRef.current = new Date().toISOString();
      autoSavedRef.current = false;
      const timer = setTimeout(() => setShowCurtain(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status]);

  // Auto-save completed computer games to history
  useEffect(() => {
    if (
      gameState.status === 'finished' &&
      isAuthenticated &&
      user &&
      !autoSavedRef.current &&
      gameState.moveDetails.length > 0 &&
      gameState.result
    ) {
      autoSavedRef.current = true;
      const isWhite = gameState.playerColor === 'w';
      dispatch(
        autoSaveGame({
          mode: 'computer',
          whitePlayer: {
            type: isWhite ? 'user' : 'computer',
            userId: isWhite ? user._id : undefined,
            name: isWhite ? user.username : 'Computer',
          },
          blackPlayer: {
            type: isWhite ? 'computer' : 'user',
            userId: isWhite ? undefined : user._id,
            name: isWhite ? 'Computer' : user.username,
          },
          finalFen: gameState.fen,
          moves: gameState.moveDetails.map((m, i) => ({ ply: i + 1, ...m })),
          result: gameState.result,
          terminationReason: gameState.terminationReason ?? undefined,
          difficulty: gameState.difficulty,
          startedAt: gameStartedAtRef.current ?? undefined,
          endedAt: new Date().toISOString(),
        }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.status]);

  // Show end dialog when game finishes
  useEffect(() => {
    if (gameState.status === 'finished') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional status-driven transition
      setShowEndDialog(true);
    }
  }, [gameState.status]);

  /* --- Premove: clear on game end / new game ----------------------- */
  useEffect(() => {
    if (gameState.status !== 'playing') {
      clearPremoves();
    }
  }, [gameState.status, clearPremoves]);

  /* --- Premove: process queue when computer finishes --------------- */
  const prevFenRef = useRef(gameState.fen);
  useEffect(() => {
    if (prevFenRef.current === gameState.fen) return;
    prevFenRef.current = gameState.fen;

    if (gameState.status !== 'playing') return;
    if (premoveQueue.length === 0) return;

    const game = new Chess(gameState.fen);
    const isPlayerTurn =
      (game.turn() === 'w' && gameState.playerColor === 'w') ||
      (game.turn() === 'b' && gameState.playerColor === 'b');
    if (!isPlayerTurn) return;

    const premove = processNextPremove(gameState.fen);
    if (premove) {
      handleMove(premove.from, premove.to, premove.promotion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.fen]);

  /** Board-facing move handler — clears premoves when user makes a manual move. */
  const handleMoveAndClearPremoves = useCallback(
    (from: string, to: string, promotion?: string) => {
      clearPremoves();
      handleMove(from, to, promotion);
    },
    [clearPremoves, handleMove],
  );

  const handleStartGame = () => {
    startNewGame('vs-computer', resolveComputerPlayerColor(selectedColor), selectedDifficulty);
    resetNewGameOptions();
    setShowNewGameDialog(false);
    setShowEndDialog(false);
  };

  const handleNewGame = () => {
    handleReset();
    resetNewGameOptions();
    setShowEndDialog(false);
    setShowNewGameDialog(true);
  };

  const handleCloseNewGameDialog = () => {
    if (gameState.status === 'idle') {
      return;
    }

    resetNewGameOptions();
    setShowNewGameDialog(false);
  };

  const handleRematch = () => {
    // Rematch = restart with same color and difficulty
    setShowEndDialog(false);
    startNewGame('vs-computer', gameState.playerColor, gameState.difficulty);
  };

  const handleSaveGame = () => {
    if (!isAuthenticated) return;
    dispatch(
      saveCurrentGame({
        mode: 'computer',
        fen: gameState.fen,
        moves: gameState.moves.map((san, i) => ({
          ply: i + 1,
          san,
          from: '',
          to: '',
          fenAfter: gameState.history[i + 1] || gameState.fen,
        })),
        whitePlayer: {
          type: gameState.playerColor === 'w' ? 'user' : 'computer',
          name: gameState.playerColor === 'w' ? (user?.username || 'Player') : 'Computer',
        },
        blackPlayer: {
          type: gameState.playerColor === 'b' ? 'user' : 'computer',
          name: gameState.playerColor === 'b' ? (user?.username || 'Player') : 'Computer',
        },
        difficulty: gameState.difficulty,
      }),
    ).then((action) => {
      setSaveMsg(action.meta.requestStatus === 'fulfilled' ? 'Game saved!' : 'Failed to save game');
    });
  };

  const resultText = () => {
    if (!gameState.result) return '';
    if (gameState.result === '1/2-1/2') return 'Draw!';
    const playerWon =
      (gameState.playerColor === 'w' && gameState.result === '1-0') ||
      (gameState.playerColor === 'b' && gameState.result === '0-1');
    return playerWon ? 'You Win!' : 'Computer Wins!';
  };

  return (
    <>
      <BoardLayout
        panelWidth={420}
        boardColRef={zoom.boardColRef}
        boardWidth={zoom.boardWidth}
        board={<>
          <CapturedPieces pieces={gameState.capturedPieces} />
          <Box sx={{ position: 'relative' }}>
            <ChessBoard
              onMove={handleMoveAndClearPremoves}
              onPremove={addPremove}
              onClearPremoves={clearPremoves}
              premoveQueue={premoveQueue}
              premoveSquares={premoveSquares}
              playerColor={gameState.playerColor}
            />
            <GameStartCurtain
              visible={showCurtain}
              playerLabel={gameState.playerColor === 'w' ? 'White' : 'Black'}
              subtitle={`vs Computer (${gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)})`}
            />
          </Box>
        </>}
        panel={<>
          {/* Status */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', lg: '1.28rem' }, fontWeight: 700 }}>
              Status
            </Typography>
            {gameState.status === 'finished' ? (
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', lg: '2.15rem' }, lineHeight: 1.1 }} color="primary">
                {resultText()}
              </Typography>
            ) : gameState.status === 'playing' ? (
              <Typography variant="body2" sx={{ fontSize: { xs: '0.95rem', lg: '1.2rem' } }}>
                {new Chess(gameState.fen).turn() === gameState.playerColor
                  ? 'Your turn'
                  : isComputerThinking
                    ? 'Computer thinking...'
                    : "Computer's turn"}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', lg: '1.2rem' } }}>
                Start a new game
              </Typography>
            )}

            {engineError && (
              <Alert
                severity="error"
                sx={{ mt: 1.5 }}
                action={
                  <Button color="inherit" size="small" onClick={retryComputerMove}>
                    Retry
                  </Button>
                }
              >
                {engineError}
              </Alert>
            )}
          </Paper>

          {/* Controls */}
          <Paper elevation={2} sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', lg: '1.15rem' }, fontWeight: 700, mb: 0.75 }}>
              Controls
            </Typography>
            <GameControls
              canUndo={gameState.moves.length > 0 && gameState.status === 'playing'}
              isPlaying={gameState.status === 'playing'}
              onUndo={() => { clearPremoves(); handleUndo(); }}
              onFlip={handleFlip}
              onNewGame={handleNewGame}
              onResign={handleResign}
              zoomControls={
                <ZoomControls
                  onZoomIn={zoom.handleZoomIn}
                  onZoomOut={zoom.handleZoomOut}
                  canZoomIn={zoom.canZoomIn}
                  canZoomOut={zoom.canZoomOut}
                  zoomPercent={zoom.zoomPercent}
                />
              }
            />
            {isAuthenticated && gameState.moves.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveGame}
                sx={{ mt: 0.75 }}
              >
                Save Game
              </Button>
            )}
          </Paper>

          <MoveList moves={gameState.moves} />
        </>}
      />

      {/* New Game Dialog */}
      <Dialog
        open={showNewGameDialog}
        onClose={handleCloseNewGameDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100% - 16px)', sm: '100%' },
              m: { xs: 1, sm: 2 },
            },
          },
        }}
      >
        <DialogTitle sx={{ fontSize: { xs: '1.2rem', lg: '1.6rem' }, fontWeight: 700, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>
          New Game vs Computer
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 }, pt: 1, minWidth: 0, width: '100%', px: { xs: 2, sm: 3 }, overflowX: 'hidden' }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.95rem', lg: '1.12rem' }, fontWeight: 600 }}>
              Play as
            </Typography>
            <ToggleButtonGroup
              value={selectedColor}
              exclusive
              onChange={(_, v) => v && setSelectedColorOverride(v)}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  flex: 1,
                  minWidth: 0,
                  px: { xs: 0.75, sm: 1.25 },
                  py: { xs: 0.85, sm: 1 },
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.8rem', sm: '0.9rem' },
                },
              }}
            >
              <ToggleButton value="random">Random</ToggleButton>
              <ToggleButton value="w">♔ White</ToggleButton>
              <ToggleButton value="b">♚ Black</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.95rem', lg: '1.12rem' }, fontWeight: 600 }}>
              Difficulty
            </Typography>
            <ToggleButtonGroup
              value={selectedDifficulty}
              exclusive
              onChange={(_, v) => v && setSelectedDifficultyOverride(v)}
              fullWidth
              sx={{
                '& .MuiToggleButton-root': {
                  flex: 1,
                  minWidth: 0,
                  px: { xs: 0.5, sm: 1 },
                  py: { xs: 0.85, sm: 1 },
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.76rem', sm: '0.9rem' },
                },
              }}
            >
              <ToggleButton value="easy">Easy</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="hard">Hard</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 1.5, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, '& > :not(style)': { ml: 0 } }}>
          <Button onClick={handleCloseNewGameDialog} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleStartGame} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Start Game
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!saveMsg} autoHideDuration={3000} onClose={() => setSaveMsg(null)}>
        <Alert severity={saveMsg === 'Game saved!' ? 'success' : 'error'} onClose={() => setSaveMsg(null)}>
          {saveMsg}
        </Alert>
      </Snackbar>

      {/* Game End Dialog */}
      <GameEndDialog
        open={showEndDialog}
        result={gameState.result}
        reason={gameState.terminationReason ?? undefined}
        playerColor={gameState.playerColor}
        mode="vs-computer"
        onRematch={handleRematch}
        onNewGame={handleNewGame}
        onClose={() => setShowEndDialog(false)}
      />
    </>
  );
};

export default PlayVsComputerPage;
