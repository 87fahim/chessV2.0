import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { TIME_CONTROLS, type TimeControlValue } from './onlinePlayUtils';

const toggleGroupSx = (columns: { xs: string; sm?: string }): SxProps<Theme> => ({
  display: 'grid',
  gridTemplateColumns: columns.sm ? { xs: columns.xs, sm: columns.sm } : columns.xs,
  gap: 0.5,
  width: '100%',
  '& .MuiToggleButtonGroup-grouped': {
    m: 0,
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
  },
  '& .MuiToggleButton-root': {
    px: 1,
    py: 0.85,
    whiteSpace: 'nowrap',
    fontSize: { xs: '0.75rem', sm: '0.85rem' },
  },
});

interface OnlineLobbyProps {
  isConnected: boolean;
  isCheckingSession: boolean;
  isInQueue: boolean;
  error: string | null;
  selectedTC: TimeControlValue;
  preferredColor: 'random' | 'white' | 'black';
  onClearError: () => void;
  onSelectTimeControl: (value: TimeControlValue) => void;
  onSelectColor: (value: 'random' | 'white' | 'black') => void;
  onJoinQueue: () => void;
  onLeaveQueue: () => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  isConnected,
  isCheckingSession,
  isInQueue,
  error,
  selectedTC,
  preferredColor,
  onClearError,
  onSelectTimeControl,
  onSelectColor,
  onJoinQueue,
  onLeaveQueue,
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: { xs: 'flex-start', sm: 'center' },
      alignItems: { xs: 'stretch', sm: 'center' },
      minHeight: '100%',
      p: { xs: 1.5, sm: 3 },
      boxSizing: 'border-box',
    }}
  >
    <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, maxWidth: 460, width: '100%', textAlign: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Play Online
      </Typography>

      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>Connecting to server...</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={onClearError}>{error}</Alert>}

      {isCheckingSession && !isInQueue && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="caption" color="text.secondary">Checking for active game…</Typography>
        </Box>
      )}

      {isInQueue ? (
        <Box>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 2 }}>Searching for opponent...</Typography>
          <Button variant="outlined" onClick={onLeaveQueue}>Cancel</Button>
        </Box>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Time Control</Typography>
            <ToggleButtonGroup
              value={JSON.stringify(selectedTC)}
              exclusive
              onChange={(_, v) => v && onSelectTimeControl(JSON.parse(v) as TimeControlValue)}
              sx={toggleGroupSx({ xs: 'repeat(3, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' })}
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
              onChange={(_, v) => v && onSelectColor(v)}
              sx={toggleGroupSx({ xs: 'repeat(3, minmax(0, 1fr))' })}
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
            disabled={!isConnected || isCheckingSession}
            onClick={onJoinQueue}
          >
            Find Match
          </Button>
        </>
      )}
    </Paper>
  </Box>
);

export default OnlineLobby;
