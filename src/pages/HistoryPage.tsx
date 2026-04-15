import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Pagination,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchHistory } from '../features/savedGames/savedGamesSlice';

const PAGE_SIZE = 10;

const HistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { historyGames, historyTotal, isLoading, error } = useAppSelector((s) => s.savedGames);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHistory({ page, limit: PAGE_SIZE }));
    }
  }, [dispatch, isAuthenticated, page]);

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE);

  const resultLabel = (result: string) => {
    if (result === '1-0') return { label: 'White wins', color: 'success' as const };
    if (result === '0-1') return { label: 'Black wins', color: 'error' as const };
    if (result === '1/2-1/2') return { label: 'Draw', color: 'default' as const };
    return { label: 'In progress', color: 'info' as const };
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Sign in to view your game history.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
          Sign In
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Game History
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : historyGames.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No completed games yet.</Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {historyGames.map((game) => {
              const r = resultLabel(game.result);
              return (
                <Paper key={game._id} elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {game.whitePlayer.name} vs {game.blackPlayer.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={r.label} color={r.color} size="small" />
                      <Chip label={game.mode} size="small" variant="outlined" />
                      {game.terminationReason && (
                        <Chip label={game.terminationReason} size="small" variant="outlined" />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        {game.moves.length} moves ·{' '}
                        {new Date(game.completedAt || game.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => navigate(`/history/${game._id}`)}
                  >
                    Review
                  </Button>
                </Paper>
              );
            })}
          </Box>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default HistoryPage;
