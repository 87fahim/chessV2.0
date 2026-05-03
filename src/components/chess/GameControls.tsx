import React from 'react';
import { Box, Button, IconButton, Tooltip, Divider } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FlagIcon from '@mui/icons-material/Flag';

interface GameControlsProps {
  canUndo: boolean;
  isPlaying: boolean;
  onUndo: () => void;
  onFlip: () => void;
  onNewGame: () => void;
  onResign: () => void;
  /** Optional extra controls rendered at the right end of the button row */
  zoomControls?: React.ReactNode;
}

const GameControls: React.FC<GameControlsProps> = ({
  canUndo,
  isPlaying,
  onUndo,
  onFlip,
  onNewGame,
  onResign,
  zoomControls,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        rowGap: 0.5,
        flexWrap: 'wrap',
        alignItems: 'center',
        width: '100%',
        overflowX: 'visible',
      }}
    >
      <Tooltip title="Undo">
        <span>
          <IconButton onClick={onUndo} disabled={!canUndo} size="small" sx={{ p: 0.4 }}>
            <UndoIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Flip Board">
        <IconButton onClick={onFlip} size="small" sx={{ p: 0.4 }}>
          <SwapVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />
      <Button
        variant="outlined"
        size="small"
        startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
        onClick={onNewGame}
        sx={{ minWidth: 0, px: 0.8, py: 0.2, fontSize: '0.72rem', '& .MuiButton-startIcon': { mr: 0.4 } }}
      >
        New
      </Button>
      {isPlaying && (
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<FlagIcon sx={{ fontSize: 16 }} />}
          onClick={onResign}
          sx={{ minWidth: 0, px: 0.8, py: 0.2, fontSize: '0.72rem', '& .MuiButton-startIcon': { mr: 0.4 } }}
        >
          Resign
        </Button>
      )}
      {zoomControls}
    </Box>
  );
};

export default GameControls;
