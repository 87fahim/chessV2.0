import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Chess } from 'chess.js';
import ChessBoard from '../../components/chess/ChessBoard';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { loadPosition, flipBoard, moveMade } from '../../features/game/gameSlice';
import { DEFAULT_FEN, isValidFen } from '../../lib/chess/fen';
import { makeMove } from '../../lib/chess/moveUtils';
import type { PieceColor } from '../../types/chess';
import { userApi } from '../../services/userService';

const PracticePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { fen } = useAppSelector((s) => s.game);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [fenInput, setFenInput] = useState(fen);
  const [fenError, setFenError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    userApi.recordActivity({
      activityType: 'practice_session',
      feature: 'practice',
      fen,
      metadata: { source: 'practice_page' },
    }).catch(() => undefined);
  }, [isAuthenticated]);

  const handleLoadFen = () => {
    if (isValidFen(fenInput)) {
      dispatch(loadPosition(fenInput));
      setFenError('');
    } else {
      setFenError('Invalid FEN string');
    }
  };

  const handleReset = () => {
    dispatch(loadPosition(DEFAULT_FEN));
    setFenInput(DEFAULT_FEN);
    setFenError('');
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
  };

  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      const game = new Chess(fen);
      const result = makeMove(game, from, to, promotion);
      if (!result || !result.san) return;
      dispatch(
        moveMade({
          fen: game.fen(),
          san: result.san,
          from: result.from,
          to: result.to,
          captured: result.captured,
          color: result.color as PieceColor,
        }),
      );
      setFenInput(game.fen());
    },
    [fen, dispatch],
  );

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 1.5, lg: 3 },
        p: { xs: 1, lg: 2 },
        height: '100%',
        flexDirection: { xs: 'column', lg: 'row' },
      }}
    >
      <Box
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          '@media (max-width:1023.95px)': {
            px: '80px',
            boxSizing: 'border-box',
          },
        }}
      >
        <ChessBoard onMove={handleMove} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Flip Board">
            <IconButton onClick={() => dispatch(flipBoard())} size="small">
              <SwapVertIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset Board">
            <IconButton onClick={handleReset} size="small">
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          flex: { xs: '1 1 auto', lg: '0 1 420px' },
          width: { xs: '100%', lg: 420 },
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.95rem', lg: '1.2rem' }, fontWeight: 600 }}>
            FEN Position
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={fenInput}
              onChange={(e) => {
                setFenInput(e.target.value);
                setFenError('');
              }}
              error={!!fenError}
              helperText={fenError}
              placeholder="Enter FEN..."
            />
            <Tooltip title="Copy FEN">
              <IconButton onClick={handleCopyFen} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button variant="contained" size="small" onClick={handleLoadFen} fullWidth>
            Load FEN
          </Button>
        </Paper>

        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', lg: '1.2rem' }, fontWeight: 600 }}>
            Practice Mode
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontSize: { xs: '0.95rem', lg: '1.08rem' } }}>
            Move any piece freely. Use the FEN input to load specific positions.
            Both sides can be played.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

};

export default PracticePage;
