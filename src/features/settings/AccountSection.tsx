import React from 'react';
import { Alert, Box, Button, Divider, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface AccountSectionProps {
  user: { username: string; email?: string } | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  onLogout: () => void;
}

const AccountSection: React.FC<AccountSectionProps> = ({ user, isAuthenticated, isGuest, onLogout }) => {
  const navigate = useNavigate();

  return (
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
          <Button variant="outlined" color="error" onClick={onLogout}>
            Sign Out
          </Button>
        </Box>
      ) : isGuest ? (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are playing as a guest. Sign up to save games and progress.
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
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
  );
};

export default AccountSection;
