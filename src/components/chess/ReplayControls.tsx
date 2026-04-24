import React from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LastPageIcon from '@mui/icons-material/LastPage';

export type ReplaySpeed = 0.5 | 1 | 2 | 4;

interface ReplayControlsProps {
  currentMoveIndex: number;
  totalMoves: number;
  isPlaying: boolean;
  speed: ReplaySpeed;
  onFirst: () => void;
  onPrev: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  onLast: () => void;
  onSpeedChange: (speed: ReplaySpeed) => void;
}

const ReplayControls: React.FC<ReplayControlsProps> = ({
  currentMoveIndex,
  totalMoves,
  isPlaying,
  speed,
  onFirst,
  onPrev,
  onPlayPause,
  onNext,
  onLast,
  onSpeedChange,
}) => {
  const atStart = currentMoveIndex === -1;
  const atEnd = currentMoveIndex === totalMoves - 1;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        py: 1,
        px: 1,
        flexWrap: 'wrap',
      }}
    >
      <Tooltip title="First move">
        <span>
          <IconButton onClick={onFirst} disabled={atStart} size="small" color="primary">
            <FirstPageIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Previous move">
        <span>
          <IconButton onClick={onPrev} disabled={atStart} size="small" color="primary">
            <ChevronLeftIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
        <span>
          <IconButton
            onClick={onPlayPause}
            disabled={totalMoves === 0}
            size="medium"
            color="primary"
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, '&:disabled': { bgcolor: 'action.disabledBackground' } }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Next move">
        <span>
          <IconButton onClick={onNext} disabled={atEnd} size="small" color="primary">
            <ChevronRightIcon />
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Last move">
        <span>
          <IconButton onClick={onLast} disabled={atEnd} size="small" color="primary">
            <LastPageIcon />
          </IconButton>
        </span>
      </Tooltip>

      <FormControl size="small" sx={{ minWidth: 80, ml: 1 }}>
        <InputLabel id="replay-speed-label" sx={{ fontSize: '0.75rem' }}>Speed</InputLabel>
        <Select<ReplaySpeed>
          labelId="replay-speed-label"
          value={speed}
          label="Speed"
          onChange={(e) => onSpeedChange(e.target.value as ReplaySpeed)}
          sx={{ fontSize: '0.8rem' }}
        >
          <MenuItem value={0.5}>0.5×</MenuItem>
          <MenuItem value={1}>1×</MenuItem>
          <MenuItem value={2}>2×</MenuItem>
          <MenuItem value={4}>Fast</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default ReplayControls;
