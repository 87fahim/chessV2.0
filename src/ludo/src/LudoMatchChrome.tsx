import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlagIcon from '@mui/icons-material/Flag';
import type { GameState, PlayerColor } from './types';
import { DEFAULT_PAINT_BY_SEAT, resolvePlayerPaintHex } from './playerPaint';
import { LudoToken } from './LudoToken';

/** Dev/test helpers in Match Control (force finish / end). Hidden in production builds. */
const SHOW_TEST_TOOLS = Boolean(import.meta.env.DEV);

type SetupCount = 2 | 3 | 4 | 5 | 6;
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
        minHeight: playing ? { xs: '100dvh', xl: '100%' } : '100%',
        p: playing ? { xs: 0, xl: 3 } : { xs: 2, sm: 3 },
        boxSizing: 'border-box',
        color: 'text.primary',
        overflow: playing ? { xs: 'hidden', xl: 'visible' } : 'visible',
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
  animPaused = false,
}: {
  children: React.ReactNode;
  seatPaintStyle?: React.CSSProperties;
  /** Pause decorative CSS animations while the tab is backgrounded. */
  animPaused?: boolean;
}) {
  return (
    <Paper
      elevation={0}
      className={animPaused ? 'board-wrap board-wrap--anim-paused' : 'board-wrap'}
      aria-label="Ludo board"
      style={seatPaintStyle}
      sx={{
        position: 'relative',
        overflow: 'visible',
        minWidth: 0,
        width: '100%',
        // Layout only — no plate chrome (shadow/border come from the board itself).
        borderRadius: 0,
        bgcolor: 'transparent',
        boxShadow: 'none',
        border: 'none',
      }}
    >
      <Box className="board-frame" style={seatPaintStyle}>
        {children}
      </Box>
    </Paper>
  );
}

export function LudoSessionHeader({
  showNewSession,
  onNewSession,
  hideOnMobilePlaying = true,
}: {
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
        p: { xs: 1.5, sm: 2 },
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
        display: hideOnMobilePlaying ? { xs: showNewSession ? 'none' : 'flex', xl: 'flex' } : 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', sm: '1.65rem' } }}>
          Ludo Game
        </Typography>
        <Stack direction="row" spacing={0.75} aria-label="Token preview" sx={{ alignItems: 'center' }}>
          <LudoToken color="red" variant="classic" size={28} />
          <LudoToken color="green" variant="classic" size={28} />
          <LudoToken color="yellow" variant="classic" size={28} />
          <LudoToken color="blue" variant="classic" size={28} />
        </Stack>
      </Stack>
      {showNewSession ? (
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<GroupAddIcon />}
          onClick={onNewSession}
          sx={{ fontWeight: 700, px: 2.5 }}
        >
          New Game
        </Button>
      ) : null}
    </Paper>
  );
}

/** Pick player count only (no names) and start immediately. */
export function LudoNewGameDialog({
  open,
  playerCount,
  onPlayerCountChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  playerCount: SetupCount;
  onPlayerCountChange: (count: SetupCount) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>New Game</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Choose how many players. Default names will be used.
        </DialogContentText>
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
          {[2, 3, 4, 5, 6].map((count) => (
            <ToggleButton key={count} value={count} sx={{ py: 1.25, fontWeight: 700 }}>
              {count}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm}>
          Start
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Confirm restart with the same players. */
export function LudoRestartDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Restart game?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This clears the current board and starts a fresh match with the same players.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="warning" onClick={onConfirm} startIcon={<RestartAltIcon />}>
          Restart
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Confirm removing a player from the current match. */
export function LudoWithdrawPlayerDialog({
  open,
  playerName,
  onClose,
  onConfirm,
}: {
  open: boolean;
  playerName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Remove player?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Remove <strong>{playerName}</strong> from this match? Their tokens leave the board and they
          will not take turns.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm} startIcon={<CloseIcon />}>
          Remove
        </Button>
      </DialogActions>
    </Dialog>
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
            {[2, 3, 4, 5, 6].map((count) => (
              <ToggleButton key={count} value={count} sx={{ py: 1.25, fontWeight: 700 }}>
                {count}
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
  canRoll,
  soundVolume,
  finishPlaceByPlayerId,
  error,
  autoRollByPlayerId,
  autoPlayByPlayerId,
  onRoll,
  onSoundVolumeChange,
  onRestart,
  onNewGame,
  onToggleAutoRoll,
  onToggleAutoPlay,
  onWithdrawPlayer,
  onForceFinishPlayer,
  onForceEndGame,
  onChangePlayerPaint,
  onChangePlayerName,
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
  autoPlayByPlayerId: Record<string, boolean>;
  onRoll: () => void;
  onSoundVolumeChange: (value: number) => void;
  onRestart: () => void;
  onNewGame: () => void;
  onToggleAutoRoll: (playerId: string, enabled: boolean) => void;
  onToggleAutoPlay: (playerId: string, enabled: boolean) => void;
  onWithdrawPlayer: (playerId: string) => void;
  onForceFinishPlayer: (playerId: string) => void;
  onForceEndGame: () => void;
  onChangePlayerPaint: (playerId: string, paintHex: string) => void;
  onChangePlayerName: (playerId: string, name: string) => void;
  onClose?: () => void;
  showClose: boolean;
}) {
  const activePlayerCount = game.players.filter((player) => !player.withdrawn).length;

  return (
    <Stack spacing={1.5} sx={{ p: 2, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
          Match Control
        </Typography>
        {showClose && onClose ? (
          <IconButton aria-label="Close menu" onClick={onClose} size="medium">
            <CloseIcon />
          </IconButton>
        ) : null}
      </Stack>

      <Button
        variant="contained"
        size="medium"
        startIcon={<CasinoIcon />}
        onClick={onRoll}
        disabled={!canRoll}
        sx={{ py: 1.1, fontWeight: 700, fontSize: '0.95rem' }}
      >
        Roll Dice
      </Button>

      <Paper variant="outlined" sx={{ px: 1.5, py: 1, bgcolor: 'action.hover' }}>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', lineHeight: 1.3, mb: 0.5 }}>
          Sound
        </Typography>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Slider
            size="medium"
            min={0}
            max={100}
            step={1}
            value={Math.round(soundVolume * 100)}
            aria-label="Sound volume"
            onChange={(_event, value) => onSoundVolumeChange((value as number) / 100)}
          />
          <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right', fontWeight: 700 }}>
            {Math.round(soundVolume * 100)}%
          </Typography>
        </Stack>
      </Paper>

      <Alert severity="info" icon={false} sx={{ py: 0.75, px: 1.5, '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
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

      <Divider sx={{ my: 0.5 }} />

      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, px: 0.25 }}>
        {SHOW_TEST_TOOLS
          ? 'Auto-roll · Auto-play · Finish (test)'
          : 'Auto-roll · Auto-play (roll+move)'}
      </Typography>

      <Stack spacing={0.75}>
        {game.players.map((player) => {
          const place = finishPlaceByPlayerId.get(player.id);
          const autoRoll = Boolean(autoRollByPlayerId[player.id]);
          const autoPlay = Boolean(autoPlayByPlayerId[player.id]);
          const paintHex = resolvePlayerPaintHex(player);
          const withdrawn = Boolean(player.withdrawn);
          const canRemove = !withdrawn && !place && activePlayerCount > 1;
          const canForceFinish =
            SHOW_TEST_TOOLS && game.status !== 'COMPLETED' && !withdrawn && !place;

          return (
            <Stack
              key={player.id}
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: 'center',
                minHeight: 40,
                opacity: withdrawn ? 0.45 : 1,
              }}
            >
              <Box
                component="input"
                type="color"
                value={paintHex}
                aria-label={`Color for ${player.name}`}
                disabled={withdrawn}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChangePlayerPaint(player.id, event.target.value)
                }
                sx={{
                  width: 28,
                  height: 28,
                  p: 0,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 0.75,
                  bgcolor: 'transparent',
                  cursor: withdrawn ? 'default' : 'pointer',
                  flexShrink: 0,
                  '&::-webkit-color-swatch-wrapper': { p: 0 },
                  '&::-webkit-color-swatch': { border: 'none', borderRadius: 0.5 },
                }}
              />
              <Tooltip title="Reset color">
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Reset color for ${player.name}`}
                    disabled={withdrawn || paintHex === DEFAULT_PAINT_BY_SEAT[player.color]}
                    onClick={() => onChangePlayerPaint(player.id, DEFAULT_PAINT_BY_SEAT[player.color])}
                    sx={{ p: 0.4 }}
                  >
                    <RestartAltIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <TextField
                size="small"
                variant="standard"
                value={withdrawn ? `${player.name} (out)` : player.name}
                disabled={withdrawn}
                onChange={(event) => onChangePlayerName(player.id, event.target.value)}
                slotProps={{
                  htmlInput: { maxLength: 24, 'aria-label': `Name for seat ${player.color}` },
                }}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  '& .MuiInputBase-input': {
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: paintHex,
                    py: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, fontWeight: 700, minWidth: place ? 22 : 0 }}>
                {place ? `#${place}` : null}
              </Typography>
              <Tooltip title="Auto roll dice only">
                <span>
                  <Checkbox
                    size="medium"
                    checked={autoRoll}
                    disabled={withdrawn || Boolean(place)}
                    onChange={(event) => onToggleAutoRoll(player.id, event.target.checked)}
                    slotProps={{ input: { 'aria-label': `Auto roll for ${player.name}` } }}
                    sx={{ p: 0.4 }}
                  />
                </span>
              </Tooltip>
              <Tooltip title="Auto play: roll and move">
                <span>
                  <Checkbox
                    size="medium"
                    checked={autoPlay}
                    disabled={withdrawn || Boolean(place)}
                    onChange={(event) => onToggleAutoPlay(player.id, event.target.checked)}
                    slotProps={{ input: { 'aria-label': `Auto play for ${player.name}` } }}
                    sx={{ p: 0.4 }}
                  />
                </span>
              </Tooltip>
              {SHOW_TEST_TOOLS ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  disabled={!canForceFinish}
                  onClick={() => onForceFinishPlayer(player.id)}
                  startIcon={<EmojiEventsIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    flexShrink: 0,
                    minWidth: 0,
                    px: 0.75,
                    py: 0.25,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    lineHeight: 1.2,
                  }}
                >
                  Finish
                </Button>
              ) : null}
              <Tooltip title={canRemove ? 'Remove player' : 'Cannot remove'}>
                <span>
                  <IconButton
                    size="small"
                    aria-label={`Remove ${player.name}`}
                    disabled={!canRemove}
                    onClick={() => onWithdrawPlayer(player.id)}
                    sx={{ p: 0.4 }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          );
        })}
      </Stack>

      {SHOW_TEST_TOOLS && game.status !== 'COMPLETED' ? (
        <Paper variant="outlined" sx={{ px: 1.5, py: 1.25, bgcolor: 'action.hover' }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
            Test tools
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.35 }}>
            Use <strong>Finish</strong> on a player row to test that seat’s place overlay. Use the button below for the full standings popup.
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            size="medium"
            color="warning"
            startIcon={<FlagIcon />}
            onClick={onForceEndGame}
            sx={{ fontWeight: 700 }}
          >
            Force end game
          </Button>
        </Paper>
      ) : null}

      <Box sx={{ flexGrow: 1 }} />

      <Stack spacing={1.25}>
        <Button variant="outlined" size="medium" color="warning" startIcon={<RestartAltIcon />} onClick={onRestart} sx={{ fontWeight: 700, py: 1 }}>
          Restart
        </Button>
        <Button variant="contained" size="medium" startIcon={<GroupAddIcon />} onClick={onNewGame} sx={{ fontWeight: 700, py: 1 }}>
          New Game
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ py: 0.75, '& .MuiAlert-message': { fontSize: '0.875rem' } }}>
          {error}
        </Alert>
      ) : null}
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
  autoPlayByPlayerId,
  menuOpen,
  onMenuOpen,
  onMenuClose,
  onRoll,
  onSoundVolumeChange,
  onRestart,
  onNewGame,
  onToggleAutoRoll,
  onToggleAutoPlay,
  onWithdrawPlayer,
  onForceFinishPlayer,
  onForceEndGame,
  onChangePlayerPaint,
  onChangePlayerName,
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
  autoPlayByPlayerId: Record<string, boolean>;
  menuOpen: boolean;
  onMenuOpen: () => void;
  onMenuClose: () => void;
  onRoll: () => void;
  onSoundVolumeChange: (value: number) => void;
  onRestart: () => void;
  onNewGame: () => void;
  onToggleAutoRoll: (playerId: string, enabled: boolean) => void;
  onToggleAutoPlay: (playerId: string, enabled: boolean) => void;
  onWithdrawPlayer: (playerId: string) => void;
  onForceFinishPlayer: (playerId: string) => void;
  onForceEndGame: () => void;
  onChangePlayerPaint: (playerId: string, paintHex: string) => void;
  onChangePlayerName: (playerId: string, name: string) => void;
  board: React.ReactNode;
}) {
  const theme = useTheme();
  // Tablets including iPad Pro use the drawer chrome (same as phones).
  const isMobile = useMediaQuery(theme.breakpoints.down('xl'));

  const controlProps = {
    game,
    currentPlayerName,
    canRoll,
    soundVolume,
    finishPlaceByPlayerId,
    finishedCounts,
    error,
    autoRollByPlayerId,
    autoPlayByPlayerId,
    onRoll,
    onSoundVolumeChange,
    onRestart,
    onNewGame,
    onToggleAutoRoll,
    onToggleAutoPlay,
    onWithdrawPlayer,
    onForceFinishPlayer,
    onForceEndGame,
    onChangePlayerPaint,
    onChangePlayerName,
  };

  return (
    <Box
      sx={{
        maxWidth: 1240,
        mx: 'auto',
        width: '100%',
        // Touch: fill shell + flex-center the board. Desktop: sidebar grid.
        height: { xs: '100%', xl: 'auto' },
        minHeight: { xs: '100%', xl: 0 },
        flex: { xs: 1, xl: 'unset' },
        minWidth: 0,
        position: 'relative',
        boxSizing: 'border-box',
        display: { xs: 'flex', xl: 'grid' },
        flexDirection: { xs: 'column' },
        justifyContent: { xs: 'center' },
        alignItems: { xs: 'center', xl: 'start' },
        gridTemplateColumns: { xl: 'minmax(300px, 340px) minmax(0, 1fr)' },
        gap: { xl: 2 },
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
          <Stack
            direction="column"
            spacing={0.75}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 3,
              alignItems: 'stretch',
            }}
          >
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={onRestart}
              startIcon={<RestartAltIcon />}
              sx={{ bgcolor: 'background.paper', fontWeight: 700, boxShadow: 1 }}
            >
              Restart
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={onNewGame}
              startIcon={<GroupAddIcon />}
              sx={{ fontWeight: 700, boxShadow: 1 }}
            >
              New
            </Button>
          </Stack>
          <Drawer
            anchor="left"
            open={menuOpen}
            onClose={onMenuClose}
            ModalProps={{ keepMounted: true }}
            sx={{
              // Keep drawer out of the flex flow so it cannot push the board to the top.
              position: 'absolute',
              width: 0,
              height: 0,
              overflow: 'visible',
              '& .MuiDrawer-paper': {
                width: 'min(360px, 92vw)',
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

      <Box
        sx={{
          minWidth: 0,
          maxWidth: '100%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: { xs: '0 1 auto', xl: 'unset' },
        }}
      >
        {board}
      </Box>
    </Box>
  );
}
