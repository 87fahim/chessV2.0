import React from 'react';
import { Box, Button, IconButton, Tooltip, Divider } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FlagIcon from '@mui/icons-material/Flag';
import {
  controlBarRowSx,
  controlDividerSx,
  controlIconButtonSx,
  controlIconSx,
  controlOutlinedButtonSx,
} from './controlBarStyles';

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
    <Box sx={controlBarRowSx}>
      <Tooltip title="Undo">
        <span>
          <IconButton onClick={onUndo} disabled={!canUndo} sx={controlIconButtonSx}>
            <UndoIcon sx={controlIconSx} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Flip Board">
        <IconButton onClick={onFlip} sx={controlIconButtonSx}>
          <SwapVertIcon sx={controlIconSx} />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={controlDividerSx} />
      <Button
        variant="outlined"
        startIcon={<RestartAltIcon />}
        onClick={onNewGame}
        sx={controlOutlinedButtonSx}
      >
        New
      </Button>
      {isPlaying && (
        <Button
          variant="outlined"
          color="error"
          startIcon={<FlagIcon />}
          onClick={onResign}
          sx={controlOutlinedButtonSx}
        >
          Resign
        </Button>
      )}
      {zoomControls}
    </Box>
  );
};

export default GameControls;
