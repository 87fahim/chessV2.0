import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import ChessBoard from '../components/chess/ChessBoard';
import MoveList from '../components/chess/MoveList';
import { useSocket } from '../hooks/useSocket';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { setFen, moveMade, gameOver, flipBoard, setStatus, resetGame, setFlipped, setLastMove } from '../features/game/gameSlice';
import type { PieceColor, PieceType } from '../types/chess';

const STARTING_PIECE_COUNTS = {
  w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
  b: { p: 8, n: 2, b: 2, r: 2, q: 1 },
} as const;

const TIME_CONTROLS = [
  { label: '1 min', value: { initialMs: 60000, incrementMs: 0 } },
  { label: '3 min', value: { initialMs: 180000, incrementMs: 0 } },
  { label: '5 min', value: { initialMs: 300000, incrementMs: 0 } },
  { label: '10 min', value: { initialMs: 600000, incrementMs: 0 } },
  { label: '3+2', value: { initialMs: 180000, incrementMs: 2000 } },
  { label: '5+3', value: { initialMs: 300000, incrementMs: 3000 } },
  { label: '15+10', value: { initialMs: 900000, incrementMs: 10000 } },
];

function formatTime(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getCapturedCounts(fen: string) {
  const game = new Chess(fen);
  const remaining = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  };

  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece || piece.type === 'k') continue;
      remaining[piece.color][piece.type] += 1;
    }
  }

  const missingWhite = Object.entries(STARTING_PIECE_COUNTS.w).reduce(
    (sum, [type, count]) => sum + (count - remaining.w[type as keyof typeof remaining.w]),
    0,
  );
  const missingBlack = Object.entries(STARTING_PIECE_COUNTS.b).reduce(
    (sum, [type, count]) => sum + (count - remaining.b[type as keyof typeof remaining.b]),
    0,
  );

  return {
    capturedByWhite: missingBlack,
    capturedByBlack: missingWhite,
  };
}

const OnlinePlayPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const gameState = useAppSelector((s) => s.game);

  const {
    isConnected,
    isInQueue,
    onlineGame,
    drawOffered,
    error,
    joinQueue,
    leaveQueue,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    resetOnlineGame,
    syncGame,
    clearError,
  } = useSocket();

  const [selectedTC, setSelectedTC] = useState(TIME_CONTROLS[2].value);
  const [preferredColor, setPreferredColor] = useState<'random' | 'white' | 'black'>('random');
  const [showResignDialog, setShowResignDialog] = useState(false);

  // Sync online game fen to redux for ChessBoard rendering
  useEffect(() => {
    if (onlineGame.gameId && onlineGame.fen) {
      dispatch(setFen(onlineGame.fen));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.fen]);

  // Sync last move highlight when opponent moves
  useEffect(() => {
    if (!onlineGame.gameId) return;
    const moves = onlineGame.moves;
    if (moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      dispatch(setLastMove({ from: lastMove.from, to: lastMove.to }));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.moves]);

  // Set status to 'playing' when game starts, reset when it ends or leaves
  useEffect(() => {
    if (onlineGame.gameId && onlineGame.status === 'active') {
      dispatch(setStatus('playing'));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.status]);

  // Reset game state when leaving online play
  useEffect(() => {
    return () => {
      dispatch(resetGame());
    };
  }, [dispatch]);

  // Set board orientation based on assigned color (not a toggle)
  useEffect(() => {
    if (onlineGame.yourColor) {
      dispatch(setFlipped(onlineGame.yourColor === 'black'));
    }
  }, [dispatch, onlineGame.yourColor]);

  // Game ended
  useEffect(() => {
    if (onlineGame.status === 'completed' && onlineGame.result !== '*') {
      dispatch(gameOver(onlineGame.result));
    }
  }, [dispatch, onlineGame.status, onlineGame.result]);

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!onlineGame.gameId) return;

      // Validate locally first
      const game = new Chess(onlineGame.fen);
      const yourTurn =
        (onlineGame.yourColor === 'white' && game.turn() === 'w') ||
        (onlineGame.yourColor === 'black' && game.turn() === 'b');
      if (!yourTurn) return;

      const result = game.move({ from, to, promotion: promotion || undefined });
      if (!result) return;

      // Optimistic local update
      dispatch(
        moveMade({
          fen: game.fen(),
          san: result.san,
          from: result.from,
          to: result.to,
          captured: result.captured as PieceType | undefined,
          color: result.color as PieceColor,
        }),
      );

      sendMove(onlineGame.gameId, { from, to, promotion });
    },
    [dispatch, onlineGame.gameId, onlineGame.fen, onlineGame.yourColor, sendMove],
  );

  const handleResign = () => {
    if (onlineGame.gameId) resign(onlineGame.gameId);
    setShowResignDialog(false);
  };

  const handleNewGame = () => {
    dispatch(resetGame());
    resetOnlineGame();
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Sign in to play online.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
          Sign In
        </Button>
      </Box>
    );
  }

  // Lobby view - no active game
  if (!onlineGame.gameId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3 }}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%', textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
            Play Online
          </Typography>

          {!isConnected && (
            <Alert severity="warning" sx={{ mb: 2 }}>Connecting to server...</Alert>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>{error}</Alert>}

          {isInQueue ? (
            <Box>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ mb: 2 }}>Searching for opponent...</Typography>
              <Button variant="outlined" onClick={leaveQueue}>Cancel</Button>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Time Control</Typography>
                <ToggleButtonGroup
                  value={JSON.stringify(selectedTC)}
                  exclusive
                  onChange={(_, v) => v && setSelectedTC(JSON.parse(v))}
                  sx={{ flexWrap: 'wrap', gap: 0.5 }}
                >
                  {TIME_CONTROLS.map((tc) => (
                    <ToggleButton key={tc.label} value={JSON.stringify(tc.value)} size="small">
                      {tc.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Preferred Color</Typography>
                <ToggleButtonGroup
                  value={preferredColor}
                  exclusive
                  onChange={(_, v) => v && setPreferredColor(v)}
                  fullWidth
                >
                  <ToggleButton value="random">Random</ToggleButton>
                  <ToggleButton value="white">♔ White</ToggleButton>
                  <ToggleButton value="black">♚ Black</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={!isConnected}
                onClick={() => joinQueue(selectedTC, preferredColor)}
              >
                Find Match
              </Button>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  // Active game view
  const isYourTurn =
    onlineGame.yourColor &&
    ((onlineGame.yourColor === 'white' && new Chess(onlineGame.fen).turn() === 'w') ||
     (onlineGame.yourColor === 'black' && new Chess(onlineGame.fen).turn() === 'b'));

  const gameEnded = onlineGame.status === 'completed';
  const { capturedByWhite, capturedByBlack } = getCapturedCounts(onlineGame.fen);

  const isYouWhite = onlineGame.yourColor === 'white';
  const opponentName = isYouWhite
    ? onlineGame.blackPlayer?.name || 'Opponent'
    : onlineGame.whitePlayer?.name || 'Opponent';
  const yourName = user?.username || (isYouWhite ? onlineGame.whitePlayer?.name : onlineGame.blackPlayer?.name) || 'You';
  const yourCapturedCount = isYouWhite ? capturedByWhite : capturedByBlack;
  const opponentCapturedCount = isYouWhite ? capturedByBlack : capturedByWhite;

  const opponentClock = onlineGame.clocks
    ? (isYouWhite ? onlineGame.clocks.blackRemainingMs : onlineGame.clocks.whiteRemainingMs)
    : null;
  const yourClock = onlineGame.clocks
    ? (isYouWhite ? onlineGame.clocks.whiteRemainingMs : onlineGame.clocks.blackRemainingMs)
    : null;

  const opponentActive = onlineGame.clocks
    ? onlineGame.clocks.activeColor === (isYouWhite ? 'black' : 'white')
    : false;
  const youActive = onlineGame.clocks
    ? onlineGame.clocks.activeColor === (isYouWhite ? 'white' : 'black')
    : false;

  /** Low time threshold in ms */
  const LOW_TIME_MS = 30_000;

  const renderPlayerStrip = (
    name: string,
    capturedCount: number,
    clockMs: number | null,
    active: boolean,
    avatarSeed: string,
    isSelf: boolean,
    online?: boolean,
  ) => {
    const isLowTime = clockMs !== null && clockMs > 0 && clockMs <= LOW_TIME_MS;
    return (
      <Paper
        sx={{
          width: '90%',
          mx: 'auto',
          px: 1.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          border: '1px solid',
          borderColor: active ? 'primary.main' : 'divider',
          boxShadow: active ? 3 : 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: isSelf ? 'primary.main' : 'grey.700', fontSize: '0.95rem' }}>
              {avatarSeed.charAt(0).toUpperCase()}
            </Avatar>
            {/* Online/offline indicator for opponent */}
            {online !== undefined && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: online ? 'success.main' : 'error.main',
                  border: '2px solid',
                  borderColor: 'background.paper',
                }}
              />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {name}
              {online === false && !gameEnded && (
                <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.5 }}>
                  (disconnected)
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Captured: {capturedCount}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 800,
              color: isLowTime ? 'error.main' : active ? 'primary.main' : 'text.primary',
              lineHeight: 1,
            }}
          >
            {clockMs === null ? '--:--' : formatTime(clockMs)}
          </Typography>
        </Box>
      </Paper>
    );
  };

  const resultText = () => {
    if (onlineGame.result === '*') return '';
    if (onlineGame.result === '1/2-1/2') return 'Draw!';
    const youWon =
      (onlineGame.yourColor === 'white' && onlineGame.result === '1-0') ||
      (onlineGame.yourColor === 'black' && onlineGame.result === '0-1');
    return youWon ? 'You Win!' : 'You Lose!';
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.25, lg: 2 },
        p: { xs: 1, lg: 2 },
        height: '100%',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'stretch',
      }}
    >
      {/* Board */}
      <Box sx={{ flex: '1 1 auto', minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        {renderPlayerStrip(opponentName, opponentCapturedCount, opponentClock, opponentActive, opponentName, false, onlineGame.opponentOnline)}
        <Box sx={{ width: '90%', mx: 'auto' }}>
          <ChessBoard onMove={handleMove} />
        </Box>
        {renderPlayerStrip(yourName, yourCapturedCount, yourClock, youActive, yourName, true)}
      </Box>

      {/* Side Panel */}
      <Box sx={{ flex: { xs: '1 1 auto', lg: '0 1 380px' }, width: { xs: '100%', lg: 380 }, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {/* Status */}
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
            Status
          </Typography>
          {gameEnded ? (
            <Typography variant="h6" sx={{ fontWeight: 800 }} color="primary">
              {resultText()}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={isYourTurn ? 'Your turn' : "Opponent's turn"}
                color={isYourTurn ? 'success' : 'default'}
                size="small"
              />
              {!isConnected && (
                <Chip label="Reconnecting..." color="warning" size="small" variant="outlined" />
              )}
            </Box>
          )}

          {/* Abort / disconnect / inactivity warning */}
          {onlineGame.abortWarning && !gameEnded && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              {onlineGame.abortWarning.reason === 'inactivity'
                ? `You must move within ${onlineGame.abortWarning.secondsLeft}s or you will lose!`
                : `Opponent disconnected — game will end in ${onlineGame.abortWarning.secondsLeft}s if they don't return.`}
            </Alert>
          )}

          {error && <Alert severity="error" sx={{ mt: 1 }} onClose={clearError}>{error}</Alert>}
        </Paper>

        {/* Draw offer banner */}
        {drawOffered && !gameEnded && (
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Your opponent offers a draw</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" onClick={() => onlineGame.gameId && acceptDraw(onlineGame.gameId)}>
                Accept
              </Button>
              <Button size="small" variant="outlined" onClick={() => onlineGame.gameId && declineDraw(onlineGame.gameId)}>
                Decline
              </Button>
            </Box>
          </Paper>
        )}

        <MoveList moves={onlineGame.moves.map((m) => m.san)} />

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {!gameEnded && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => onlineGame.gameId && offerDraw(onlineGame.gameId)}
              >
                Offer Draw
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setShowResignDialog(true)}
              >
                Resign
              </Button>
            </>
          )}
          {gameEnded && (
            <Button variant="contained" onClick={handleNewGame}>
              New Game
            </Button>
          )}
        </Box>
      </Box>

      {/* Resign confirmation */}
      <Dialog open={showResignDialog} onClose={() => setShowResignDialog(false)}>
        <DialogTitle>Resign?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to resign this game?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResignDialog(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleResign}>Resign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnlinePlayPage;
