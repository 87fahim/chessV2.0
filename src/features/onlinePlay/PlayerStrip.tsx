import React from 'react';
import { Avatar, Box, Paper, Typography } from '@mui/material';
import { LOW_TIME_MS, formatClockTime } from './onlinePlayUtils';

const COMPACT_QUERY = '@media (max-height: 760px)';

interface PlayerStripProps {
  name: string;
  capturedCount: number;
  clockMs: number | null;
  active: boolean;
  isSelf: boolean;
  gameEnded: boolean;
  /** undefined = don't show an online indicator (used for self) */
  online?: boolean;
  countdown?: number | null;
}

const PlayerStrip: React.FC<PlayerStripProps> = ({
  name,
  capturedCount,
  clockMs,
  active,
  isSelf,
  gameEnded,
  online,
  countdown,
}) => {
  const isLowTime = clockMs !== null && clockMs > 0 && clockMs <= LOW_TIME_MS;

  return (
    <Paper
      sx={{
        width: '100%',
        maxWidth: '100%',
        mx: 'auto',
        px: { xs: 1, sm: 1.5 },
        py: { xs: 0.75, sm: 1 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { xs: 1, sm: 2 },
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        boxShadow: active ? 3 : 1,
        [COMPACT_QUERY]: {
          px: 0.5,
          py: 0,
          gap: 0.5,
          minHeight: 24,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 0.75, sm: 1.25 },
          minWidth: 0,
          flex: '1 1 auto',
          [COMPACT_QUERY]: { gap: 0.5 },
        }}
      >
        <Box sx={{ position: 'relative', [COMPACT_QUERY]: { display: 'none' } }}>
          <Avatar sx={{ width: { xs: 30, sm: 34 }, height: { xs: 30, sm: 34 }, bgcolor: isSelf ? 'primary.main' : 'grey.700', fontSize: { xs: '0.82rem', sm: '0.95rem' } }}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
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
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              [COMPACT_QUERY]: {
                fontSize: '0.78rem',
                lineHeight: 1.15,
              },
            }}
            noWrap
          >
            {name}
            {online === false && !gameEnded && (
              <Typography component="span" variant="caption" color="error.main" sx={{ ml: 0.5, [COMPACT_QUERY]: { display: 'none' } }}>
                {countdown != null ? `(disconnected ... ${countdown})` : '(disconnected)'}
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.72rem', sm: '0.75rem' }, [COMPACT_QUERY]: { display: 'none' } }}>
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
            fontSize: { xs: '0.98rem', sm: '1.25rem' },
            color: isLowTime ? 'error.main' : active ? 'primary.main' : 'text.primary',
            lineHeight: 1,
            [COMPACT_QUERY]: {
              fontSize: '0.88rem',
            },
          }}
        >
          {clockMs === null ? '--:--' : formatClockTime(clockMs)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default PlayerStrip;
