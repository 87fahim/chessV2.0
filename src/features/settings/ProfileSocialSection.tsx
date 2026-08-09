import React from 'react';
import { Alert, Box, Button, Divider, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface ProfileSocialSectionProps {
  isAuthenticated: boolean;
}

const ProfileSocialSection: React.FC<ProfileSocialSectionProps> = ({ isAuthenticated }) => {
  const navigate = useNavigate();

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
        Profile And Social
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Profile identity, friends, blocks, invites, and privacy controls now live on dedicated pages.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
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
  );
};

export default ProfileSocialSection;
