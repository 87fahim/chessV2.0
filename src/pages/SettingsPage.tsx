import React, { useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Piece from '../components/chess/Piece';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { saveSettings, setLocalSetting } from '../features/settings/settingsSlice';
import { logout } from '../features/auth/authSlice';
import { fetchRecentActivity } from '../features/auth/userSlice';
import {
  BOARD_COLOR_THEME_OPTIONS,
  BOARD_TEXTURE_OPTIONS,
  getBoardSquareBackground,
  getMoveColorTheme,
  MOVE_COLOR_THEME_OPTIONS,
  resolveBoardThemeId,
  resolveMoveColorThemeId,
} from '../lib/chess/boardTheme';
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
        minWidth: `${metrics.sectionWidth + LIVE_PREVIEW_SIZE + 16}px`,
        maxWidth: '100%',
        flex: '0 0 auto',
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
          alignItems: 'flex-start',
          gap: 1.5,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
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

        <Box sx={{ flex: '0 0 auto' }}>
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
          width: `${sectionWidth}px`,
          minWidth: `${sectionWidth}px`,
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

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
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

  const statPairs = useMemo(
    () => [
      ['Games Played', stats?.gamesPlayed ?? 0],
      ['Wins', stats?.wins ?? 0],
      ['Losses', stats?.losses ?? 0],
      ['Draws', stats?.draws ?? 0],
      ['Online Games', stats?.onlineGamesPlayed ?? 0],
      ['Practice Sessions', stats?.practiceSessions ?? 0],
      ['Analysis Requests', stats?.analysisRequests ?? 0],
    ],
    [stats],
  );

  return (
    <Box sx={{ p: 3, maxWidth: 760 }}>
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
            <MenuItem value="1+0">1+0</MenuItem>
            <MenuItem value="3+0">3+0</MenuItem>
            <MenuItem value="3+2">3+2</MenuItem>
            <MenuItem value="5+0">5+0</MenuItem>
            <MenuItem value="10+0">10+0</MenuItem>
            <MenuItem value="15+10">15+10</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel control={<Switch checked={settings.soundEnabled ?? true} onChange={(e) => handleSettingsChange('soundEnabled', e.target.checked)} />} label="Enable Sounds" />
        <FormControlLabel control={<Switch checked={settings.animationEnabled ?? true} onChange={(e) => handleSettingsChange('animationEnabled', e.target.checked)} />} label="Enable Animation" />
        <FormControlLabel control={<Switch checked={settings.autoPromotion ?? true} onChange={(e) => handleSettingsChange('autoPromotion', e.target.checked)} />} label="Auto Promotion" />
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
              minWidth: `${boardSectionWidth + LIVE_PREVIEW_SIZE + 16}px`,
              maxWidth: '100%',
              flex: '0 0 auto',
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
                alignItems: 'flex-start',
                gap: 1.5,
                flexWrap: { xs: 'wrap', md: 'nowrap' },
              }}
            >
              <Box sx={{ width: `${boardSectionWidth}px`, minWidth: `${boardSectionWidth}px` }}>
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

              <Box sx={{ flex: '0 0 auto' }}>
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

        <FormControlLabel control={<Switch checked={settings.showCoordinates ?? false} onChange={(e) => handleSettingsChange('showCoordinates', e.target.checked)} />} label="Show Coordinates" />
        <FormControlLabel control={<Switch checked={settings.showLegalMoves ?? true} onChange={(e) => handleSettingsChange('showLegalMoves', e.target.checked)} />} label="Show Legal Moves" />
        <FormControlLabel control={<Switch checked={settings.highlightLastMove ?? true} onChange={(e) => handleSettingsChange('highlightLastMove', e.target.checked)} />} label="Highlight Last Move" />
        <FormControlLabel control={<Switch checked={settings.highlightCheck ?? true} onChange={(e) => handleSettingsChange('highlightCheck', e.target.checked)} />} label="Highlight Check" />
        <FormControlLabel control={<Switch checked={settings.boardFlipped ?? false} onChange={(e) => handleSettingsChange('boardFlipped', e.target.checked)} />} label="Flip Board By Default" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Notifications
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <FormControlLabel control={<Switch checked={settings.inviteNotifications ?? true} onChange={(e) => handleSettingsChange('inviteNotifications', e.target.checked)} />} label="Invite Notifications" />
        <FormControlLabel control={<Switch checked={settings.matchNotifications ?? true} onChange={(e) => handleSettingsChange('matchNotifications', e.target.checked)} />} label="Match Notifications" />
        <FormControlLabel control={<Switch checked={settings.emailNotifications ?? false} onChange={(e) => handleSettingsChange('emailNotifications', e.target.checked)} />} label="Email Notifications" />
      </Paper>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
          Profile And Social
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Profile identity, friends, blocks, invites, and privacy controls now live on dedicated pages.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
            Stats And Activity
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, gap: 1, mb: 2 }}>
            {statPairs.map(([label, value]) => (
              <Paper key={label} variant="outlined" sx={{ p: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Recent Activity
          </Typography>
          {recentActivities.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No recent activity yet.
            </Typography>
          ) : (
            recentActivities.slice(0, 8).map((event, idx) => (
              <Typography key={idx} variant="body2" sx={{ mb: 0.5 }}>
                {(event.activityType as string) || 'event'} via {(event.feature as string) || 'system'}
              </Typography>
            ))
          )}
        </Paper>
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
            <Box sx={{ display: 'flex', gap: 1 }}>
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
