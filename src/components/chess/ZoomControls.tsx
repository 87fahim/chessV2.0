import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { controlIconButtonSx, controlIconSx } from './controlBarStyles';

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  zoomPercent: number;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomIn,
  onZoomOut,
  canZoomIn,
  canZoomOut,
  zoomPercent,
}) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: { xs: 0.35, lg: 0.6 },
      ml: { xs: 0, sm: 'auto' },
      flex: '0 0 auto',
    }}
  >
    <Tooltip title="Zoom out">
      <span>
        <IconButton
          onClick={onZoomOut}
          disabled={!canZoomOut}
          sx={controlIconButtonSx}
        >
          <RemoveIcon sx={controlIconSx} />
        </IconButton>
      </span>
    </Tooltip>

    <Typography
      variant="caption"
      sx={{
        minWidth: { xs: 30, lg: 44 },
        textAlign: 'center',
        userSelect: 'none',
        fontSize: { xs: '0.68rem', lg: '0.9rem' },
        fontWeight: 700,
        color: 'text.secondary',
      }}
    >
      {zoomPercent}%
    </Typography>

    <Tooltip title="Zoom in">
      <span>
        <IconButton
          onClick={onZoomIn}
          disabled={!canZoomIn}
          sx={controlIconButtonSx}
        >
          <AddIcon sx={controlIconSx} />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
);

export default ZoomControls;
