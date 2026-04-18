import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Paper, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchUserSummary, saveUserProfile } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { profile, account, stats, isLoading, isSaving } = useAppSelector((state) => state.userDomain);

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    dispatch(fetchUserSummary());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setDisplayName(profile.displayName || '');
    setAvatarUrl(profile.avatarUrl || '');
    setBio(profile.bio || '');
    setCountry(profile.country || '');
    setTimezone(profile.timezone || '');
    setLanguage(profile.language || 'en');
  }, [profile]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, maxWidth: 760 }}>
        <Alert severity={isGuest ? 'info' : 'warning'}>
          {isGuest ? 'Guest accounts do not have a persistent profile.' : 'Sign in to manage your profile.'}
        </Alert>
        {!isGuest && (
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/login')}>
            Sign In
          </Button>
        )}
      </Box>
    );
  }

  const handleSave = () => {
    dispatch(
      saveUserProfile({
        displayName,
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
        country: country || undefined,
        timezone: timezone || undefined,
        language: language || 'en',
      }),
    );
  };

  return (
    <Box sx={{ p: 3, maxWidth: 840 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, flex: 1 }}>
          Profile
        </Typography>
        {(isLoading || isSaving) && <CircularProgress size={20} />}
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Public Profile
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} size="small" fullWidth />
          <TextField label="Avatar URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} size="small" fullWidth />
          <TextField label="Country / Region" value={country} onChange={(e) => setCountry(e.target.value)} size="small" fullWidth />
          <TextField label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} size="small" fullWidth />
          <TextField label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} size="small" fullWidth />
          <TextField
            label="Friend Code"
            value={profile?.friendCode || ''}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={3}
            sx={{ gridColumn: { md: 'span 2' } }}
          />
        </Box>
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleSave}>
          Save Profile
        </Button>
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Visibility
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Profile visibility: {profile?.profileVisibility || 'public'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Online visibility: {profile?.onlineVisibility || 'everyone'}
        </Typography>
        <Typography variant="body2">
          Identity mode: {profile?.identityDisplayMode || 'display_name'}
        </Typography>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Account Snapshot
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Status: {account?.status || 'unknown'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Role: {account?.role || 'user'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Email verified: {account?.emailVerified ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Last login: {account?.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : 'Not available'}
        </Typography>
        <Typography variant="body2">
          Total games: {stats?.gamesPlayed ?? 0}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ProfilePage;
