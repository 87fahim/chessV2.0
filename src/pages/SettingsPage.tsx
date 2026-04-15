import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { saveSettings, setLocalSetting } from '../features/settings/settingsSlice';
import { logout } from '../features/auth/authSlice';

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: settings, isSaving } = useAppSelector((s) => s.settings);
  const { user, isAuthenticated, isGuest } = useAppSelector((s) => s.auth);

  const handleChange = (key: string, value: unknown) => {
    dispatch(setLocalSetting({ [key]: value }));
    if (isAuthenticated) {
      dispatch(saveSettings({ [key]: value }));
    }
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/'));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', lg: '2.4rem' }, flex: 1 }}>
          Settings
        </Typography>
        {isSaving && <CircularProgress size={20} />}
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', lg: '1.3rem' } }} gutterBottom>
          Game Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Difficulty</InputLabel>
          <Select
            value={settings.defaultDifficulty || 'medium'}
            label="Default Difficulty"
            onChange={(e) => handleChange('defaultDifficulty', e.target.value)}
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
            onChange={(e) => handleChange('preferredColor', e.target.value)}
          >
            <MenuItem value="white">White</MenuItem>
            <MenuItem value="black">Black</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Time Control</InputLabel>
          <Select
            value={settings.defaultTimeControl || '10+0'}
            label="Default Time Control"
            onChange={(e) => handleChange('defaultTimeControl', e.target.value)}
          >
            <MenuItem value="1+0">1 min</MenuItem>
            <MenuItem value="3+0">3 min</MenuItem>
            <MenuItem value="3+2">3+2</MenuItem>
            <MenuItem value="5+0">5 min</MenuItem>
            <MenuItem value="5+3">5+3</MenuItem>
            <MenuItem value="10+0">10 min</MenuItem>
            <MenuItem value="15+10">15+10</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={settings.soundEnabled ?? true}
              onChange={(e) => handleChange('soundEnabled', e.target.checked)}
            />
          }
          label="Enable Sound Effects"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.animationEnabled ?? true}
              onChange={(e) => handleChange('animationEnabled', e.target.checked)}
            />
          }
          label="Enable Animations"
        />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', lg: '1.3rem' } }} gutterBottom>
          Board Appearance
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Board Theme</InputLabel>
          <Select
            value={settings.boardTheme || 'classic'}
            label="Board Theme"
            onChange={(e) => handleChange('boardTheme', e.target.value)}
          >
            <MenuItem value="classic">Classic</MenuItem>
            <MenuItem value="wood">Wood</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Piece Style</InputLabel>
          <Select
            value={settings.pieceTheme || 'default'}
            label="Piece Style"
            onChange={(e) => handleChange('pieceTheme', e.target.value)}
          >
            <MenuItem value="default">Default</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={settings.showCoordinates ?? false}
              onChange={(e) => handleChange('showCoordinates', e.target.checked)}
            />
          }
          label="Show Board Coordinates"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.boardFlipped ?? false}
              onChange={(e) => handleChange('boardFlipped', e.target.checked)}
            />
          }
          label="Flip Board by Default"
        />
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '1rem', lg: '1.3rem' } }} gutterBottom>
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
              You&apos;re playing as a guest. Sign up to save your games and track your progress!
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
