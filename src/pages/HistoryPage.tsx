import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Pagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/useStore';
import { fetchHistory } from '../features/savedGames/savedGamesSlice';

const PAGE_SIZE = 10;

interface Filters {
  mode: string;
  result: string;
  color: string;
  dateFrom: string;
  dateTo: string;
  opponent: string;
}

const EMPTY_FILTERS: Filters = {
  mode: '',
  result: '',
  color: '',
  dateFrom: '',
  dateTo: '',
  opponent: '',
};

function formatTimeControl(tc?: { initialMs: number; incrementMs: number }): string {
  if (!tc) return 'Unlimited';
  const base = Math.round(tc.initialMs / 60000);
  const inc = Math.round(tc.incrementMs / 1000);
  return inc > 0 ? `${base}+${inc}` : `${base} min`;
}

function formatDuration(createdAt: string, completedAt?: string, updatedAt?: string): string {
  const end = completedAt || updatedAt;
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(createdAt).getTime();
  if (ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function resultChip(result: string): { label: string; color: 'success' | 'error' | 'default' | 'warning' } {
  if (result === '1-0') return { label: 'White wins', color: 'success' };
  if (result === '0-1') return { label: 'Black wins', color: 'error' };
  if (result === '1/2-1/2') return { label: 'Draw', color: 'default' };
  return { label: 'In progress', color: 'warning' };
}

const HistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { historyGames, historyTotal, isLoading, error } = useAppSelector((s) => s.savedGames);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const buildParams = useCallback(
    (f: Filters, p: number) => {
      const params: Record<string, string | number> = { page: p, limit: PAGE_SIZE };
      if (f.mode) params.mode = f.mode;
      if (f.result) params.result = f.result;
      if (f.color) params.color = f.color;
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo) params.dateTo = f.dateTo;
      if (f.opponent) params.opponent = f.opponent;
      return params;
    },
    [],
  );

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchHistory(buildParams(appliedFilters, page)));
    }
  }, [dispatch, isAuthenticated, page, appliedFilters, buildParams]);

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE);

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

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
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 860 }}>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          Game History
        </Typography>
        <Tooltip title="Filters">
          <IconButton onClick={() => setFiltersOpen((o) => !o)} color={hasActiveFilters ? 'primary' : 'default'}>
            <FilterListIcon />
          </IconButton>
        </Tooltip>
        {hasActiveFilters && (
          <Tooltip title="Clear filters">
            <IconButton onClick={handleClearFilters} size="small" color="warning">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Filter panel */}
      <Collapse in={filtersOpen}>
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
            <TextField
              label="Opponent"
              size="small"
              value={filters.opponent}
              onChange={(e) => setFilters((f) => ({ ...f, opponent: e.target.value }))}
              sx={{ minWidth: 140 }}
              placeholder="Search by name"
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Mode</InputLabel>
              <Select
                value={filters.mode}
                label="Mode"
                onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="online">Online</MenuItem>
                <MenuItem value="computer">vs Computer</MenuItem>
                <MenuItem value="local">Local</MenuItem>
                <MenuItem value="analysis">Analysis</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Result</InputLabel>
              <Select
                value={filters.result}
                label="Result"
                onChange={(e) => setFilters((f) => ({ ...f, result: e.target.value }))}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="1-0">White wins</MenuItem>
                <MenuItem value="0-1">Black wins</MenuItem>
                <MenuItem value="1/2-1/2">Draw</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Color</InputLabel>
              <Select
                value={filters.color}
                label="Color"
                onChange={(e) => setFilters((f) => ({ ...f, color: e.target.value }))}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="white">White</MenuItem>
                <MenuItem value="black">Black</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="From date"
              type="date"
              size="small"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="To date"
              type="date"
              size="small"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <Button variant="contained" size="small" onClick={handleApplyFilters}>
              Apply
            </Button>
            <Button variant="outlined" size="small" onClick={handleClearFilters}>
              Clear
            </Button>
          </Box>
        </Paper>
      </Collapse>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : historyGames.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {hasActiveFilters ? 'No games match the selected filters.' : 'No completed games yet.'}
          </Typography>
          {hasActiveFilters && (
            <Button size="small" sx={{ mt: 1 }} onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </Paper>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {historyGames.map((game) => {
              const r = resultChip(game.result);
              const duration = formatDuration(game.createdAt, game.completedAt, game.updatedAt);
              const tc = formatTimeControl(game.timeControl);
              const gameDate = new Date(game.completedAt || game.updatedAt).toLocaleDateString();

              return (
                <Paper key={game._id} elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {game.whitePlayer.name} vs {game.blackPlayer.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip label={r.label} color={r.color} size="small" />
                      <Chip label={game.mode} size="small" variant="outlined" />
                      {game.terminationReason && (
                        <Chip
                          label={game.terminationReason.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip label={`${game.moves.length} moves`} size="small" variant="outlined" />
                      <Chip label={tc} size="small" variant="outlined" />
                      <Chip label={duration} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        {gameDate}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    variant="outlined"
                    onClick={() => navigate(`/history/${game._id}`)}
                    sx={{ flexShrink: 0 }}
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

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            {historyTotal} game{historyTotal !== 1 ? 's' : ''} total
          </Typography>
        </>
      )}
    </Box>
  );
};

export default HistoryPage;
