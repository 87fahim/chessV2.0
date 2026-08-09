import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from '../components/common/AppLayout';
import HomePage from '../pages/HomePage';
import ProtectedRoute from '../components/common/ProtectedRoute';

// Route-level code splitting: each page loads on demand instead of in one bundle.
const PlayVsComputerPage = lazy(() => import('../features/game/PlayVsComputerPage'));
const PracticePage = lazy(() => import('../features/game/PracticePage'));
const AnalysisPage = lazy(() => import('../features/analysis/AnalysisPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const SavedGamesPage = lazy(() => import('../pages/SavedGamesPage'));
const HistoryPage = lazy(() => import('../pages/HistoryPage'));
const GameReplayPage = lazy(() => import('../pages/GameReplayPage'));
const OnlinePlayPage = lazy(() => import('../pages/OnlinePlayPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SocialPage = lazy(() => import('../pages/SocialPage'));

const protectedRoute = (element: React.ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
    <CircularProgress />
  </Box>
);

const AppRoutes: React.FC = () => {
  return (
    <AppLayout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/play" element={<PlayVsComputerPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/saved-games" element={protectedRoute(<SavedGamesPage />)} />
          <Route path="/history" element={protectedRoute(<HistoryPage />)} />
          <Route path="/history/:id" element={protectedRoute(<GameReplayPage />)} />
          <Route path="/online" element={protectedRoute(<OnlinePlayPage />)} />
          <Route path="/profile" element={protectedRoute(<ProfilePage />)} />
          <Route path="/social" element={protectedRoute(<SocialPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
};

export default AppRoutes;
