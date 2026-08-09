import React from 'react';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import ActivityListItem from './ActivityListItem';
import type { ActivityRecord } from './activityHelpers';

interface RecentActivitySectionProps {
  previewItems: ActivityRecord[];
  totalCount: number;
  onSelect: (activity: ActivityRecord) => void;
  onShowAll: () => void;
}

const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  previewItems,
  totalCount,
  onSelect,
  onShowAll,
}) => (
  <Paper elevation={2} sx={{ p: { xs: 1.25, sm: 1.5 }, mb: { xs: 2, sm: 3 } }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
      Recent Activity
    </Typography>
    <Divider sx={{ mb: 1.25 }} />

    {totalCount === 0 ? (
      <Typography variant="body2" color="text.secondary">
        No recent activity yet.
      </Typography>
    ) : (
      <>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          {previewItems.map((activity, index) => (
            <ActivityListItem
              key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`}
              activity={activity}
              onClick={() => onSelect(activity)}
              hoverLift
            />
          ))}
        </Box>

        {totalCount > 3 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button size="small" onClick={onShowAll}>
              More
            </Button>
          </Box>
        )}
      </>
    )}
  </Paper>
);

export default RecentActivitySection;
