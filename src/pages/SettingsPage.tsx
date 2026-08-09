import React, { useMemo } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { saveSettings, setLocalSetting } from '../features/settings/settingsSlice';
import { logout } from '../features/auth/authSlice';
import { fetchRecentActivity, fetchUserSummary } from '../features/auth/userSlice';
import { resolveBoardThemeId, resolveMoveColorThemeId } from '../lib/chess/boardTheme';
import { historyApi } from '../services/gameService';
import { userApi } from '../services/userService';
import GamePreferencesSection from '../features/settings/GamePreferencesSection';
import BoardAndUiSection from '../features/settings/BoardAndUiSection';
import ProfileSocialSection from '../features/settings/ProfileSocialSection';
import StatsSection from '../features/settings/StatsSection';
import RecentActivitySection from '../features/settings/RecentActivitySection';
import AccountSection from '../features/settings/AccountSection';
import {
  ActivityDetailsDialog,
  AllActivityDialog,
  StatDetailsDialog,
} from '../features/settings/SettingsDialogs';
import type {
  ActivityRecord,
  HistoryGameRecord,
  StatCardConfig,
} from '../features/settings/activityHelpers';
import { isPersonalLoss, isPersonalWin, toActivityRecord } from '../features/settings/activityHelpers';

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: settings, isSaving } = useAppSelector((state) => state.settings);
  const { user, isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { stats, recentActivities, isLoading: userLoading } = useAppSelector((state) => state.userDomain);
  const selectedBoardThemeId = resolveBoardThemeId(settings.boardTheme);
  const selectedMoveColorThemeId = resolveMoveColorThemeId(settings.moveColorTheme);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRecord | null>(null);
  const [showAllActivityDialog, setShowAllActivityDialog] = React.useState(false);
  const [selectedStat, setSelectedStat] = React.useState<StatCardConfig | null>(null);
  const [statGames, setStatGames] = React.useState<HistoryGameRecord[]>([]);
  const [statActivities, setStatActivities] = React.useState<ActivityRecord[]>([]);
  const [statDialogError, setStatDialogError] = React.useState<string | null>(null);
  const [isStatDialogLoading, setIsStatDialogLoading] = React.useState(false);
  const recentActivityItems = useMemo(
    () => recentActivities.map((activity) => toActivityRecord(activity)),
    [recentActivities],
  );
  const activityPreviewItems = useMemo(() => recentActivityItems.slice(0, 3), [recentActivityItems]);
  const activityDialogItems = useMemo(() => recentActivityItems.slice(0, 10), [recentActivityItems]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    dispatch(fetchUserSummary());
    dispatch(fetchRecentActivity(12));
  }, [dispatch, isAuthenticated]);

  const handleSettingsChange = (key: string, value: unknown) => {
    dispatch(setLocalSetting({ [key]: value }));
    if (isAuthenticated) {
      dispatch(saveSettings({ [key]: value }));
    }
  };

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/'));
  };

  const statCards = useMemo<StatCardConfig[]>(
    () => [
      {
        key: 'gamesPlayed',
        label: 'Games Played',
        value: stats?.gamesPlayed ?? 0,
        description: 'Recent completed games across all modes.',
        source: 'history',
      },
      {
        key: 'wins',
        label: 'Wins',
        value: stats?.wins ?? 0,
        description: 'Recent completed games you won.',
        source: 'history',
      },
      {
        key: 'losses',
        label: 'Losses',
        value: stats?.losses ?? 0,
        description: 'Recent completed games you lost.',
        source: 'history',
      },
      {
        key: 'draws',
        label: 'Draws',
        value: stats?.draws ?? 0,
        description: 'Recent games that ended in a draw.',
        source: 'history',
      },
      {
        key: 'onlineGamesPlayed',
        label: 'Online Games',
        value: stats?.onlineGamesPlayed ?? 0,
        description: 'Recent completed online matches.',
        source: 'history',
      },
      {
        key: 'practiceSessions',
        label: 'Practice Sessions',
        value: stats?.practiceSessions ?? 0,
        description: 'Tracked practice sessions from your recent activity.',
        source: 'activity',
      },
      {
        key: 'analysisRequests',
        label: 'Analysis Requests',
        value: stats?.analysisRequests ?? 0,
        description: 'Recent engine analysis requests.',
        source: 'activity',
      },
    ],
    [stats],
  );

  const handleCloseStatDialog = () => {
    setSelectedStat(null);
    setStatGames([]);
    setStatActivities([]);
    setStatDialogError(null);
    setIsStatDialogLoading(false);
  };

  const handleOpenStatDialog = async (card: StatCardConfig) => {
    setSelectedStat(card);
    setStatGames([]);
    setStatActivities([]);
    setStatDialogError(null);
    setIsStatDialogLoading(true);

    try {
      if (card.source === 'history') {
        const params: Record<string, string | number> = { page: 1, limit: 50 };

        if (card.key === 'draws') {
          params.result = '1/2-1/2';
        }
        if (card.key === 'onlineGamesPlayed') {
          params.mode = 'online';
        }

        const { data } = await historyApi.list(params);
        let games = (data.data.games as HistoryGameRecord[]) ?? [];

        if (card.key === 'wins') {
          games = games.filter((game) => isPersonalWin(game, user?._id, user?.username));
        }
        if (card.key === 'losses') {
          games = games.filter((game) => isPersonalLoss(game, user?._id, user?.username));
        }

        setStatGames(games);
      } else {
        const { data } = await userApi.getRecentActivity(50);
        let activities = (data.data.activities as ActivityRecord[]) ?? [];

        if (card.key === 'practiceSessions') {
          activities = activities.filter((activity) => activity.activityType === 'practice_session');
        }
        if (card.key === 'analysisRequests') {
          activities = activities.filter((activity) => activity.activityType === 'analysis_request');
        }

        setStatActivities(activities);
      }
    } catch {
      setStatDialogError('Failed to load details.');
    } finally {
      setIsStatDialogLoading(false);
    }
  };

  const handleReviewGame = (gameId: string) => {
    handleCloseStatDialog();
    setSelectedActivity(null);
    navigate(`/history/${gameId}`);
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 3 }, width: '100%', maxWidth: 960, boxSizing: 'border-box' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', lg: '2.1rem' }, flex: 1 }}>
          Settings
        </Typography>
        {(isSaving || userLoading) && <CircularProgress size={20} />}
      </Box>

      <GamePreferencesSection settings={settings} onChange={handleSettingsChange} />

      <BoardAndUiSection
        settings={settings}
        selectedBoardThemeId={selectedBoardThemeId}
        selectedMoveColorThemeId={selectedMoveColorThemeId}
        onChange={handleSettingsChange}
      />

      <ProfileSocialSection isAuthenticated={isAuthenticated} />

      {isAuthenticated && (
        <>
          <StatsSection statCards={statCards} onOpenStat={(card) => void handleOpenStatDialog(card)} />

          <RecentActivitySection
            previewItems={activityPreviewItems}
            totalCount={recentActivityItems.length}
            onSelect={setSelectedActivity}
            onShowAll={() => setShowAllActivityDialog(true)}
          />

          <AllActivityDialog
            open={showAllActivityDialog}
            activities={activityDialogItems}
            onClose={() => setShowAllActivityDialog(false)}
            onSelect={(activity) => {
              setShowAllActivityDialog(false);
              setSelectedActivity(activity);
            }}
          />

          <StatDetailsDialog
            stat={selectedStat}
            games={statGames}
            activities={statActivities}
            isLoading={isStatDialogLoading}
            error={statDialogError}
            userId={user?._id}
            username={user?.username}
            onClose={handleCloseStatDialog}
            onReviewGame={handleReviewGame}
            onOpenFullHistory={() => {
              handleCloseStatDialog();
              navigate('/history');
            }}
          />

          <ActivityDetailsDialog
            activity={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onReviewGame={handleReviewGame}
          />
        </>
      )}

      <AccountSection
        user={user}
        isAuthenticated={isAuthenticated}
        isGuest={isGuest}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default SettingsPage;
