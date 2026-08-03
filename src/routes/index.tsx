import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/common/AppLayout';
import HomePage from '../pages/HomePage';
import PlayVsComputerPage from '../features/game/PlayVsComputerPage';
import PracticePage from '../features/game/PracticePage';
import AnalysisPage from '../features/analysis/AnalysisPage';
import SettingsPage from '../pages/SettingsPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import SavedGamesPage from '../pages/SavedGamesPage';
import HistoryPage from '../pages/HistoryPage';
import GameReplayPage from '../pages/GameReplayPage';
import OnlinePlayPage from '../pages/OnlinePlayPage';
import ProfilePage from '../pages/ProfilePage';
import SocialPage from '../pages/SocialPage';
import ProtectedRoute from '../components/common/ProtectedRoute';

const protectedRoute = (element: React.ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

const AppRoutes: React.FC = () => {
  return (
    <AppLayout>
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
    </AppLayout>
  );
};

export default AppRoutes;
