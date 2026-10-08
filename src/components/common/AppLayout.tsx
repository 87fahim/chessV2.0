import React, { useCallback, useEffect, useState } from 'react';
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
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SchoolIcon from '@mui/icons-material/School';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import SettingsIcon from '@mui/icons-material/Settings';
import HomeIcon from '@mui/icons-material/Home';
import WifiIcon from '@mui/icons-material/Wifi';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import CasinoIcon from '@mui/icons-material/Casino';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useStore';
import { logout } from '../../features/auth/authSlice';
import { saveSettings } from '../../features/settings/settingsSlice';
import { AppChromeProvider, DRAWER_WIDTH } from './AppChromeContext';
import { readSessionSidebarExpanded, writeSessionSidebarExpanded } from './sidebarPref';

const PERMANENT_DRAWER_MIN_WIDTH = 1536;
const MOBILE_APP_BAR_HEIGHT = 48;

const APP_TITLE = __APP_LABEL__ ? `ChessV2:${__APP_LABEL__}` : 'ChessV2';

const NAV_ITEMS = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'VS Computer', icon: <SportsEsportsIcon />, path: '/play' },
  { label: 'Online Play', icon: <WifiIcon />, path: '/online', authOnly: true },
  { label: 'Practice', icon: <SchoolIcon />, path: '/practice' },
  { label: 'Ludo', icon: <CasinoIcon />, path: '/ludo' },
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
  const wideDefault = !useMediaQuery(`(max-width:${PERMANENT_DRAWER_MIN_WIDTH - 0.05}px)`, { noSsr: true });
  const [override, setOverride] = useState<boolean | null>(() => readSessionSidebarExpanded());
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isGuest } = useAppSelector((s) => s.auth);
  const settingsLoading = useAppSelector((s) => s.settings.isLoading);
  const storedSidebarExpanded = useAppSelector((s) => s.settings.data.sidebarExpanded);

  const persistForAccount = isAuthenticated && !isGuest;
  const sidebarOpen = override ?? wideDefault;
  const visibleNav = NAV_ITEMS.filter((item) => !item.authOnly || isAuthenticated);
  const contentTopOffset = sidebarOpen ? 0 : MOBILE_APP_BAR_HEIGHT;

  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  useEffect(() => {
    if (!persistForAccount || settingsLoading) {
      return;
    }
    if (typeof storedSidebarExpanded === 'boolean') {
      // Restore the account-saved sidebar after settings finish loading.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverride(storedSidebarExpanded);
    }
  }, [persistForAccount, settingsLoading, storedSidebarExpanded]);

  const toggleSidebar = useCallback(() => {
    const next = !sidebarOpen;
    setOverride(next);
    writeSessionSidebarExpanded(next);
    if (persistForAccount) {
      void dispatch(saveSettings({ sidebarExpanded: next }));
    }
  }, [sidebarOpen, persistForAccount, dispatch]);

  const handleNav = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/'));
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ pr: 1, gap: 0.5 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', lg: '1.55rem' }, flex: 1, minWidth: 0 }}
          noWrap
        >
          {APP_TITLE}
        </Typography>
        <IconButton aria-label="Collapse navigation menu" onClick={toggleSidebar} size="small">
          <ChevronLeftIcon />
        </IconButton>
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
    <AppChromeProvider value={{ sidebarOpen }}>
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100dvh',
        height: '100dvh',
        overflow: 'hidden',
      }}
    >
      {!sidebarOpen && (
        <AppBar
          position="fixed"
          sx={{
            zIndex: theme.zIndex.drawer + 1,
          }}
          elevation={1}
        >
          <Toolbar variant="dense">
            <IconButton
              aria-label="Expand navigation menu"
              edge="start"
              color="inherit"
              onClick={toggleSidebar}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.15rem' }} noWrap>
              {APP_TITLE}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {sidebarOpen && (
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

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pt: contentTopOffset ? `${contentTopOffset}px` : 0,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', overflowX: 'hidden' }}>{children}</Box>
      </Box>
    </Box>
    </AppChromeProvider>
  );
};
export default AppLayout;
