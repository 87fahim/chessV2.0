import React from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { ActivityRecord } from './activityHelpers';
import { getActivitySummary, getActivityTitle, startCase } from './activityHelpers';

interface ActivityListItemProps {
  activity: ActivityRecord;
  onClick: () => void;
  /** Adds a subtle lift on hover (used in the page list, not dialogs) */
  hoverLift?: boolean;
}

const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity, onClick, hoverLift = false }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    sx={{
      all: 'unset',
      display: 'block',
      width: '100%',
      cursor: 'pointer',
    }}
  >
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 0.85, sm: 1 },
        textAlign: 'left',
        transition: hoverLift ? 'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease' : undefined,
        '&:hover': {
          ...(hoverLift ? { transform: 'translateY(-1px)' } : {}),
          boxShadow: 2,
          borderColor: 'primary.main',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.84rem', sm: '0.9rem' } }}>
            {getActivityTitle(activity)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2, fontSize: { xs: '0.74rem', sm: '0.8rem' }, lineHeight: 1.2 }}>
            {getActivitySummary(activity)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.4} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={startCase(activity.feature || 'system')} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.65, fontSize: '0.64rem' } }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
            {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  </Box>
);

export default ActivityListItem;
