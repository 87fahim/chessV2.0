import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Divider, Paper, TextField, Typography } from '@mui/material';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchUserSummary, saveUserProfile } from '../features/auth/userSlice';
import { useNavigate } from 'react-router-dom';

type ProfileDraft = {
  displayName: string;
  avatarUrl: string;
  bio: string;
  country: string;
  timezone: string;
  language: string;
};

type ProfileLike = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language?: string;
  friendCode?: string;
  profileVisibility?: string;
  onlineVisibility?: string;
  identityDisplayMode?: string;
};

function buildProfileDraft(profile: ProfileLike | null | undefined): ProfileDraft {
  return {
    displayName: profile?.displayName || '',
    avatarUrl: profile?.avatarUrl || '',
    bio: profile?.bio || '',
    country: profile?.country || '',
    timezone: profile?.timezone || '',
    language: profile?.language || 'en',
  };
}

type ProfileFormProps = {
  profile: ProfileLike | null;
  account: {
    status?: string;
    role?: string;
    emailVerified?: boolean;
    lastLoginAt?: string;
  } | null;
  stats: {
    gamesPlayed?: number;
  } | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (draft: ProfileDraft) => void;
};

const ProfileForm: React.FC<ProfileFormProps> = ({ profile, account, stats, isLoading, isSaving, onSave }) => {
  const [draft, setDraft] = useState<ProfileDraft>(() => buildProfileDraft(profile));

  const handleDraftChange = <K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
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
          <TextField
            label="Display Name"
            value={draft.displayName}
            onChange={(e) => handleDraftChange('displayName', e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Avatar URL"
            value={draft.avatarUrl}
            onChange={(e) => handleDraftChange('avatarUrl', e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Country / Region"
            value={draft.country}
            onChange={(e) => handleDraftChange('country', e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Timezone"
            value={draft.timezone}
            onChange={(e) => handleDraftChange('timezone', e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Language"
            value={draft.language}
            onChange={(e) => handleDraftChange('language', e.target.value)}
            size="small"
            fullWidth
          />
          <TextField
            label="Friend Code"
            value={profile?.friendCode || ''}
            size="small"
            fullWidth
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            label="Bio"
            value={draft.bio}
            onChange={(e) => handleDraftChange('bio', e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={3}
            sx={{ gridColumn: { md: 'span 2' } }}
          />
        </Box>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => onSave(draft)}>
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

const ProfilePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { profile, account, stats, isLoading, isSaving } = useAppSelector((state) => state.userDomain);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    dispatch(fetchUserSummary());
  }, [dispatch, isAuthenticated]);

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

  return (
    <ProfileForm
      key={profile?.friendCode || 'profile-form'}
      profile={profile}
      account={account}
      stats={stats}
      isLoading={isLoading}
      isSaving={isSaving}
      onSave={(draft) => {
        dispatch(
          saveUserProfile({
            displayName: draft.displayName,
            avatarUrl: draft.avatarUrl || undefined,
            bio: draft.bio || undefined,
            country: draft.country || undefined,
            timezone: draft.timezone || undefined,
            language: draft.language || 'en',
          }),
        );
      }}
    />
  );
};

export default ProfilePage;
