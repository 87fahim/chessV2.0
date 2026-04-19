import React, { useState, useEffect, useRef } from 'react';
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
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { saveCurrentGame } from '../savedGames/savedGamesSlice';
import type { PieceColor } from '../../types/chess';
import type { Difficulty } from '../../types/game';

const PlayVsComputerPage: React.FC = () => {
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

  const [showNewGameDialog, setShowNewGameDialog] = useState(gameState.status === 'idle');
  const [selectedColor, setSelectedColor] = useState<PieceColor>('w');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [showCurtain, setShowCurtain] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const prevStatusRef = useRef(gameState.status);

  // Show curtain when transitioning to 'playing'
  useEffect(() => {
    if (prevStatusRef.current !== 'playing' && gameState.status === 'playing') {
      setShowCurtain(true);
      const timer = setTimeout(() => setShowCurtain(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = gameState.status;
  }, [gameState.status]);

  // Show end dialog when game finishes
  useEffect(() => {
    if (gameState.status === 'finished') {
      setShowEndDialog(true);
    }
  }, [gameState.status]);

  const handleStartGame = () => {
    startNewGame('vs-computer', selectedColor, selectedDifficulty);
    setShowNewGameDialog(false);
    setShowEndDialog(false);
  };

  const handleNewGame = () => {
    handleReset();
    setShowEndDialog(false);
    setShowNewGameDialog(true);
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
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.5, lg: 3 },
        p: { xs: 1, lg: 2 },
        height: '100%',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'stretch',
      }}
    >
      {/* Board Area */}
      <Box
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          '@media (max-width:1023.95px)': {
            px: '80px',
            boxSizing: 'border-box',
          },
        }}
      >
        <CapturedPieces pieces={gameState.capturedPieces} />
        <Box sx={{ position: 'relative' }}>
          <ChessBoard onMove={handleMove} />
          <GameStartCurtain
            visible={showCurtain}
            playerLabel={gameState.playerColor === 'w' ? 'White' : 'Black'}
            subtitle={`vs Computer (${gameState.difficulty.charAt(0).toUpperCase() + gameState.difficulty.slice(1)})`}
          />
        </Box>
        <GameControls
          canUndo={gameState.moves.length > 0 && gameState.status === 'playing'}
          isPlaying={gameState.status === 'playing'}
          onUndo={handleUndo}
          onFlip={handleFlip}
          onNewGame={handleNewGame}
          onResign={handleResign}
        />
        {isAuthenticated && gameState.moves.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSaveGame}
            sx={{ mt: 0.5, alignSelf: 'flex-start' }}
          >
            Save Game
          </Button>
        )}
      </Box>

      {/* Side Panel */}
      <Box
        sx={{
          flex: { xs: '1 1 auto', lg: '0 1 420px' },
          width: { xs: '100%', lg: 420 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          minHeight: { xs: 'auto', lg: 300 },
        }}
      >
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

        <MoveList moves={gameState.moves} />
      </Box>

      {/* New Game Dialog */}
      <Dialog open={showNewGameDialog} onClose={() => gameState.status !== 'idle' && setShowNewGameDialog(false)}>
        <DialogTitle sx={{ fontSize: { xs: '1.25rem', lg: '1.6rem' }, fontWeight: 700 }}>New Game vs Computer</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1, minWidth: 300 }}>
          <Box>
            <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.95rem', lg: '1.12rem' }, fontWeight: 600 }}>
              Play as
            </Typography>
            <ToggleButtonGroup
              value={selectedColor}
              exclusive
              onChange={(_, v) => v && setSelectedColor(v)}
              fullWidth
            >
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
              onChange={(_, v) => v && setSelectedDifficulty(v)}
              fullWidth
            >
              <ToggleButton value="easy">Easy</ToggleButton>
              <ToggleButton value="medium">Medium</ToggleButton>
              <ToggleButton value="hard">Hard</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewGameDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStartGame}>
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
    </Box>
  );
};

export default PlayVsComputerPage;
