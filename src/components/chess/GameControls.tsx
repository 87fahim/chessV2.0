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
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
      <Tooltip title="Undo">
        <span>
          <IconButton onClick={onUndo} disabled={!canUndo} size="small">
            <UndoIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Flip Board">
        <IconButton onClick={onFlip} size="small">
          <SwapVertIcon />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Button variant="outlined" size="small" startIcon={<RestartAltIcon />} onClick={onNewGame}>
        New Game
      </Button>
      {isPlaying && (
        <Button variant="outlined" color="error" size="small" startIcon={<FlagIcon />} onClick={onResign}>
          Resign
        </Button>
      )}
      {zoomControls}
    </Box>
  );
};

export default GameControls;
