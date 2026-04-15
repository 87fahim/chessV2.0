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
import OnlinePlayPage from '../pages/OnlinePlayPage';

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
        <Route path="/saved-games" element={<SavedGamesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:id" element={<HistoryPage />} />
        <Route path="/online" element={<OnlinePlayPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default AppRoutes;
