import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useMediaQuery,
  useTheme,
  Avatar,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SchoolIcon from '@mui/icons-material/School';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import WifiIcon from '@mui/icons-material/Wifi';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { logout } from '../../features/auth/authSlice';

const DRAWER_WIDTH = 260;
const PERMANENT_DRAWER_MIN_WIDTH = 1536;

const NAV_ITEMS = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'VS Computer', icon: <SportsEsportsIcon />, path: '/play' },
  { label: 'Online Play', icon: <WifiIcon />, path: '/online', authOnly: true },
  { label: 'Practice', icon: <SchoolIcon />, path: '/practice' },
  { label: 'Next Best Move', icon: <TipsAndUpdatesIcon />, path: '/analysis' },
  { label: 'Profile', icon: <PersonIcon />, path: '/profile', authOnly: true },
  { label: 'Social', icon: <PersonIcon />, path: '/social', authOnly: true },
  { label: 'Saved Games', icon: <SaveIcon />, path: '/saved-games', authOnly: true },
  { label: 'History', icon: <HistoryIcon />, path: '/history', authOnly: true },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const useTemporaryDrawer = useMediaQuery(`(max-width:${PERMANENT_DRAWER_MIN_WIDTH - 0.05}px)`);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isGuest } = useAppSelector((s) => s.auth);

  const visibleNav = NAV_ITEMS.filter((item) => !item.authOnly || isAuthenticated);

  const handleNav = (path: string) => {
    navigate(path);
    if (useTemporaryDrawer) setMobileOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/'));
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', lg: '1.55rem' } }}
          noWrap
        >
          ♟ Chess V2.0
        </Typography>
      </Toolbar>
      <List sx={{ flex: 1, pt: 0 }}>
        {visibleNav.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
            sx={{
              mx: 1,
              borderRadius: 1,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
                '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { sx: { fontSize: { xs: '0.98rem', lg: '1.18rem' }, fontWeight: 600 } } }}
            />
          </ListItemButton>
        ))}
      </List>

      {/* User section at bottom */}
      <Divider />
      <Box sx={{ p: 1.5 }}>
        {isAuthenticated && user ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.9rem' }}>
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {user.username}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Box>
        ) : isGuest ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip icon={<PersonIcon />} label="Guest" size="small" variant="outlined" />
            <Button
              size="small"
              startIcon={<LoginIcon />}
              onClick={() => handleNav('/login')}
              sx={{ ml: 'auto' }}
            >
              Sign In
            </Button>
          </Box>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LoginIcon />}
            onClick={() => handleNav('/login')}
          >
            Sign In
          </Button>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* App Bar - mobile only */}
      {useTemporaryDrawer && (
        <AppBar
          position="fixed"
          sx={{ zIndex: theme.zIndex.drawer + 1 }}
          elevation={1}
        >
          <Toolbar variant="dense">
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setMobileOpen(!mobileOpen)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.15rem' }} noWrap>
              ♟ Chess V2.0
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar */}
      {useTemporaryDrawer ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...(useTemporaryDrawer && { pt: '48px' }),
        }}
      >
        <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
      </Box>
    </Box>
  );
};
export default AppLayout;
