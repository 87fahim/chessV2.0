import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ActivityListItem from './ActivityListItem';
import type { ActivityRecord, HistoryGameRecord, StatCardConfig } from './activityHelpers';
import {
  formatTimeControlLabel,
  getActivityDetailRows,
  getActivitySummary,
  getActivityTitle,
  getGameOutcomeColor,
  getGameOutcomeLabel,
  startCase,
} from './activityHelpers';

export function AllActivityDialog({
  open,
  activities,
  onClose,
  onSelect,
}: {
  open: boolean;
  activities: ActivityRecord[];
  onClose: () => void;
  onSelect: (activity: ActivityRecord) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Recent Activity</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ maxHeight: { xs: 360, sm: 440 }, overflowY: 'auto', p: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {activities.map((activity, index) => (
              <ActivityListItem
                key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`}
                activity={activity}
                onClick={() => onSelect(activity)}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function StatDetailsDialog({
  stat,
  games,
  activities,
  isLoading,
  error,
  userId,
  username,
  onClose,
  onReviewGame,
  onOpenFullHistory,
}: {
  stat: StatCardConfig | null;
  games: HistoryGameRecord[];
  activities: ActivityRecord[];
  isLoading: boolean;
  error: string | null;
  userId?: string;
  username?: string;
  onClose: () => void;
  onReviewGame: (gameId: string) => void;
  onOpenFullHistory: () => void;
}) {
  return (
    <Dialog open={!!stat} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{stat?.label ?? 'Details'}</DialogTitle>
      <DialogContent dividers>
        {stat && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stat.description}
          </Typography>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : stat?.source === 'history' ? (
          games.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No matching games yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {games.map((game) => (
                <Paper key={game._id} variant="outlined" sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {game.whitePlayer.name} vs {game.blackPlayer.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {new Date(game.completedAt || game.updatedAt).toLocaleString()}
                      </Typography>
                      <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip label={getGameOutcomeLabel(game, userId, username)} color={getGameOutcomeColor(game, userId, username)} size="small" />
                        <Chip label={startCase(game.mode)} size="small" variant="outlined" />
                        <Chip label={`${game.moves.length} moves`} size="small" variant="outlined" />
                        <Chip label={formatTimeControlLabel(game.timeControl)} size="small" variant="outlined" />
                        {game.terminationReason && (
                          <Chip label={startCase(game.terminationReason)} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                    <Button size="small" variant="outlined" onClick={() => onReviewGame(game._id)}>
                      Review
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )
        ) : activities.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No matching activity yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activities.map((activity, index) => (
              <Paper key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`} variant="outlined" sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {getActivityTitle(activity)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {getActivitySummary(activity)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {stat?.source === 'history' && (
          <Button onClick={onOpenFullHistory}>
            Open Full History
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ActivityDetailsDialog({
  activity,
  onClose,
  onReviewGame,
}: {
  activity: ActivityRecord | null;
  onClose: () => void;
  onReviewGame: (gameId: string) => void;
}) {
  return (
    <Dialog open={!!activity} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{activity ? getActivityTitle(activity) : 'Activity Details'}</DialogTitle>
      <DialogContent dividers>
        {activity && (
          <Stack spacing={1.25}>
            {getActivityDetailRows(activity).map((row) => (
              <Box key={`${row.label}-${row.value}`}>
                <Typography variant="caption" color="text.secondary">
                  {row.label}
                </Typography>
                <Typography variant="body2">{row.value}</Typography>
              </Box>
            ))}

            {activity.fen && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  FEN
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    mt: 0.5,
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    overflowX: 'auto',
                  }}
                >
                  {activity.fen}
                </Paper>
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {activity?.gameId && (
          <Button onClick={() => onReviewGame(activity.gameId!)}>
            Review Game
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
