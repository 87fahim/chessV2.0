import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

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
      gap: 0.25,
      ml: { xs: 0, sm: 'auto' },
      flex: '0 0 auto',
    }}
  >
    <Tooltip title="Zoom out">
      {/* span needed so Tooltip works on a disabled button */}
      <span>
        <IconButton
          size="small"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: '2px' }}
        >
          <RemoveIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </span>
    </Tooltip>

    <Typography
      variant="caption"
      sx={{
        minWidth: 30,
        textAlign: 'center',
        userSelect: 'none',
        fontSize: '0.64rem',
        color: 'text.secondary',
      }}
    >
      {zoomPercent}%
    </Typography>

    <Tooltip title="Zoom in">
      <span>
        <IconButton
          size="small"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: '2px' }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </span>
    </Tooltip>
  </Box>
);

export default ZoomControls;
