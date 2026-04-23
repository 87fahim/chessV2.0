import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchHistoryGame, clearCurrentGame } from '../features/savedGames/savedGamesSlice';
import ReplayBoard from '../components/chess/ReplayBoard';
import ReplayMoveList from '../components/chess/ReplayMoveList';
import ReplayControls, { type ReplaySpeed } from '../components/chess/ReplayControls';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const SPEED_MS: Record<ReplaySpeed, number> = {
  0.5: 2000,
  1: 1000,
  2: 500,
  4: 200,
};

function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt || !endedAt) return '—';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeControl(tc?: { initialMs: number; incrementMs: number }): string {
  if (!tc) return 'Unlimited';
  const base = Math.round(tc.initialMs / 60000);
  const inc = Math.round(tc.incrementMs / 1000);
  return inc > 0 ? `${base}+${inc}` : `${base} min`;
}

function resultLabel(result: string, reason?: string): { text: string; color: 'success' | 'error' | 'default' | 'warning' } {
  const suffix = reason ? ` (${reason.replace(/_/g, ' ')})` : '';
  if (result === '1-0') return { text: `White wins${suffix}`, color: 'success' };
  if (result === '0-1') return { text: `Black wins${suffix}`, color: 'error' };
  if (result === '1/2-1/2') return { text: `Draw${suffix}`, color: 'default' };
  return { text: 'In progress', color: 'warning' };
}

const GameReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentGame, isLoading, error } = useAppSelector((s) => s.savedGames);

  // Replay state
  const [moveIndex, setMoveIndex] = useState(-1); // -1 = starting position
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [isFlipped, setIsFlipped] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (id) dispatch(fetchHistoryGame(id));
    return () => {
      dispatch(clearCurrentGame());
    };
  }, [dispatch, id]);

  // Reset replay position when game loads
  useEffect(() => {
    if (currentGame) {
      setMoveIndex(-1);
      setIsPlaying(false);
    }
  }, [currentGame?._id]);

  const moves = currentGame?.moves ?? [];
  const totalMoves = moves.length;

  // Build position array: index 0 = start, index i+1 = after moves[i]
  const positions: string[] = [STARTING_FEN];
  for (const m of moves) {
    positions.push(m.fenAfter);
  }

  const currentFen = positions[moveIndex + 1] ?? STARTING_FEN;
  const lastMove = moveIndex >= 0 ? { from: moves[moveIndex].from, to: moves[moveIndex].to } : null;

  // Auto-play interval
  const stopPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlay = useCallback(
    (fromIndex: number, currentSpeed: ReplaySpeed) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(true);
      let idx = fromIndex;
      intervalRef.current = setInterval(() => {
        idx += 1;
        if (idx >= totalMoves) {
          setMoveIndex(totalMoves - 1);
          stopPlay();
        } else {
          setMoveIndex(idx);
        }
      }, SPEED_MS[currentSpeed]);
    },
    [totalMoves, stopPlay],
  );

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleFirst = useCallback(() => { stopPlay(); setMoveIndex(-1); }, [stopPlay]);
  const handlePrev = useCallback(() => { stopPlay(); setMoveIndex((i) => Math.max(-1, i - 1)); }, [stopPlay]);
  const handleNext = useCallback(() => {
    stopPlay();
    setMoveIndex((i) => {
      const next = Math.min(totalMoves - 1, i + 1);
      return next;
    });
  }, [stopPlay, totalMoves]);
  const handleLast = useCallback(() => { stopPlay(); setMoveIndex(totalMoves - 1); }, [stopPlay, totalMoves]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlay();
    } else {
      const start = moveIndex >= totalMoves - 1 ? -1 : moveIndex;
      if (moveIndex >= totalMoves - 1) setMoveIndex(-1);
      startPlay(start, speed);
    }
  }, [isPlaying, moveIndex, totalMoves, speed, stopPlay, startPlay]);

  const handleSpeedChange = useCallback(
    (newSpeed: ReplaySpeed) => {
      setSpeed(newSpeed);
      if (isPlaying) {
        // Restart with new speed from current position
        startPlay(moveIndex, newSpeed);
      }
    },
    [isPlaying, moveIndex, startPlay],
  );

  const handleMoveClick = useCallback(
    (idx: number) => {
      stopPlay();
      setMoveIndex(idx);
    },
    [stopPlay],
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowUp') handleFirst();
      else if (e.key === 'ArrowDown') handleLast();
      else if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlePrev, handleNext, handleFirst, handleLast, handlePlayPause]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error === 'Failed to load game' ? 'Move history unavailable' : error}</Alert>
        <Button startIcon={<ArrowBackIcon />} sx={{ mt: 2 }} onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </Box>
    );
  }

  if (!currentGame) return null;

  const res = resultLabel(currentGame.result, currentGame.terminationReason);
  const duration = formatDuration(currentGame.createdAt, currentGame.completedAt || currentGame.updatedAt);
  const tc = formatTimeControl(currentGame.timeControl);
  const date = new Date(currentGame.completedAt || currentGame.updatedAt).toLocaleString();

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          size="small"
          onClick={() => navigate('/history')}
          variant="outlined"
        >
          History
        </Button>
        <Typography variant="h6" sx={{ fontWeight: 700, flex: 1 }}>
          {currentGame.whitePlayer.name} vs {currentGame.blackPlayer.name}
        </Typography>
        <Tooltip title="Flip board">
          <IconButton onClick={() => setIsFlipped((f) => !f)} size="small">
            <SwapVertIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Game meta */}
      <Paper elevation={1} sx={{ p: 1.5, mb: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Chip label={res.text} color={res.color} size="small" />
          <Chip label={currentGame.mode} size="small" variant="outlined" />
          <Chip label={`${totalMoves} moves`} size="small" variant="outlined" />
          <Chip label={tc} size="small" variant="outlined" />
          <Chip label={duration} size="small" variant="outlined" />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {date}
          </Typography>
        </Box>
      </Paper>

      {/* Main layout */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { md: 'flex-start' },
        }}
      >
        {/* Board + controls */}
        <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: 480, lg: 560 } }}>
          <ReplayBoard fen={currentFen} lastMove={lastMove} isFlipped={isFlipped} />
          <Paper elevation={2} sx={{ mt: 1 }}>
            <ReplayControls
              currentMoveIndex={moveIndex}
              totalMoves={totalMoves}
              isPlaying={isPlaying}
              speed={speed}
              onFirst={handleFirst}
              onPrev={handlePrev}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onLast={handleLast}
              onSpeedChange={handleSpeedChange}
            />
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}>
            Use ← → arrow keys or Space to navigate
          </Typography>
        </Box>

        {/* Right panel: players + move list */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0, minHeight: { md: 540 } }}>
          {/* Player info */}
          <Paper elevation={2} sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">White</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {currentGame.whitePlayer.name}
                </Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary' }}>vs</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">Black</Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {currentGame.blackPlayer.name}
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Chip label={res.text} color={res.color} size="small" />
            </Box>
          </Paper>

          {/* Move list */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: { md: 380 } }}>
            <ReplayMoveList
              moves={moves}
              currentMoveIndex={moveIndex}
              onMoveClick={handleMoveClick}
            />
          </Box>

          {/* Move counter */}
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            {moveIndex === -1 ? 'Starting position' : `Move ${moveIndex + 1} of ${totalMoves}`}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default GameReplayPage;
