import React from 'react';
import {
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
import type { UserSettingsData } from '../../services/settingsService';

interface GamePreferencesSectionProps {
  settings: UserSettingsData;
  onChange: (key: string, value: unknown) => void;
}

const GamePreferencesSection: React.FC<GamePreferencesSectionProps> = ({ settings, onChange }) => (
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
        onChange={(e) => onChange('defaultDifficulty', e.target.value)}
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
        onChange={(e) => onChange('preferredColor', e.target.value)}
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
        onChange={(e) => onChange('defaultTimeControl', e.target.value)}
      >
        <MenuItem value="1+0">1 minute</MenuItem>
        <MenuItem value="3+0">3 minutes</MenuItem>
        <MenuItem value="3+2">3 minutes + 2-second increment</MenuItem>
        <MenuItem value="5+0">5 minutes</MenuItem>
        <MenuItem value="10+0">10 minutes</MenuItem>
        <MenuItem value="15+10">15 minutes + 10-second increment</MenuItem>
      </Select>
    </FormControl>

    <FormControlLabel control={<Switch checked={settings.soundEnabled ?? true} onChange={(e) => onChange('soundEnabled', e.target.checked)} />} label="Enable Sounds" />
    <FormControlLabel control={<Switch checked={settings.animationEnabled ?? true} onChange={(e) => onChange('animationEnabled', e.target.checked)} />} label="Enable Animation" />
    <FormControlLabel control={<Switch checked={settings.autoPromotion ?? false} onChange={(e) => onChange('autoPromotion', e.target.checked)} />} label="Auto Promote To Queen" />
    <FormControlLabel control={<Switch checked={settings.moveConfirmation ?? false} onChange={(e) => onChange('moveConfirmation', e.target.checked)} />} label="Move Confirmation" />
  </Paper>
);

export default GamePreferencesSection;
