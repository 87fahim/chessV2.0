import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import FirstPageIcon from '@mui/icons-material/FirstPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchHistoryGame, clearCurrentGame } from '../features/savedGames/savedGamesSlice';
import ReplayBoard from '../components/chess/ReplayBoard';
import ReplayMoveList from '../components/chess/ReplayMoveList';
import BoardLayout from '../components/chess/BoardLayout';
import ZoomControls from '../components/chess/ZoomControls';
import {
  controlBarPaperSx,
  controlBarRowSx,
  controlBarTitleSx,
  controlDividerSx,
  controlIconButtonSx,
  controlIconSx,
} from '../components/chess/controlBarStyles';
import { useBoardZoom } from '../hooks/useBoardZoom';
import { useGameSounds } from '../hooks/useGameSounds';

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type ReplaySpeed = 0.5 | 1 | 2 | 4;

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
  const zoom = useBoardZoom();
  const { playMoveOutcome } = useGameSounds();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentGame, isLoading, error } = useAppSelector((s) => s.savedGames);
  const defaultBoardFlipped = useAppSelector((s) => s.settings.data.boardFlipped === true);

  // Replay state
  const [moveIndex, setMoveIndex] = useState(-1); // -1 = starting position
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [isFlipped, setIsFlipped] = useState(defaultBoardFlipped);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousMoveIndexRef = useRef(moveIndex);
  const currentGameId = currentGame?._id;

  useEffect(() => {
    if (id) dispatch(fetchHistoryGame(id));
    return () => {
      dispatch(clearCurrentGame());
    };
  }, [dispatch, id]);

  // Reset replay position when game loads
  useEffect(() => {
    if (currentGameId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMoveIndex(-1);
      setIsPlaying(false);
      setIsFlipped(defaultBoardFlipped);
    }
  }, [currentGameId, defaultBoardFlipped]);

  const moves = useMemo(() => currentGame?.moves ?? [], [currentGame?.moves]);
  const totalMoves = moves.length;

  // Build position array: index 0 = start, index i+1 = after moves[i]
  const positions: string[] = [STARTING_FEN];
  for (const m of moves) {
    positions.push(m.fenAfter);
  }

  const currentFen = positions[moveIndex + 1] ?? STARTING_FEN;
  const lastMove = moveIndex >= 0 ? { from: moves[moveIndex].from, to: moves[moveIndex].to } : null;

  // Play move/capture/check sounds when replay advances forward.
  useEffect(() => {
    const previousIndex = previousMoveIndexRef.current;
    previousMoveIndexRef.current = moveIndex;

    if (moveIndex < 0 || moveIndex <= previousIndex) {
      return;
    }

    const move = moves[moveIndex];
    if (!move?.san) {
      return;
    }

    playMoveOutcome({
      san: move.san,
      captured: move.san.includes('x'),
      promotion: move.san.includes('=') ? 'q' : undefined,
      isCheck: move.san.includes('+') && !move.san.includes('#'),
      isCheckmate: move.san.includes('#'),
    });
  }, [moveIndex, moves, playMoveOutcome]);

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

  const atStart = moveIndex === -1;
  const atEnd = moveIndex === totalMoves - 1;

  return (
    <BoardLayout
      panelWidth={420}
      boardColRef={zoom.boardColRef}
      boardWidth={zoom.boardWidth}
      board={<>
        <ReplayBoard fen={currentFen} lastMove={lastMove} isFlipped={isFlipped} />
        <Paper elevation={2} sx={controlBarPaperSx}>
          <Typography variant="subtitle2" color="text.secondary" sx={controlBarTitleSx}>
            Controls
          </Typography>

          <Box sx={controlBarRowSx}>
            <Tooltip title="Back to History">
              <IconButton aria-label="Back to history" onClick={() => navigate('/history')} sx={controlIconButtonSx}>
                <ArrowBackIcon sx={controlIconSx} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Flip board">
              <IconButton aria-label="Flip board" onClick={() => setIsFlipped((f) => !f)} sx={controlIconButtonSx}>
                <SwapVertIcon sx={controlIconSx} />
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={controlDividerSx} />

            <Tooltip title="First move">
              <span>
                <IconButton aria-label="First move" onClick={handleFirst} disabled={atStart} color="primary" sx={controlIconButtonSx}>
                  <FirstPageIcon sx={controlIconSx} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Previous move (←)">
              <span>
                <IconButton aria-label="Previous move" onClick={handlePrev} disabled={atStart} color="primary" sx={controlIconButtonSx}>
                  <ChevronLeftIcon sx={controlIconSx} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
              <span>
                <IconButton
                  aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                  onClick={handlePlayPause}
                  disabled={totalMoves === 0}
                  color="primary"
                  sx={{
                    ...controlIconButtonSx,
                    p: { xs: 0.55, lg: 1 },
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderColor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark', borderColor: 'primary.dark' },
                    '&:disabled': { bgcolor: 'action.disabledBackground', borderColor: 'divider' },
                  }}
                >
                  {isPlaying ? <PauseIcon sx={controlIconSx} /> : <PlayArrowIcon sx={controlIconSx} />}
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Next move (→)">
              <span>
                <IconButton aria-label="Next move" onClick={handleNext} disabled={atEnd} color="primary" sx={controlIconButtonSx}>
                  <ChevronRightIcon sx={controlIconSx} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Last move">
              <span>
                <IconButton aria-label="Last move" onClick={handleLast} disabled={atEnd} color="primary" sx={controlIconButtonSx}>
                  <LastPageIcon sx={controlIconSx} />
                </IconButton>
              </span>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={controlDividerSx} />

            <Select
              value={speed}
              onChange={(e) => handleSpeedChange(Number(e.target.value) as ReplaySpeed)}
              size="small"
              sx={{
                fontSize: { xs: '0.7rem', lg: '0.9rem' },
                minWidth: { xs: 58, lg: 78 },
                minHeight: { xs: 30, lg: 42 },
              }}
            >
              <MenuItem value={0.5}>0.5×</MenuItem>
              <MenuItem value={1}>1×</MenuItem>
              <MenuItem value={2}>2×</MenuItem>
              <MenuItem value={4}>Fast</MenuItem>
            </Select>

            <ZoomControls
              onZoomIn={zoom.handleZoomIn}
              onZoomOut={zoom.handleZoomOut}
              canZoomIn={zoom.canZoomIn}
              canZoomOut={zoom.canZoomOut}
              zoomPercent={zoom.zoomPercent}
            />
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            ← → arrow keys · Space to play/pause
          </Typography>
        </Paper>
      </>}
      panel={<>
        {/* Status card */}
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.95rem', lg: '1.28rem' }, fontWeight: 700 }}
          >
            Status
          </Typography>

          <Chip
            label={res.text}
            color={res.color}
            sx={{ mt: 0.75, fontWeight: 700, fontSize: { xs: '0.85rem', lg: '1rem' } }}
          />

          <Divider sx={{ my: 1.25 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" color="text.secondary">White</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentGame.whitePlayer.name}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>vs</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">Black</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{currentGame.blackPlayer.name}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1.25 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip label={currentGame.mode} size="small" variant="outlined" />
            <Chip label={tc} size="small" variant="outlined" />
            {duration !== '—' && <Chip label={duration} size="small" variant="outlined" />}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            {date}
          </Typography>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {moveIndex === -1 ? 'Starting position' : `Move ${moveIndex + 1} of ${totalMoves}`}
          </Typography>
        </Paper>

        {/* Moves */}
        <ReplayMoveList
          moves={moves}
          currentMoveIndex={moveIndex}
          onMoveClick={handleMoveClick}
        />
      </>}
    />
  );
};

export default GameReplayPage;
