import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SchoolIcon from '@mui/icons-material/School';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SettingsIcon from '@mui/icons-material/Settings';
import WifiIcon from '@mui/icons-material/Wifi';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import { useAppSelector } from '../hooks/useStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isGuest } = useAppSelector((s) => s.auth);

  const cards = [
    {
      title: 'VS Computer',
      description: 'Challenge the AI at different difficulty levels.',
      icon: <SportsEsportsIcon sx={{ fontSize: 48 }} />,
      to: '/play',
      color: '#3498db',
    },
    {
      title: 'Online Play',
      description: 'Play against other players in real time.',
      icon: <WifiIcon sx={{ fontSize: 48 }} />,
      to: '/online',
      color: '#e74c3c',
      authOnly: true,
    },
    {
      title: 'Practice',
      description: 'Free board to practice and load positions.',
      icon: <SchoolIcon sx={{ fontSize: 48 }} />,
      to: '/practice',
      color: '#27ae60',
    },
    {
      title: 'Next Best Move',
      description: 'Analyze positions and find the best move.',
      icon: <TipsAndUpdatesIcon sx={{ fontSize: 48 }} />,
      to: '/analysis',
      color: '#e67e22',
    },
    {
      title: 'Saved Games',
      description: 'Continue your saved games.',
      icon: <SaveIcon sx={{ fontSize: 48 }} />,
      to: '/saved-games',
      color: '#2980b9',
      authOnly: true,
    },
    {
      title: 'History',
      description: 'Review your completed games.',
      icon: <HistoryIcon sx={{ fontSize: 48 }} />,
      to: '/history',
      color: '#16a085',
      authOnly: true,
    },
    {
      title: 'Profile',
      description: 'Manage your profile, public identity, and account snapshot.',
      icon: <SettingsIcon sx={{ fontSize: 48 }} />,
      to: '/profile',
      color: '#c0392b',
      authOnly: true,
    },
    {
      title: 'Social',
      description: 'Manage friends, invites, blocks, and visibility rules.',
      icon: <WifiIcon sx={{ fontSize: 48 }} />,
      to: '/social',
      color: '#2c3e50',
      authOnly: true,
    },
    {
      title: 'Settings',
      description: 'Customize your game preferences.',
      icon: <SettingsIcon sx={{ fontSize: 48 }} />,
      to: '/settings',
      color: '#8e44ad',
    },
  ];

  const visibleCards = cards.filter((c) => !c.authOnly || isAuthenticated);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        width: '100%',
        minHeight: '100%',
        p: { xs: 1.5, sm: 2.5, lg: 3 },
        boxSizing: 'border-box',
      }}
    >
      <Typography variant="h3" sx={{ fontWeight: 700, fontSize: { xs: '2.1rem', lg: '3.6rem' } }} gutterBottom>
        ChessV2
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', fontSize: { xs: '1rem', lg: '1.15rem' } }}>
          Play, practice, and improve your chess skills
        </Typography>
      </Box>
      {isAuthenticated && user ? (
        <Chip label={`Welcome back, ${user.username}!`} color="primary" variant="outlined" sx={{ mb: { xs: 2, sm: 3 }, alignSelf: 'center' }} />
      ) : isGuest ? (
        <Chip
          label="Playing as Guest — Sign in to unlock all features"
          variant="outlined"
          sx={{ mb: { xs: 2, sm: 3 }, cursor: 'pointer', alignSelf: 'center' }}
          onClick={() => navigate('/login')}
        />
      ) : (
        <Box sx={{ mb: { xs: 2, sm: 3 } }} />
      )}

      <Grid container spacing={{ xs: 1.5, sm: 2.5, lg: 3 }} sx={{ width: '100%', maxWidth: 960 }}>
        {visibleCards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.to}>
            <Paper
              elevation={3}
              onClick={() => navigate(card.to)}
              sx={{
                p: { xs: 2, sm: 3 },
                cursor: 'pointer',
                width: '100%',
                height: '100%',
                textAlign: 'center',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                },
              }}
            >
              <Box sx={{ color: card.color, mb: 1 }}>{card.icon}</Box>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1.15rem', lg: '1.55rem' } }}>
                {card.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {card.description}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default HomePage;
