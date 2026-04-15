import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchSavedGames, deleteSavedGame } from '../features/savedGames/savedGamesSlice';

const SavedGamesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { savedGames, isLoading, error } = useAppSelector((s) => s.savedGames);
  const { isAuthenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchSavedGames());
  }, [dispatch, isAuthenticated]);

  const handleDelete = (id: string) => {
    dispatch(deleteSavedGame(id));
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Sign in to save and manage your games.
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
        Saved Games
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : savedGames.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No saved games yet. Play a game and save it!</Typography>
          <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/play')}>
            Play vs Computer
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {savedGames.map((game) => (
            <Paper key={game._id} elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {game.label || `${game.whitePlayer.name} vs ${game.blackPlayer.name}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                  <Chip label={game.mode} size="small" />
                  <Chip label={game.status} size="small" variant="outlined" />
                  {game.difficulty && <Chip label={game.difficulty} size="small" variant="outlined" />}
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                    {game.moves.length} moves · {new Date(game.updatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title="Resume game">
                <IconButton color="primary" onClick={() => navigate(`/play?resume=${game._id}`)}>
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton color="error" onClick={() => handleDelete(game._id)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SavedGamesPage;
