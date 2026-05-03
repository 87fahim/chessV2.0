import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { Chess } from 'chess.js';
import ChessBoard from '../../components/chess/ChessBoard';
import BoardLayout from '../../components/chess/BoardLayout';
import ZoomControls from '../../components/chess/ZoomControls';
import { useBoardZoom } from '../../hooks/useBoardZoom';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { loadPosition, flipBoard, moveMade } from '../../features/game/gameSlice';
import { DEFAULT_FEN, isValidFen } from '../../lib/chess/fen';
import { makeMove } from '../../lib/chess/moveUtils';
import type { PieceColor } from '../../types/chess';
import { userApi } from '../../services/userService';
import { useGameSounds } from '../../hooks/useGameSounds';

const PracticePage: React.FC = () => {
  const zoom = useBoardZoom();
  const dispatch = useAppDispatch();
  const { fen } = useAppSelector((s) => s.game);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [fenInput, setFenInput] = useState(fen);
  const [fenError, setFenError] = useState('');
  const { playIllegalMove, playMoveOutcome } = useGameSounds();

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
      if (!result || !result.san) {
        playIllegalMove();
        return;
      }

      playMoveOutcome({
        san: result.san,
        captured: !!result.captured,
        promotion: result.promotion,
        isCheck: game.isCheck(),
        isCheckmate: game.isCheckmate(),
      });

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
    [fen, dispatch, playIllegalMove, playMoveOutcome],
  );

  return (
    <BoardLayout
      panelWidth={420}
      boardColRef={zoom.boardColRef}
      boardWidth={zoom.boardWidth}
      board={<>
        <ChessBoard onMove={handleMove} />
      </>}
      panel={<>
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontSize: { xs: '0.95rem', lg: '1.2rem' }, fontWeight: 600 }}>
            FEN Position
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'flex-start' }}>
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
              <IconButton onClick={handleCopyFen} size="small" sx={{ width: 36, height: 36, flex: '0 0 auto' }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Button variant="contained" size="small" onClick={handleLoadFen} fullWidth>
            Load FEN
          </Button>
        </Paper>

        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: { xs: '0.95rem', lg: '1.15rem' }, fontWeight: 700, mb: 0.75 }}>
            Controls
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, rowGap: 0.5, alignItems: 'center', flexWrap: 'wrap', overflowX: 'visible' }}>
            <Tooltip title="Flip Board">
              <IconButton onClick={() => dispatch(flipBoard())} size="small" sx={{ p: 0.4 }}>
                <SwapVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Board">
              <IconButton onClick={handleReset} size="small" sx={{ p: 0.4 }}>
                <RestartAltIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <ZoomControls
              onZoomIn={zoom.handleZoomIn}
              onZoomOut={zoom.handleZoomOut}
              canZoomIn={zoom.canZoomIn}
              canZoomOut={zoom.canZoomOut}
              zoomPercent={zoom.zoomPercent}
            />
          </Box>
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
      </>}
    />
  );
};

export default PracticePage;
