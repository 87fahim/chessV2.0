import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Piece from '../components/chess/Piece';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { saveSettings, setLocalSetting } from '../features/settings/settingsSlice';
import { logout } from '../features/auth/authSlice';
import { fetchRecentActivity, fetchUserSummary } from '../features/auth/userSlice';
import {
  BOARD_COLOR_THEME_OPTIONS,
  BOARD_TEXTURE_OPTIONS,
  getBoardSquareBackground,
  getMoveColorTheme,
  MOVE_COLOR_THEME_OPTIONS,
  resolveBoardThemeId,
  resolveMoveColorThemeId,
} from '../lib/chess/boardTheme';
import { historyApi } from '../services/gameService';
import { userApi } from '../services/userService';
import type { PieceColor, PieceType } from '../types/chess';

const THEME_TILE_SIZE = 44;
const THEME_TILE_GAP = 3;
const THEME_SECTION_PADDING = 6;
const THEME_MAX_ROWS = 4;
const LIVE_PREVIEW_SIZE = 168;

function getThemeGridMetrics(visibleColumns: number, itemCount: number) {
  const requiredRows = Math.max(1, Math.ceil(itemCount / visibleColumns));
  const visibleRows = Math.min(requiredRows, THEME_MAX_ROWS);
  const contentWidth = visibleColumns * THEME_TILE_SIZE + (visibleColumns - 1) * THEME_TILE_GAP;
  const sectionWidth = contentWidth + THEME_SECTION_PADDING * 2;
  const contentHeight = visibleRows * THEME_TILE_SIZE + Math.max(0, visibleRows - 1) * THEME_TILE_GAP;
  const sectionHeight = contentHeight + THEME_SECTION_PADDING * 2;

  return {
    requiredRows,
    contentWidth,
    sectionWidth,
    sectionHeight,
  };
}

function PreviewBoard({
  boardThemeId,
  moveColorThemeId,
  mode,
  size,
  showPieces,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
  size: number;
  showPieces: boolean;
}) {
  const moveTheme = getMoveColorTheme(moveColorThemeId);
  const ringInset = Math.max(2, Math.round(size * 0.04));
  const ringWidth = Math.max(3, Math.round(size * 0.045));

  const previewSquares = [
    {
      key: 'dark-top-left',
      isLight: false,
      overlayColor: mode === 'move' ? moveTheme.selectedDark : undefined,
      marker: null as 'dot' | 'ring' | null,
      piece: showPieces ? ({ type: 'b', color: 'b' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'light-top-right',
      isLight: true,
      overlayColor: mode === 'move' ? moveTheme.lastMoveLight : undefined,
      marker: null as 'dot' | 'ring' | null,
      piece: showPieces ? ({ type: 'p', color: 'b' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'light-bottom-left',
      isLight: true,
      overlayColor: undefined,
      marker: mode === 'move' ? ('dot' as const) : null,
      piece: showPieces ? ({ type: 'n', color: 'w' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'dark-bottom-right',
      isLight: false,
      overlayColor: mode === 'move' ? moveTheme.checkDark : undefined,
      marker: mode === 'move' ? ('ring' as const) : null,
      piece: showPieces ? ({ type: 'r', color: 'w' } as { type: PieceType; color: PieceColor }) : null,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        width: size,
        height: size,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      {previewSquares.map((previewSquare) => {
        const squareStyles = getBoardSquareBackground(
          boardThemeId,
          previewSquare.isLight,
          previewSquare.overlayColor,
        );

        return (
          <Box
            key={previewSquare.key}
            sx={{
              ...squareStyles,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {previewSquare.marker === 'dot' && (
              <Box
                sx={{
                  width: '34%',
                  height: '34%',
                  borderRadius: '50%',
                  backgroundColor: moveTheme.legalMoveDot,
                  position: 'absolute',
                  inset: 0,
                  margin: 'auto',
                }}
              />
            )}
            {previewSquare.marker === 'ring' && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: ringInset,
                  borderRadius: '50%',
                  border: `${ringWidth}px solid ${moveTheme.captureIndicator}`,
                  boxSizing: 'border-box',
                }}
              />
            )}
            {previewSquare.piece && (
              <Piece
                type={previewSquare.piece.type}
                color={previewSquare.piece.color}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function MiniBoardPreview({
  boardThemeId,
  moveColorThemeId,
  mode,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
}) {
  return <PreviewBoard boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode={mode} size={THEME_TILE_SIZE} showPieces={false} />;
}

function LiveBoardPreview({
  boardThemeId,
  moveColorThemeId,
  mode,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
}) {
  return <PreviewBoard boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode={mode} size={LIVE_PREVIEW_SIZE} showPieces />;
}

function BoardThemePreview({
  boardThemeId,
  moveColorThemeId,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
      <MiniBoardPreview boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode="board" />
    </Box>
  );
}

function MoveColorThemePreview({
  boardThemeId,
  moveColorThemeId,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
      <MiniBoardPreview boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode="move" />
    </Box>
  );
}

function ThemeOptionCard({
  ariaLabel,
  selected,
  onClick,
  children,
}: {
  ariaLabel: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      sx={{
        all: 'unset',
        width: THEME_TILE_SIZE,
        height: THEME_TILE_SIZE,
        boxSizing: 'border-box',
        borderRadius: 1,
        border: selected ? '2px solid #1f6feb' : '1px solid rgba(0,0,0,0.14)',
        backgroundColor: selected ? 'rgba(31, 111, 235, 0.08)' : 'background.paper',
        boxShadow: selected ? '0 0 0 1px rgba(31, 111, 235, 0.18)' : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          borderColor: '#1f6feb',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid #1f6feb',
          outlineOffset: 2,
        },
      }}
    >
      {children}
    </Box>
  );
}

function ThemeGridSection({
  title,
  helperText,
  visibleColumns,
  itemCount,
  livePreview,
  children,
}: {
  title: string;
  helperText: string;
  visibleColumns: number;
  itemCount: number;
  livePreview: React.ReactNode;
  children: React.ReactNode;
}) {
  const metrics = getThemeGridMetrics(visibleColumns, itemCount);

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        flex: '1 1 320px',
      }}
    >
      {title && (
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
          {title}
        </Typography>
      )}
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {helperText}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          gap: 1.5,
        }}
      >
        <ThemeGridViewport
          visibleColumns={visibleColumns}
          itemCount={itemCount}
          sectionWidth={metrics.sectionWidth}
          sectionHeight={metrics.sectionHeight}
          contentWidth={metrics.contentWidth}
        >
          {children}
        </ThemeGridViewport>

        <Box sx={{ flex: '0 0 auto', alignSelf: { xs: 'center', md: 'flex-start' } }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
            Live Preview
          </Typography>
          {livePreview}
        </Box>
      </Box>
    </Box>
  );
}

function ThemeGridViewport({
  visibleColumns,
  itemCount,
  sectionWidth,
  sectionHeight,
  contentWidth,
  children,
}: {
  visibleColumns: number;
  itemCount: number;
  sectionWidth: number;
  sectionHeight: number;
  contentWidth: number;
  children: React.ReactNode;
}) {
  const requiredRows = Math.max(1, Math.ceil(itemCount / visibleColumns));

  return (
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          maxWidth: `${sectionWidth}px`,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: `${THEME_SECTION_PADDING}px`,
          minHeight: `${sectionHeight}px`,
          maxHeight: `${sectionHeight}px`,
          overflowX: 'hidden',
          overflowY: requiredRows > THEME_MAX_ROWS ? 'auto' : 'hidden',
          backgroundColor: 'rgba(0,0,0,0.015)',
          '&::-webkit-scrollbar': {
            width: 10,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.22)',
            borderRadius: 999,
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleColumns}, ${THEME_TILE_SIZE}px)`,
            gridAutoRows: `${THEME_TILE_SIZE}px`,
            gap: `${THEME_TILE_GAP}px`,
            width: `${contentWidth}px`,
            alignContent: 'start',
          }}
        >
          {children}
        </Box>
      </Box>
  );
}

type StatKey =
  | 'gamesPlayed'
  | 'wins'
  | 'losses'
  | 'draws'
  | 'onlineGamesPlayed'
  | 'practiceSessions'
  | 'analysisRequests';

interface HistoryGameRecord {
  _id: string;
  mode: string;
  result: string;
  terminationReason?: string;
  difficulty?: string;
  timeControl?: { initialMs: number; incrementMs: number };
  moves: Array<{ ply: number; san: string; from: string; to: string; fenAfter: string }>;
  whitePlayer: { userId?: string; name: string };
  blackPlayer: { userId?: string; name: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface ActivityRecord {
  _id?: string;
  activityType: string;
  feature: string;
  gameId?: string;
  puzzleId?: string;
  fen?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

interface StatCardConfig {
  key: StatKey;
  label: string;
  value: number;
  description: string;
  source: 'history' | 'activity';
}

function toActivityRecord(activity: Record<string, unknown>): ActivityRecord {
  const metadata = activity.metadata;

  return {
    _id: typeof activity._id === 'string' ? activity._id : undefined,
    activityType: typeof activity.activityType === 'string' ? activity.activityType : 'activity',
    feature: typeof activity.feature === 'string' ? activity.feature : 'system',
    gameId: typeof activity.gameId === 'string' ? activity.gameId : undefined,
    puzzleId: typeof activity.puzzleId === 'string' ? activity.puzzleId : undefined,
    fen: typeof activity.fen === 'string' ? activity.fen : undefined,
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : undefined,
    createdAt: typeof activity.createdAt === 'string' ? activity.createdAt : undefined,
  };
}

function startCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'Structured data';
    }
  }
  return String(value);
}

function formatTimeControlLabel(timeControl?: { initialMs: number; incrementMs: number }): string {
  if (!timeControl) {
    return 'Unlimited';
  }

  const baseMinutes = Math.round(timeControl.initialMs / 60000);
  const incrementSeconds = Math.round(timeControl.incrementMs / 1000);
  return incrementSeconds > 0 ? `${baseMinutes}+${incrementSeconds}` : `${baseMinutes} min`;
}

function isUserWhite(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return game.whitePlayer.userId === userId || (!!username && game.whitePlayer.name === username);
}

function isUserBlack(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return game.blackPlayer.userId === userId || (!!username && game.blackPlayer.name === username);
}

function isPersonalWin(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return (
    (game.result === '1-0' && isUserWhite(game, userId, username)) ||
    (game.result === '0-1' && isUserBlack(game, userId, username))
  );
}

function isPersonalLoss(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return (
    (game.result === '1-0' && isUserBlack(game, userId, username)) ||
    (game.result === '0-1' && isUserWhite(game, userId, username))
  );
}

function getGameOutcomeLabel(game: HistoryGameRecord, userId?: string, username?: string): string {
  if (game.result === '1/2-1/2') {
    return 'Draw';
  }
  if (isPersonalWin(game, userId, username)) {
    return 'Win';
  }
  if (isPersonalLoss(game, userId, username)) {
    return 'Loss';
  }
  return startCase(game.result);
}

function getGameOutcomeColor(game: HistoryGameRecord, userId?: string, username?: string): 'success' | 'error' | 'default' {
  if (game.result === '1/2-1/2') {
    return 'default';
  }
  return isPersonalWin(game, userId, username) ? 'success' : 'error';
}

function getActivityTitle(activity: ActivityRecord): string {
  switch (activity.activityType) {
    case 'analysis_request':
      return 'Analysis requested';
    case 'fen_saved':
      return 'Position saved';
    case 'friend_invite':
      return 'Friend request sent';
    case 'game_completed':
      return 'Game completed';
    case 'game_saved':
      return 'Game saved';
    case 'login':
      return 'Signed in';
    case 'matchmaking_join':
      return 'Joined matchmaking';
    case 'practice_session':
      return 'Practice session';
    case 'puzzle_attempt':
      return 'Puzzle attempt';
    default:
      return startCase(activity.activityType || 'activity');
  }
}

function getActivitySummary(activity: ActivityRecord): string {
  const metadata = activity.metadata ?? {};

  switch (activity.activityType) {
    case 'analysis_request':
      return [
        metadata.difficulty ? `Difficulty ${formatDetailValue(metadata.difficulty)}` : null,
        metadata.searchMode ? `Mode ${formatDetailValue(metadata.searchMode)}` : null,
        metadata.searchDepth ? `Depth ${formatDetailValue(metadata.searchDepth)}` : null,
        metadata.moveTimeMs ? `${Math.round(Number(metadata.moveTimeMs) / 1000)}s` : null,
      ].filter(Boolean).join(' • ') || 'Engine analysis requested for a position.';
    case 'fen_saved':
      return [
        metadata.name ? `Saved as ${formatDetailValue(metadata.name)}` : null,
        metadata.source ? `Source ${startCase(String(metadata.source))}` : null,
      ].filter(Boolean).join(' • ') || 'Saved a board position for later.';
    case 'friend_invite':
      return metadata.targetUserId ? `Target user ${formatDetailValue(metadata.targetUserId)}` : 'Sent a friend request.';
    case 'game_completed':
      return [
        metadata.mode ? startCase(String(metadata.mode)) : 'Game',
        metadata.result ? `Result ${formatDetailValue(metadata.result)}` : null,
        metadata.terminationReason ? startCase(String(metadata.terminationReason)) : null,
      ].filter(Boolean).join(' • ');
    case 'game_saved':
      return 'Saved an in-progress game.';
    case 'login':
      return 'Authenticated successfully.';
    case 'matchmaking_join':
      return 'Entered the live matchmaking queue.';
    case 'practice_session':
      return 'Opened a free practice board session.';
    case 'puzzle_attempt':
      return `Solved: ${formatDetailValue(metadata.solved)}`;
    default:
      return startCase(activity.feature || 'system');
  }
}

function getActivityDetailRows(activity: ActivityRecord): Array<{ label: string; value: string }> {
  const metadata = activity.metadata ?? {};
  const rows = [
    { label: 'Activity', value: getActivityTitle(activity) },
    { label: 'Area', value: startCase(activity.feature || 'system') },
    {
      label: 'Time',
      value: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Not available',
    },
  ];

  if (activity.gameId) {
    rows.push({ label: 'Game ID', value: activity.gameId });
  }
  if (activity.puzzleId) {
    rows.push({ label: 'Puzzle ID', value: activity.puzzleId });
  }

  for (const [key, value] of Object.entries(metadata)) {
    rows.push({ label: startCase(key), value: formatDetailValue(value) });
  }

  return rows;
}

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { data: settings, isSaving } = useAppSelector((state) => state.settings);
  const { user, isAuthenticated, isGuest } = useAppSelector((state) => state.auth);
  const { stats, recentActivities, isLoading: userLoading } = useAppSelector((state) => state.userDomain);
  const selectedBoardThemeId = resolveBoardThemeId(settings.boardTheme);
  const selectedMoveColorThemeId = resolveMoveColorThemeId(settings.moveColorTheme);
  const boardTextureMetrics = getThemeGridMetrics(6, BOARD_TEXTURE_OPTIONS.length);
  const boardColorMetrics = getThemeGridMetrics(6, BOARD_COLOR_THEME_OPTIONS.length);
  const boardSectionWidth = Math.max(boardTextureMetrics.sectionWidth, boardColorMetrics.sectionWidth);
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

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Game Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Difficulty</InputLabel>
          <Select
            value={settings.defaultDifficulty || 'medium'}
            label="Default Difficulty"
            onChange={(e) => handleSettingsChange('defaultDifficulty', e.target.value)}
          >
            <MenuItem value="easy">Easy</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="hard">Hard</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Color</InputLabel>
          <Select
            value={settings.preferredColor || 'white'}
            label="Default Color"
            onChange={(e) => handleSettingsChange('preferredColor', e.target.value)}
          >
            <MenuItem value="white">White</MenuItem>
            <MenuItem value="black">Black</MenuItem>
            <MenuItem value="random">Random</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Default Time Control</InputLabel>
          <Select
            value={settings.defaultTimeControl || '10+0'}
            label="Default Time Control"
            onChange={(e) => handleSettingsChange('defaultTimeControl', e.target.value)}
          >
            <MenuItem value="1+0">1 minute</MenuItem>
            <MenuItem value="3+0">3 minutes</MenuItem>
            <MenuItem value="3+2">3 minutes + 2-second increment</MenuItem>
            <MenuItem value="5+0">5 minutes</MenuItem>
            <MenuItem value="10+0">10 minutes</MenuItem>
            <MenuItem value="15+10">15 minutes + 10-second increment</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel control={<Switch checked={settings.soundEnabled ?? true} onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)} />} label="Enable Sounds" />
        <FormControlLabel control={<Switch checked={settings.animationEnabled ?? true} onChange={(e) => handleSettingsChange('animationEnabled', e.target.checked)} />} label="Enable Animation" />
        <FormControlLabel control={<Switch checked={settings.autoPromotion ?? false} onChange={(e) => handleSettingsChange('autoPromotion', e.target.checked)} />} label="Auto Promote To Queen" />
        <FormControlLabel control={<Switch checked={settings.moveConfirmation ?? false} onChange={(e) => handleSettingsChange('moveConfirmation', e.target.checked)} />} label="Move Confirmation" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Board And UI
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            gap: 2,
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: '100%',
              minWidth: 0,
              maxWidth: '100%',
              flex: '1 1 320px',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Board Themes
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
              Choose a textured or solid-color board background.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-start' },
                gap: 1.5,
              }}
            >
              <Box sx={{ width: '100%', maxWidth: `${boardSectionWidth}px`, minWidth: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
                  Texture
                </Typography>
                <ThemeGridViewport
                  visibleColumns={6}
                  itemCount={BOARD_TEXTURE_OPTIONS.length}
                  sectionWidth={boardTextureMetrics.sectionWidth}
                  sectionHeight={boardTextureMetrics.sectionHeight}
                  contentWidth={boardTextureMetrics.contentWidth}
                >
                  {BOARD_TEXTURE_OPTIONS.map((option) => (
                    <ThemeOptionCard
                      key={option.id}
                      ariaLabel={option.label}
                      selected={option.id === selectedBoardThemeId}
                      onClick={() => handleSettingsChange('boardTheme', option.id)}
                    >
                      <BoardThemePreview
                        boardThemeId={option.id}
                        moveColorThemeId={selectedMoveColorThemeId}
                      />
                    </ThemeOptionCard>
                  ))}
                </ThemeGridViewport>

                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 0.5, mb: 0.75 }}>
                  Color
                </Typography>
                <ThemeGridViewport
                  visibleColumns={6}
                  itemCount={BOARD_COLOR_THEME_OPTIONS.length}
                  sectionWidth={boardColorMetrics.sectionWidth}
                  sectionHeight={boardColorMetrics.sectionHeight}
                  contentWidth={boardColorMetrics.contentWidth}
                >
                  {BOARD_COLOR_THEME_OPTIONS.map((option) => (
                    <ThemeOptionCard
                      key={option.id}
                      ariaLabel={option.label}
                      selected={option.id === selectedBoardThemeId}
                      onClick={() => handleSettingsChange('boardTheme', option.id)}
                    >
                      <BoardThemePreview
                        boardThemeId={option.id}
                        moveColorThemeId={selectedMoveColorThemeId}
                      />
                    </ThemeOptionCard>
                  ))}
                </ThemeGridViewport>
              </Box>

              <Box sx={{ flex: '0 0 auto', alignSelf: { xs: 'center', md: 'flex-start' } }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
                  Live Preview
                </Typography>
                <LiveBoardPreview
                  boardThemeId={selectedBoardThemeId}
                  moveColorThemeId={selectedMoveColorThemeId}
                  mode="board"
                />
              </Box>
            </Box>
          </Box>

          <ThemeGridSection
            title="Move Color Themes"
            helperText="Choose colors for move highlights, legal moves, and premoves."
            visibleColumns={4}
            itemCount={MOVE_COLOR_THEME_OPTIONS.length}
            livePreview={
              <LiveBoardPreview
                boardThemeId={selectedBoardThemeId}
                moveColorThemeId={selectedMoveColorThemeId}
                mode="move"
              />
            }
          >
            {MOVE_COLOR_THEME_OPTIONS.map((option) => (
              <ThemeOptionCard
                key={option.id}
                ariaLabel={option.label}
                selected={option.id === selectedMoveColorThemeId}
                onClick={() => handleSettingsChange('moveColorTheme', option.id)}
              >
                <MoveColorThemePreview
                  boardThemeId={selectedBoardThemeId}
                  moveColorThemeId={option.id}
                />
              </ThemeOptionCard>
            ))}
          </ThemeGridSection>
        </Box>

        <FormControlLabel control={<Switch checked={settings.showCoordinates ?? true} onChange={(e) => handleSettingsChange('showCoordinates', e.target.checked)} />} label="Show Coordinates" />
        <FormControlLabel control={<Switch checked={settings.showLegalMoves ?? true} onChange={(e) => handleSettingsChange('showLegalMoves', e.target.checked)} />} label="Show Legal Moves" />
        <FormControlLabel control={<Switch checked={settings.highlightLastMove ?? true} onChange={(e) => handleSettingsChange('highlightLastMove', e.target.checked)} />} label="Highlight Last Move" />
        <FormControlLabel control={<Switch checked={settings.highlightCheck ?? true} onChange={(e) => handleSettingsChange('highlightCheck', e.target.checked)} />} label="Highlight Check" />
        <FormControlLabel control={<Switch checked={settings.boardFlipped ?? false} onChange={(e) => handleSettingsChange('boardFlipped', e.target.checked)} />} label="Flip Board By Default" />
      </Paper>

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

      {isAuthenticated && (
        <>
          <Paper elevation={2} sx={{ p: { xs: 0.85, sm: 1 }, mb: { xs: 1.5, sm: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
              Stats
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                gap: { xs: 0.5, sm: 0.65 },
                alignItems: 'start',
              }}
            >
              {statCards.map((card) => (
                <Box
                  key={card.key}
                  component="button"
                  type="button"
                  onClick={() => void handleOpenStatDialog(card)}
                  sx={{
                    all: 'unset',
                    display: 'block',
                    width: '100%',
                    cursor: 'pointer',
                    alignSelf: 'start',
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 0.55, sm: 0.7 },
                      transition: 'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: 2,
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '0.6rem', sm: '0.66rem' },
                        display: 'block',
                        lineHeight: 1.05,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {card.label}
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        lineHeight: 1,
                        fontWeight: 700,
                        mt: 0.1,
                        mb: 0,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                      }}
                    >
                      {card.value}
                    </Typography>
                  </Paper>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper elevation={2} sx={{ p: { xs: 1.25, sm: 1.5 }, mb: { xs: 2, sm: 3 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
              Recent Activity
            </Typography>
            <Divider sx={{ mb: 1.25 }} />

            {recentActivityItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recent activity yet.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  {activityPreviewItems.map((activity, index) => (
                    <Box
                      key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`}
                      component="button"
                      type="button"
                      onClick={() => setSelectedActivity(activity)}
                      sx={{
                        all: 'unset',
                        display: 'block',
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 0.85, sm: 1 },
                          textAlign: 'left',
                          transition: 'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 2,
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.84rem', sm: '0.9rem' } }}>
                              {getActivityTitle(activity)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2, fontSize: { xs: '0.74rem', sm: '0.8rem' }, lineHeight: 1.2 }}>
                              {getActivitySummary(activity)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.4} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={startCase(activity.feature || 'system')} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.65, fontSize: '0.64rem' } }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Paper>
                    </Box>
                  ))}
                </Box>

                {recentActivityItems.length > 3 && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button size="small" onClick={() => setShowAllActivityDialog(true)}>
                      More
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Paper>

          <Dialog open={showAllActivityDialog} onClose={() => setShowAllActivityDialog(false)} fullWidth maxWidth="sm">
            <DialogTitle>Recent Activity</DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
              <Box sx={{ maxHeight: { xs: 360, sm: 440 }, overflowY: 'auto', p: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {activityDialogItems.map((activity, index) => (
                    <Box
                      key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`}
                      component="button"
                      type="button"
                      onClick={() => {
                        setShowAllActivityDialog(false);
                        setSelectedActivity(activity);
                      }}
                      sx={{
                        all: 'unset',
                        display: 'block',
                        width: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <Paper
                        variant="outlined"
                        sx={{
                          p: { xs: 0.85, sm: 1 },
                          textAlign: 'left',
                          '&:hover': {
                            boxShadow: 2,
                            borderColor: 'primary.main',
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.6, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: { xs: '0.84rem', sm: '0.9rem' } }}>
                              {getActivityTitle(activity)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.2, fontSize: { xs: '0.74rem', sm: '0.8rem' }, lineHeight: 1.2 }}>
                              {getActivitySummary(activity)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.4} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip label={startCase(activity.feature || 'system')} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.65, fontSize: '0.64rem' } }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.62rem', sm: '0.68rem' } }}>
                              {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                            </Typography>
                          </Stack>
                        </Box>
                      </Paper>
                    </Box>
                  ))}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowAllActivityDialog(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!selectedStat} onClose={handleCloseStatDialog} fullWidth maxWidth="md">
            <DialogTitle>{selectedStat?.label ?? 'Details'}</DialogTitle>
            <DialogContent dividers>
              {selectedStat && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {selectedStat.description}
                </Typography>
              )}

              {isStatDialogLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : statDialogError ? (
                <Alert severity="error">{statDialogError}</Alert>
              ) : selectedStat?.source === 'history' ? (
                statGames.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No matching games yet.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {statGames.map((game) => (
                      <Paper key={game._id} variant="outlined" sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {game.whitePlayer.name} vs {game.blackPlayer.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {new Date(game.completedAt || game.updatedAt).toLocaleString()}
                            </Typography>
                            <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, flexWrap: 'wrap' }}>
                              <Chip label={getGameOutcomeLabel(game, user?._id, user?.username)} color={getGameOutcomeColor(game, user?._id, user?.username)} size="small" />
                              <Chip label={startCase(game.mode)} size="small" variant="outlined" />
                              <Chip label={`${game.moves.length} moves`} size="small" variant="outlined" />
                              <Chip label={formatTimeControlLabel(game.timeControl)} size="small" variant="outlined" />
                              {game.terminationReason && (
                                <Chip label={startCase(game.terminationReason)} size="small" variant="outlined" />
                              )}
                            </Stack>
                          </Box>
                          <Button size="small" variant="outlined" onClick={() => handleReviewGame(game._id)}>
                            Review
                          </Button>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )
              ) : statActivities.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No matching activity yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {statActivities.map((activity, index) => (
                    <Paper key={activity._id ?? `${activity.activityType}-${activity.createdAt ?? index}`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {getActivityTitle(activity)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {getActivitySummary(activity)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Unknown time'}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {selectedStat?.source === 'history' && (
                <Button onClick={() => { handleCloseStatDialog(); navigate('/history'); }}>
                  Open Full History
                </Button>
              )}
              <Button onClick={handleCloseStatDialog}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog open={!!selectedActivity} onClose={() => setSelectedActivity(null)} fullWidth maxWidth="sm">
            <DialogTitle>{selectedActivity ? getActivityTitle(selectedActivity) : 'Activity Details'}</DialogTitle>
            <DialogContent dividers>
              {selectedActivity && (
                <Stack spacing={1.25}>
                  {getActivityDetailRows(selectedActivity).map((row) => (
                    <Box key={`${row.label}-${row.value}`}>
                      <Typography variant="caption" color="text.secondary">
                        {row.label}
                      </Typography>
                      <Typography variant="body2">{row.value}</Typography>
                    </Box>
                  ))}

                  {selectedActivity.fen && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        FEN
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1,
                          mt: 0.5,
                          fontFamily: 'monospace',
                          fontSize: '0.78rem',
                          overflowX: 'auto',
                        }}
                      >
                        {selectedActivity.fen}
                      </Paper>
                    </Box>
                  )}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              {selectedActivity?.gameId && (
                <Button onClick={() => handleReviewGame(selectedActivity.gameId!)}>
                  Review Game
                </Button>
              )}
              <Button onClick={() => setSelectedActivity(null)}>Close</Button>
            </DialogActions>
          </Dialog>
        </>
      )}

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
            <Button variant="outlined" color="error" onClick={handleLogout}>
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
    </Box>
  );
};

export default SettingsPage;
