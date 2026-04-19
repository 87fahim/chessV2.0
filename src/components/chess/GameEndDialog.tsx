import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Divider,
  Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';

export interface GameEndDialogProps {
  open: boolean;
  /** '1-0' | '0-1' | '1/2-1/2' */
  result: string | null;
  /** 'checkmate' | 'resignation' | 'timeout' | 'stalemate' | 'draw_agreement' | 'repetition' | 'insufficient_material' | 'abandonment' */
  reason?: string;
  /** Player's color: 'w' | 'white' | 'b' | 'black' */
  playerColor?: string;
  /** Game mode — drives which buttons to show */
  mode: 'vs-computer' | 'online';
  /** Whether a rematch request is pending (online) */
  rematchPending?: boolean;
  /** Whether a rematch was declined (online) */
  rematchDeclined?: boolean;
  /** Specific reason why rematch was declined/expired */
  rematchDeclineReason?: string | null;
  onRematch: () => void;
  onNewGame: () => void;
  onClose: () => void;
}

function normalizeColor(c?: string): 'w' | 'b' {
  if (c === 'white' || c === 'w') return 'w';
  return 'b';
}

function getOutcome(result: string | null, playerColor?: string): 'win' | 'loss' | 'draw' {
  if (!result || result === '*') return 'draw';
  if (result === '1/2-1/2') return 'draw';
  const c = normalizeColor(playerColor);
  if ((c === 'w' && result === '1-0') || (c === 'b' && result === '0-1')) return 'win';
  return 'loss';
}

function getReasonLabel(reason?: string): string {
  switch (reason) {
    case 'checkmate': return 'Checkmate';
    case 'resignation': return 'Resignation';
    case 'timeout': return 'Time Out';
    case 'stalemate': return 'Stalemate';
    case 'draw_agreement': return 'Draw by Agreement';
    case 'repetition': return 'Threefold Repetition';
    case 'insufficient_material': return 'Insufficient Material';
    case 'abandonment': return 'Abandonment';
    default: return '';
  }
}

const outcomeConfig = {
  win: { label: 'You Win!', color: 'success' as const, icon: <EmojiEventsIcon sx={{ fontSize: 48 }} /> },
  loss: { label: 'You Lose', color: 'error' as const, icon: <SentimentVeryDissatisfiedIcon sx={{ fontSize: 48 }} /> },
  draw: { label: 'Draw', color: 'warning' as const, icon: <HandshakeIcon sx={{ fontSize: 48 }} /> },
};

const GameEndDialog: React.FC<GameEndDialogProps> = ({
  open,
  result,
  reason,
  playerColor,
  mode,
  rematchPending,
  rematchDeclined,
  rematchDeclineReason,
  onRematch,
  onNewGame,
  onClose,
}) => {
  const outcome = getOutcome(result, playerColor);
  const cfg = outcomeConfig[outcome];
  const reasonLabel = getReasonLabel(reason);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: 'visible' },
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pb: 0, pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{ color: `${cfg.color}.main` }}>{cfg.icon}</Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {cfg.label}
          </Typography>
          {reasonLabel && (
            <Chip label={reasonLabel} size="small" color={cfg.color} variant="outlined" />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pt: 2, pb: 1 }}>
        <Typography variant="body1" color="text.secondary">
          {result === '1-0' ? 'White wins' : result === '0-1' ? 'Black wins' : 'Game drawn'}
        </Typography>

        {rematchDeclined && (
          <Typography variant="body2" color="error.main" sx={{ mt: 1.5, fontWeight: 600 }}>
            {rematchDeclineReason || 'Rematch was declined by your opponent.'}
          </Typography>
        )}
      </DialogContent>

      <Divider sx={{ mx: 2 }} />

      <DialogActions sx={{ justifyContent: 'center', gap: 1, p: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={onRematch}
          disabled={rematchPending || rematchDeclined}
        >
          {rematchPending ? 'Waiting for opponent...' : rematchDeclined ? 'Rematch Unavailable' : 'Rematch'}
        </Button>
        <Button variant="outlined" onClick={onNewGame}>
          New Game
        </Button>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameEndDialog;
