import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { saveSettings, setLocalSetting } from '../features/settings/settingsSlice';
import { logout } from '../features/auth/authSlice';
import { fetchRecentActivity } from '../features/auth/userSlice';

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: settings, isSaving } = useAppSelector((state) => state.settings);
  const { user, isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { stats, recentActivities, isLoading: userLoading } = useAppSelector((state) => state.userDomain);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    dispatch(fetchRecentActivity(12));
  }, [dispatch, isAuthenticated]);

  const handleSettingsChange = (key: string, value: unknown) => {
    dispatch(setLocalSetting({ [key]: value }));
    if (isAuthenticated) {
      dispatch(saveSettings({ [key]: value }));
    }
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/'));
  };

  const statPairs = useMemo(
    () => [
      ['Games Played', stats?.gamesPlayed ?? 0],
      ['Wins', stats?.wins ?? 0],
      ['Losses', stats?.losses ?? 0],
      ['Draws', stats?.draws ?? 0],
      ['Online Games', stats?.onlineGamesPlayed ?? 0],
      ['Practice Sessions', stats?.practiceSessions ?? 0],
      ['Analysis Requests', stats?.analysisRequests ?? 0],
    ],
    [stats],
  );

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', lg: '2.1rem' }, flex: 1 }}>
          Settings
        </Typography>
        {(isSaving || userLoading) && <CircularProgress size={20} />}
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Game Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Difficulty</InputLabel>
          <Select
            value={settings.defaultDifficulty || 'medium'}
            label="Default Difficulty"
            onChange={(e) => handleSettingsChange('defaultDifficulty', e.target.value)}
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Color</InputLabel>
          <Select
            value={settings.preferredColor || 'white'}
            label="Default Color"
            onChange={(e) => handleSettingsChange('preferredColor', e.target.value)}
          >
            <MenuItem value="white">White</MenuItem>
            <MenuItem value="black">Black</MenuItem>
            <MenuItem value="random">Random</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Time Control</InputLabel>
          <Select
            value={settings.defaultTimeControl || '10+0'}
            label="Default Time Control"
            onChange={(e) => handleSettingsChange('defaultTimeControl', e.target.value)}
          >
            <MenuItem value="1+0">1+0</MenuItem>
            <MenuItem value="3+0">3+0</MenuItem>
            <MenuItem value="3+2">3+2</MenuItem>
            <MenuItem value="5+0">5+0</MenuItem>
            <MenuItem value="10+0">10+0</MenuItem>
            <MenuItem value="15+10">15+10</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel control={<Switch checked={settings.soundEnabled ?? true} onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)} />} label="Enable Sound" />
        <FormControlLabel control={<Switch checked={settings.animationEnabled ?? true} onChange={(e) => handleSettingsChange('animationEnabled', e.target.checked)} />} label="Enable Animation" />
        <FormControlLabel control={<Switch checked={settings.autoPromotion ?? true} onChange={(e) => handleSettingsChange('autoPromotion', e.target.checked)} />} label="Auto Promotion" />
        <FormControlLabel control={<Switch checked={settings.moveConfirmation ?? false} onChange={(e) => handleSettingsChange('moveConfirmation', e.target.checked)} />} label="Move Confirmation" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Board And UI
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Board Theme</InputLabel>
          <Select value={settings.boardTheme || 'classic'} label="Board Theme" onChange={(e) => handleSettingsChange('boardTheme', e.target.value)}>
            <MenuItem value="classic">Classic</MenuItem>
            <MenuItem value="wood">Wood</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel control={<Switch checked={settings.showCoordinates ?? false} onChange={(e) => handleSettingsChange('showCoordinates', e.target.checked)} />} label="Show Coordinates" />
        <FormControlLabel control={<Switch checked={settings.showLegalMoves ?? true} onChange={(e) => handleSettingsChange('showLegalMoves', e.target.checked)} />} label="Show Legal Moves" />
        <FormControlLabel control={<Switch checked={settings.highlightLastMove ?? true} onChange={(e) => handleSettingsChange('highlightLastMove', e.target.checked)} />} label="Highlight Last Move" />
        <FormControlLabel control={<Switch checked={settings.highlightCheck ?? true} onChange={(e) => handleSettingsChange('highlightCheck', e.target.checked)} />} label="Highlight Check" />
        <FormControlLabel control={<Switch checked={settings.boardFlipped ?? false} onChange={(e) => handleSettingsChange('boardFlipped', e.target.checked)} />} label="Flip Board By Default" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Notifications
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControlLabel control={<Switch checked={settings.inviteNotifications ?? true} onChange={(e) => handleSettingsChange('inviteNotifications', e.target.checked)} />} label="Invite Notifications" />
        <FormControlLabel control={<Switch checked={settings.matchNotifications ?? true} onChange={(e) => handleSettingsChange('matchNotifications', e.target.checked)} />} label="Match Notifications" />
        <FormControlLabel control={<Switch checked={settings.emailNotifications ?? false} onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)} />} label="Email Notifications" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Profile And Social
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Profile identity, friends, blocks, invites, and privacy controls now live on dedicated pages.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={() => navigate('/profile')} disabled={!isAuthenticated}>
            Open Profile
          </Button>
          <Button variant="outlined" onClick={() => navigate('/social')} disabled={!isAuthenticated}>
            Open Social
          </Button>
        </Box>
        {!isAuthenticated && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Sign in to access profile and social management.
          </Alert>
        )}
      </Paper>

      {isAuthenticated && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            Stats And Activity
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1, mb: 2 }}>
            {statPairs.map(([label, value]) => (
              <Paper key={label} variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Recent Activity
          </Typography>
          {recentActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent activity yet.
            </Typography>
          ) : (
            recentActivities.slice(0, 8).map((event, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                {(event.activityType as string) || 'event'} via {(event.feature as string) || 'system'}
              </Typography>
            ))
          )}
        </Paper>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Account
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {isAuthenticated && user ? (
          <Box>
            <Typography variant="body1" sx={{ mb: 0.5 }}>
              <strong>Username:</strong> {user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {user.email}
            </Typography>
            <Button variant="outlined" color="error" onClick={handleLogout}>
              Sign Out
            </Button>
          </Box>
        ) : isGuest ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              You are playing as a guest. Sign up to save games and progress.
            </Alert>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={() => navigate('/register')}>
                Create Account
              </Button>
              <Button variant="outlined" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </Box>
          </Box>
        ) : (
          <Button variant="contained" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default SettingsPage;
