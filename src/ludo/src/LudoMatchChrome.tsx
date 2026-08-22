import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import MenuIcon from '@mui/icons-material/Menu';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CasinoIcon from '@mui/icons-material/Casino';
import type { GameState, PlayerColor } from './types';
import { DEFAULT_PAINT_BY_SEAT, resolvePlayerPaintHex } from './playerPaint';
import { LudoToken } from './LudoToken';

type SetupCount = 2 | 3 | 4;
type SetupStep = 'count' | 'names';

const COLOR_HEX = DEFAULT_PAINT_BY_SEAT;

/** Full-page Material UI shell; keeps app-shell classes for board media-query layout. */
export function LudoPageShell({
  playing,
  seatPaintStyle,
  children,
}: {
  playing: boolean;
  seatPaintStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="main"
      className={playing ? 'app-shell app-shell--playing' : 'app-shell'}
      style={seatPaintStyle}
      sx={{
        minHeight: playing ? { xs: '100dvh', md: '100%' } : '100%',
        p: playing ? { xs: 0, md: 3 } : { xs: 2, sm: 3 },
        boxSizing: 'border-box',
        color: 'text.primary',
        overflow: playing ? { xs: 'hidden', md: 'visible' } : 'visible',
        background: (theme) =>
          [
            `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.info.light, 0.45)} 0, transparent 48%)`,
            `radial-gradient(circle at 92% 22%, ${alpha(theme.palette.warning.light, 0.35)} 0, transparent 42%)`,
            `linear-gradient(180deg, ${theme.palette.grey[50]} 0%, ${alpha(theme.palette.primary.light, 0.12)} 100%)`,
          ].join(', '),
      }}
    >
      {children}
    </Box>
  );
}

/** MUI plate around the board; board-wrap/board-frame classes keep CSS tile variables. */
export function LudoBoardSurface({
  children,
  seatPaintStyle,
}: {
  children: React.ReactNode;
  seatPaintStyle?: React.CSSProperties;
}) {
  return (
    <Paper
      elevation={2}
      className="board-wrap"
      aria-label="Ludo board"
      style={seatPaintStyle}
      sx={{
        position: 'relative',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'grey.50',
        overflow: 'visible',
        minWidth: 0,
        width: '100%',
      }}
    >
      <Box className="board-frame" style={seatPaintStyle}>
        {children}
      </Box>
    </Paper>
  );
}

export function LudoSessionHeader({
  currentPlayer,
  showNewSession,
  onNewSession,
  hideOnMobilePlaying = true,
}: {
  currentPlayer: { name: string; color: PlayerColor; paintHex?: string } | null;
  showNewSession: boolean;
  onNewSession: () => void;
  hideOnMobilePlaying?: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 1240,
        mx: 'auto',
        mb: 2.5,
        p: { xs: 2, sm: 2.5 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
        display: hideOnMobilePlaying ? { xs: showNewSession ? 'none' : 'flex', md: 'flex' } : 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ minWidth: 0, flex: '1 1 240px' }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: '0.12em', fontWeight: 700, color: 'primary.main' }}
        >
          Ludo Online
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, alignItems: 'center' }}>
          {currentPlayer ? (
            <Box
              component="span"
              aria-label={`Current player: ${currentPlayer.name}`}
              sx={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: currentPlayer.paintHex
                  ? currentPlayer.paintHex
                  : COLOR_HEX[currentPlayer.color],
                boxShadow: '0 0 0 2px rgba(15, 23, 42, 0.08)',
                flexShrink: 0,
              }}
            />
          ) : null}
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Production Session Board
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          Local session board with autosave on every accepted move
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} aria-label="Token preview">
          <LudoToken color="red" variant="classic" size={32} />
          <LudoToken color="green" variant="flat" size={32} />
          <LudoToken color="blue" variant="glass" size={32} />
          <LudoToken color="yellow" variant="classic" selected size={32} />
        </Stack>
      </Box>
      {showNewSession ? (
        <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={onNewSession}>
          New Session
        </Button>
      ) : null}
    </Paper>
  );
}

export function LudoLoadingPanel() {
  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 520,
        mx: 'auto',
        p: 3,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          mx: 'auto',
          mb: 2,
          animation: 'ludoPulse 1s ease-in-out infinite',
          '@keyframes ludoPulse': {
            '0%, 100%': { opacity: 0.35, transform: 'scale(0.85)' },
            '50%': { opacity: 1, transform: 'scale(1)' },
          },
        }}
      />
      <Typography>Checking for an active local session...</Typography>
    </Paper>
  );
}

export function LudoSetupPanel({
  setupStep,
  playerCount,
  names,
  nameErrors,
  editingNameIndex,
  error,
  colorsForCount,
  onPlayerCountChange,
  onContinueToNames,
  onBackToCount,
  onCreateGame,
  onUpdateName,
  onStartEditName,
  onStopEditName,
}: {
  setupStep: SetupStep;
  playerCount: SetupCount;
  names: string[];
  nameErrors: string[];
  editingNameIndex: number | null;
  error: string | null;
  colorsForCount: PlayerColor[];
  onPlayerCountChange: (count: SetupCount) => void;
  onContinueToNames: () => void;
  onBackToCount: () => void;
  onCreateGame: () => void;
  onUpdateName: (index: number, value: string) => void;
  onStartEditName: (index: number) => void;
  onStopEditName: () => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        maxWidth: 560,
        mx: 'auto',
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        Create New Game
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Set player count, edit names, then confirm.
      </Typography>

      {setupStep === 'count' ? (
        <Stack spacing={2.5}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            How many players?
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            color="primary"
            value={playerCount}
            onChange={(_event, value: SetupCount | null) => {
              if (value) onPlayerCountChange(value);
            }}
            aria-label="Player count"
          >
            {[2, 3, 4].map((count) => (
              <ToggleButton key={count} value={count} sx={{ py: 1.25, fontWeight: 700 }}>
                {count} Players
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button variant="contained" size="large" onClick={onContinueToNames}>
            Continue
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Player Names
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click a name to edit. Press Enter to save.
          </Typography>

          <Stack spacing={1.5}>
            {names.slice(0, playerCount).map((name, index) => {
              const color = colorsForCount[index];
              const isEditing = editingNameIndex === index;

              return (
                <Paper
                  key={color}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    borderLeft: 4,
                    borderLeftColor: COLOR_HEX[color],
                  }}
                >
                  <Chip
                    size="small"
                    label={color}
                    sx={{
                      textTransform: 'capitalize',
                      fontWeight: 700,
                      bgcolor: `${COLOR_HEX[color]}22`,
                      color: 'text.primary',
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <TextField
                        autoFocus
                        fullWidth
                        size="small"
                        value={name}
                        onChange={(event) => onUpdateName(index, event.target.value)}
                        onBlur={onStopEditName}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === 'Escape') {
                            onStopEditName();
                          }
                        }}
                        aria-label={`Edit name for player ${index + 1}`}
                        error={Boolean(nameErrors[index])}
                        helperText={nameErrors[index] || undefined}
                      />
                    ) : (
                      <>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() => onStartEditName(index)}
                          sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                        >
                          {name || `Player ${index + 1}`}
                        </Button>
                        {nameErrors[index] ? (
                          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.75, ml: 0.5 }}>
                            {nameErrors[index]}
                          </Typography>
                        ) : null}
                      </>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ pt: 1, justifyContent: 'space-between' }}>
            <Button variant="outlined" onClick={onBackToCount}>
              Back
            </Button>
            <Button variant="contained" size="large" onClick={onCreateGame}>
              OK, Start Game
            </Button>
          </Stack>
        </Stack>
      )}

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}
    </Paper>
  );
}

function MatchControlBody({
  game,
  currentPlayerName,
  canRoll,
  soundVolume,
  finishPlaceByPlayerId,
  finishedCounts,
  error,
  autoRollByPlayerId,
  onRoll,
  onSoundVolumeChange,
  onNewSession,
  onToggleAutoRoll,
  onChangePlayerPaint,
  onClose,
  showClose,
}: {
  game: GameState;
  currentPlayerName: string;
  canRoll: boolean;
  soundVolume: number;
  finishPlaceByPlayerId: Map<string, number>;
  finishedCounts: Record<PlayerColor, number>;
  error: string | null;
  autoRollByPlayerId: Record<string, boolean>;
  onRoll: () => void;
  onSoundVolumeChange: (value: number) => void;
  onNewSession: () => void;
  onToggleAutoRoll: (playerId: string, enabled: boolean) => void;
  onChangePlayerPaint: (playerId: string, paintHex: string) => void;
  onClose?: () => void;
  showClose: boolean;
}) {
  const turnPlayer = game.players.find((entry) => entry.id === game.currentPlayerId);
  const turnPaint = turnPlayer ? resolvePlayerPaintHex(turnPlayer) : undefined;

  return (
    <Stack spacing={1.75} sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Match Control
        </Typography>
        {showClose && onClose ? (
          <IconButton aria-label="Close menu" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        ) : null}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Session ID: {game.id.slice(0, 8)}
      </Typography>
      <Typography variant="body2">
        Turn:{' '}
        <Box component="strong" sx={{ color: turnPaint ?? 'inherit' }}>
          {currentPlayerName}
        </Box>
      </Typography>
      <Typography variant="body2">
        Dice: <strong>{game.pendingRoll ?? game.lastDiceRoll ?? '-'}</strong>
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<CasinoIcon />}
        onClick={onRoll}
        disabled={!canRoll}
      >
        Roll Dice
      </Button>

      <Paper variant="outlined" sx={{ px: 1.5, py: 1, bgcolor: 'action.hover' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Sound
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Slider
            size="small"
            min={0}
            max={100}
            step={1}
            value={Math.round(soundVolume * 100)}
            aria-label="Sound volume"
            onChange={(_event, value) => onSoundVolumeChange((value as number) / 100)}
          />
          <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'right', fontWeight: 700 }}>
            {Math.round(soundVolume * 100)}%
          </Typography>
        </Stack>
      </Paper>

      <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
        {game.message}
      </Alert>

      {game.finishOrder?.length ? (
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
          {game.status === 'COMPLETED' ? 'Final standings' : 'Finished'}:{' '}
          {game.finishOrder
            .map((playerId, index) => {
              const player = game.players.find((entry) => entry.id === playerId);
              return player ? `#${index + 1} ${player.name}` : null;
            })
            .filter(Boolean)
            .join(' · ')}
        </Typography>
      ) : null}

      <Divider />

      <Stack spacing={0.5}>
        {game.players.map((player) => {
          const place = finishPlaceByPlayerId.get(player.id);
          const autoRoll = Boolean(autoRollByPlayerId[player.id]);
          const paintHex = resolvePlayerPaintHex(player);

          return (
            <Stack
              key={player.id}
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', minHeight: 28 }}
            >
              <Box
                component="input"
                type="color"
                value={paintHex}
                aria-label={`Color for ${player.name}`}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChangePlayerPaint(player.id, event.target.value)
                }
                sx={{
                  width: 22,
                  height: 22,
                  p: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0,
                  '&::-webkit-color-swatch-wrapper': { p: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: 0.5 },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: paintHex,
                }}
              >
                {player.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                {place ? `#${place}` : `${finishedCounts[player.color]}/4`}
              </Typography>
              <Tooltip title="Auto roll">
                <Checkbox
                  size="small"
                  checked={autoRoll}
                  onChange={(event) => onToggleAutoRoll(player.id, event.target.checked)}
                  slotProps={{ input: { 'aria-label': `Auto roll for ${player.name}` } }}
                  sx={{ p: 0.25 }}
                />
              </Tooltip>
            </Stack>
          );
        })}
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={onNewSession}>
        New Session
      </Button>

      {error ? <Alert severity="error">{error}</Alert> : null}
    </Stack>
  );
}

export function LudoMatchLayout({
  game,
  currentPlayerName,
  canRoll,
  soundVolume,
  finishPlaceByPlayerId,
  finishedCounts,
  error,
  autoRollByPlayerId,
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onRoll,
  onSoundVolumeChange,
  onNewSession,
  onToggleAutoRoll,
  onChangePlayerPaint,
  board,
}: {
  game: GameState;
  currentPlayerName: string;
  canRoll: boolean;
  soundVolume: number;
  finishPlaceByPlayerId: Map<string, number>;
  finishedCounts: Record<PlayerColor, number>;
  error: string | null;
  autoRollByPlayerId: Record<string, boolean>;
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onRoll: () => void;
  onSoundVolumeChange: (value: number) => void;
  onNewSession: () => void;
  onToggleAutoRoll: (playerId: string, enabled: boolean) => void;
  onChangePlayerPaint: (playerId: string, paintHex: string) => void;
  board: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const controlProps = {
    game,
    currentPlayerName,
    canRoll,
    soundVolume,
    finishPlaceByPlayerId,
    finishedCounts,
    error,
    autoRollByPlayerId,
    onRoll,
    onSoundVolumeChange,
    onNewSession,
    onToggleAutoRoll,
    onChangePlayerPaint,
  };

  return (
    <Box
      sx={{
        maxWidth: 1240,
        mx: 'auto',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 280px) minmax(0, 1fr)' },
        gap: 2,
        alignItems: 'start',
        position: 'relative',
      }}
    >
      {isMobile ? (
        <>
          <IconButton
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={onMenuOpen}
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            anchor="left"
            open={menuOpen}
            onClose={onMenuClose}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 'min(320px, 88vw)',
                boxSizing: 'border-box',
              },
            }}
          >
            <MatchControlBody {...controlProps} showClose onClose={onMenuClose} />
          </Drawer>
        </>
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.92)',
            position: 'sticky',
            top: 8,
            maxHeight: 'calc(100vh - 24px)',
            overflow: 'auto',
          }}
        >
          <MatchControlBody {...controlProps} showClose={false} />
        </Paper>
      )}

      <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{board}</Box>
    </Box>
  );
}
