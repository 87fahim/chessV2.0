import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import EditableBoard from '../../components/chess/EditableBoard';
import BoardLayout from '../../components/chess/BoardLayout';
import ZoomControls from '../../components/chess/ZoomControls';
import { useBoardZoom } from '../../hooks/useBoardZoom';
import { useBoardEditor } from './useBoardEditor';
import type { PieceColor } from '../../types/chess';
import type { CastlingRights } from './boardEditorTypes';
import { useAppSelector } from '../../hooks/useStore';
import { userApi, type SavedPositionData } from '../../services/userService';

const AnalysisPage: React.FC = () => {
  const zoom = useBoardZoom();
  const editor = useBoardEditor();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const [fenInput, setFenInput] = useState(editor.fen);
  const [fenError, setFenError] = useState('');
  const [savedPositionName, setSavedPositionName] = useState('');
  const [savedPositions, setSavedPositions] = useState<SavedPositionData[]>([]);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedPositions([]);
      return;
    }

    userApi.getSavedPositions().then(({ data }) => {
      setSavedPositions(data.data.positions as SavedPositionData[]);
    }).catch(() => undefined);
  }, [isAuthenticated]);

  const refreshSavedPositions = () => {
    if (!isAuthenticated) {
      return;
    }

    userApi.getSavedPositions().then(({ data }) => {
      setSavedPositions(data.data.positions as SavedPositionData[]);
    }).catch(() => undefined);
  };

  const handleSavePosition = async () => {
    if (!isAuthenticated || !editor.canAnalyze) {
      return;
    }

    setIsSavingPosition(true);
    try {
      await userApi.savePosition({
        name: savedPositionName.trim() || 'Saved Analysis Position',
        fen: editor.fen,
        source: 'analysis',
      });
      setSavedPositionName('');
      refreshSavedPositions();
    } finally {
      setIsSavingPosition(false);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    await userApi.deleteSavedPosition(positionId);
    refreshSavedPositions();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFenInput(editor.fen);
    setFenError('');
  }, [editor.fen]);

  const handleCopyFen = () => {
    navigator.clipboard.writeText(editor.fen);
  };

  const errors = editor.validationErrors.filter((e) => e.severity === 'error');
  const warnings = editor.validationErrors.filter((e) => e.severity === 'warning');

  return (
  <>
    <BoardLayout
      panelWidth={360}
      boardColRef={zoom.boardColRef}
      boardWidth={zoom.boardWidth}
      board={<>
        <EditableBoard
          position={editor.position}
          isFlipped={editor.isFlipped}
          highlightSquares={editor.highlightSquares}
          onDrop={editor.handleDrop}
        />
      </>}
      panel={<>
        {/* Engine Analysis */}
        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
            Next Best Move
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 1, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
            <Button
              variant="contained"
              color="secondary"
              onClick={editor.findBestMove}
              disabled={editor.isAnalyzing || !editor.canAnalyze}
              fullWidth
              startIcon={editor.isAnalyzing ? <CircularProgress size={18} /> : <PlayArrowIcon />}
              sx={{ minHeight: 30, fontSize: '0.74rem', px: 1.1 }}
            >
              {editor.isAnalyzing ? 'Analyzing...' : 'Find Next Move'}
            </Button>
            {editor.isAnalyzing && (
              <Button
                variant="outlined"
                color="error"
                onClick={editor.cancelAnalysis}
                startIcon={<CancelIcon />}
                sx={{ minHeight: 30, fontSize: '0.74rem', px: 1.1, whiteSpace: 'nowrap', flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
              >
                Cancel
              </Button>
            )}
          </Box>

          {!editor.canAnalyze && errors.length > 0 && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1, fontSize: '0.72rem' }}>
              Fix position errors before analyzing
            </Typography>
          )}

          {editor.analysisError && (
            <Alert
              severity="error"
              sx={{ mb: 1, fontSize: '0.76rem' }}
              action={
                <Button color="inherit" size="small" onClick={editor.findBestMove} disabled={editor.isAnalyzing || !editor.canAnalyze}>
                  Retry
                </Button>
              }
            >
              {editor.analysisError}
            </Alert>
          )}

          {editor.analysisResult && (
            <Paper variant="outlined" sx={{ p: 1.1, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.98rem' }}>
                  {editor.analysisResult.san || editor.analysisResult.bestMove}
                </Typography>
                {editor.analysisResult.san && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.76rem' }}>
                    ({editor.analysisResult.bestMove.slice(0, 2)} → {editor.analysisResult.bestMove.slice(2, 4)})
                  </Typography>
                )}
              </Box>

              {editor.analysisResult.evaluation && (
                <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.76rem' }}>
                  Eval: <strong>{editor.analysisResult.evaluation}</strong>
                  {' · '}Depth: {editor.analysisResult.depth}
                </Typography>
              )}

              {editor.analysisResult.pv && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', fontFamily: 'monospace', mb: 1, wordBreak: 'break-all', fontSize: '0.7rem' }}
                >
                  PV: {editor.analysisResult.pv}
                </Typography>
              )}

              <Button
                variant="contained"
                size="small"
                onClick={editor.applyBestMove}
                startIcon={<CheckIcon />}
                fullWidth
                sx={{ minHeight: 30, fontSize: '0.74rem', px: 1.1 }}
              >
                Apply Move
              </Button>
            </Paper>
          )}
        </Paper>

        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, fontSize: '0.86rem', mb: 0.75 }}>
            Controls
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.25, rowGap: 0.5, alignItems: 'center', flexWrap: 'wrap', overflowX: 'visible' }}>
            <Tooltip title="Flip Board">
              <IconButton onClick={editor.flipBoard} size="small" sx={{ p: 0.4 }}>
                <SwapVertIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Undo">
              <span>
                <IconButton onClick={editor.undo} size="small" disabled={!editor.canUndo} sx={{ p: 0.4 }}>
                  <UndoIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo">
              <span>
                <IconButton onClick={editor.redo} size="small" disabled={!editor.canRedo} sx={{ p: 0.4 }}>
                  <RedoIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Reset to Starting Position">
              <IconButton onClick={editor.resetToStart} size="small" sx={{ p: 0.4 }}>
                <RestartAltIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Board">
              <IconButton onClick={editor.clearBoard} size="small" sx={{ p: 0.4 }}>
                <DeleteOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Keep Kings Only">
              <IconButton onClick={editor.keepKingsOnly} size="small" sx={{ p: 0.4, fontSize: '0.95rem' }}>
                ♚
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

        {isAuthenticated && (
          <Paper elevation={2} sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
              Positions
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<SaveIcon />}
                onClick={() => setSaveDialogOpen(true)}
                disabled={!editor.canAnalyze}
                sx={{ minHeight: 30, fontSize: '0.74rem' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<FolderOpenIcon />}
                onClick={() => { refreshSavedPositions(); setLoadDialogOpen(true); }}
                sx={{ minHeight: 30, fontSize: '0.74rem' }}
              >
                Load
              </Button>
            </Box>
          </Paper>
        )}

        {/* FEN Display & Load */}
        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
            FEN Position
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75, flexWrap: { xs: 'wrap', sm: 'nowrap' }, alignItems: 'flex-start' }}>
            <TextField
              size="small"
              fullWidth
              value={fenInput}
              onChange={(e) => {
                const nextFen = e.target.value;
                setFenInput(nextFen);

                if (!nextFen.trim()) {
                  setFenError('Invalid FEN string');
                  return;
                }

                const err = editor.loadFen(nextFen);
                setFenError(err ?? '');
              }}
              error={!!fenError}
              helperText={fenError}
              placeholder="Paste or edit FEN..."
              slotProps={{
                htmlInput: { sx: { fontSize: '0.76rem', fontFamily: 'monospace', py: 0.85 } },
                formHelperText: { sx: { fontSize: '0.68rem', mx: 0 } },
              }}
            />
            <Tooltip title="Copy Current FEN">
              <IconButton onClick={handleCopyFen} size="small" sx={{ width: 36, height: 36, flex: '0 0 auto' }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
            Engine Setup
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, mb: 0.4, color: 'text.secondary' }}>
            Side to Move
          </Typography>
          <ToggleButtonGroup
            value={editor.sideToMove}
            exclusive
            onChange={(_, val) => val && editor.updateSideToMove(val as PieceColor)}
            size="small"
            fullWidth
            sx={{
              mb: 0.75,
              '& .MuiToggleButton-root': {
                py: 0.55,
                fontSize: '0.74rem',
                minHeight: 30,
              },
            }}
          >
            <ToggleButton value="w">White</ToggleButton>
            <ToggleButton value="b">Black</ToggleButton>
          </ToggleButtonGroup>

          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, mb: 0.4, color: 'text.secondary' }}>
            Search Budget
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start', flexDirection: { xs: 'column', sm: 'row' } }}>
            <ToggleButtonGroup
              value={editor.analysisSettings.searchMode}
              exclusive
              onChange={(_, val) => val && editor.updateSearchMode(val)}
              size="small"
              sx={{
                width: { xs: '100%', sm: 'auto' },
                flex: '0 0 auto',
                '& .MuiToggleButton-root': {
                  py: 0.55,
                  px: 1,
                  fontSize: '0.7rem',
                  minHeight: 30,
                },
              }}
            >
              <ToggleButton value="depth">Depth</ToggleButton>
              <ToggleButton value="time">Time</ToggleButton>
            </ToggleButtonGroup>
            {editor.analysisSettings.searchMode === 'depth' ? (
              <TextField
                size="small"
                label="Depth"
                type="number"
                value={editor.analysisSettings.searchDepth || ''}
                onChange={(e) => editor.updateSearchDepth(e.target.value)}
                error={editor.analysisSettings.searchDepth !== 0 && (editor.analysisSettings.searchDepth < 1 || editor.analysisSettings.searchDepth > 60)}
                helperText={
                  editor.analysisSettings.searchDepth !== 0 && (editor.analysisSettings.searchDepth < 1 || editor.analysisSettings.searchDepth > 60)
                    ? '1–60'
                    : undefined
                }
                sx={{ flex: 1 }}
                slotProps={{
                  inputLabel: { sx: { fontSize: '0.74rem' } },
                  htmlInput: { min: 1, max: 60, sx: { fontSize: '0.74rem', py: 0.85 } },
                  input: { endAdornment: <InputAdornment position="end">ply</InputAdornment> },
                  formHelperText: { sx: { fontSize: '0.68rem', mx: 0 } },
                }}
              />
            ) : (
              <TextField
                size="small"
                label="Time"
                type="number"
                value={editor.analysisSettings.moveTimeMs ? (editor.analysisSettings.moveTimeMs / 1000) : ''}
                onChange={(e) => editor.updateMoveTimeMs(e.target.value)}
                error={editor.analysisSettings.moveTimeMs !== 0 && (editor.analysisSettings.moveTimeMs < 100 || editor.analysisSettings.moveTimeMs > 120000)}
                helperText={
                  editor.analysisSettings.moveTimeMs !== 0 && (editor.analysisSettings.moveTimeMs < 100 || editor.analysisSettings.moveTimeMs > 120000)
                    ? '0.1–120'
                    : undefined
                }
                sx={{ flex: 1 }}
                slotProps={{
                  inputLabel: { sx: { fontSize: '0.74rem' } },
                  htmlInput: { min: 0.1, max: 120, step: 0.5, sx: { fontSize: '0.74rem', py: 0.85 } },
                  input: { endAdornment: <InputAdornment position="end">sec</InputAdornment> },
                  formHelperText: { sx: { fontSize: '0.68rem', mx: 0 } },
                }}
              />
            )}
          </Box>
        </Paper>

        <Paper elevation={2} sx={{ p: 1.25 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
            Position Settings
          </Typography>

          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, mb: 0.4, color: 'text.secondary' }}>
            Castling Rights
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, mb: 0.75 }}>
            {([
              { key: 'K' as keyof CastlingRights, label: 'White O-O' },
              { key: 'Q' as keyof CastlingRights, label: 'White O-O-O' },
              { key: 'k' as keyof CastlingRights, label: 'Black O-O' },
              { key: 'q' as keyof CastlingRights, label: 'Black O-O-O' },
            ] as const).map(({ key, label }) => (
              <FormControlLabel
                key={key}
                sx={{ my: 0, mr: 0.5, '& .MuiFormControlLabel-label': { fontSize: '0.74rem' } }}
                control={
                  <Checkbox
                    size="small"
                    checked={editor.castling[key]}
                    onChange={(e) => editor.updateCastling(key, e.target.checked)}
                    sx={{ p: 0.45 }}
                  />
                }
                label={<Typography variant="body2" sx={{ fontSize: '0.74rem' }}>{label}</Typography>}
              />
            ))}
          </Box>

          <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, mb: 0.4, color: 'text.secondary' }}>
            Position Metadata
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 0.75, mb: 0.75 }}>
            <TextField
              size="small"
              label="EP"
              value={editor.enPassant}
              onChange={(e) => editor.updateEnPassant(e.target.value)}
              placeholder="-"
              sx={{ width: '100%' }}
              slotProps={{
                inputLabel: { sx: { fontSize: '0.74rem' } },
                htmlInput: { sx: { fontFamily: 'monospace', fontSize: '0.74rem', py: 0.85 } },
              }}
            />
            <TextField
              size="small"
              label="Half"
              type="number"
              value={editor.halfMoveClock}
              onChange={(e) => editor.updateHalfMoveClock(parseInt(e.target.value, 10) || 0)}
              sx={{ width: '100%' }}
              slotProps={{
                inputLabel: { sx: { fontSize: '0.74rem' } },
                htmlInput: { min: 0, sx: { fontSize: '0.74rem', py: 0.85 } },
              }}
            />
            <TextField
              size="small"
              label="Full"
              type="number"
              value={editor.fullMoveNumber}
              onChange={(e) => editor.updateFullMoveNumber(parseInt(e.target.value, 10) || 1)}
              sx={{ width: '100%' }}
              slotProps={{
                inputLabel: { sx: { fontSize: '0.74rem' } },
                htmlInput: { min: 1, sx: { fontSize: '0.74rem', py: 0.85 } },
              }}
            />
          </Box>
        </Paper>

        {/* Validation */}
        {(errors.length > 0 || warnings.length > 0) && (
          <Paper elevation={2} sx={{ p: 1.25 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, fontSize: '0.86rem' }}>
              Validation
            </Typography>
            {errors.map((e, i) => (
              <Alert key={`e${i}`} severity="error" sx={{ mb: 0.5, py: 0, fontSize: '0.76rem' }}>
                {e.message}
              </Alert>
            ))}
            {warnings.map((w, i) => (
              <Alert key={`w${i}`} severity="warning" sx={{ mb: 0.5, py: 0, fontSize: '0.76rem' }}>
                {w.message}
              </Alert>
            ))}
          </Paper>
        )}

      </>}
    />

    {/* Save Position Dialog */}
    <Dialog
      open={saveDialogOpen}
      onClose={() => setSaveDialogOpen(false)}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100% - 16px)', sm: '100%' },
            m: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle sx={{ fontSize: '1rem', pb: 1, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>Save Position</DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, overflowX: 'hidden' }}>
        <TextField
          autoFocus
          size="small"
          fullWidth
          label="Position name"
          value={savedPositionName}
          onChange={(e) => setSavedPositionName(e.target.value)}
          placeholder="e.g. Sicilian Defense"
          sx={{ mt: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
          FEN: {editor.fen}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 1.5, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, '& > :not(style)': { ml: 0 } }}>
        <Button onClick={() => setSaveDialogOpen(false)} size="small" sx={{ width: { xs: '100%', sm: 'auto' } }}>Cancel</Button>
        <Button
          variant="contained"
          size="small"
          onClick={async () => {
            await handleSavePosition();
            setSaveDialogOpen(false);
          }}
          disabled={isSavingPosition || !editor.canAnalyze}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {isSavingPosition ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Load Position Dialog */}
    <Dialog
      open={loadDialogOpen}
      onClose={() => setLoadDialogOpen(false)}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: { xs: 'calc(100% - 16px)', sm: '100%' },
            m: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle sx={{ fontSize: '1rem', pb: 1, px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 } }}>Load Saved Position</DialogTitle>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, overflowX: 'hidden' }}>
        {savedPositions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No saved positions yet.
          </Typography>
        ) : (
          savedPositions.map((position) => (
            <Paper key={position._id} variant="outlined" sx={{ p: 1.25, mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {position.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', wordBreak: 'break-all', mb: 0.75 }}>
                {position.fen}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                <Button size="small" variant="outlined" onClick={() => {
                  setFenInput(position.fen);
                  const err = editor.loadFen(position.fen);
                  if (err) {
                    setFenError(err);
                  } else {
                    setFenError('');
                  }
                  setLoadDialogOpen(false);
                }}>
                  Load
                </Button>
                <Button size="small" color="error" variant="text" onClick={async () => {
                  await handleDeletePosition(position._id);
                }}>
                  Delete
                </Button>
              </Box>
            </Paper>
          ))
        )}
      </DialogContent>
      <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 1.5, gap: 1, flexDirection: { xs: 'column-reverse', sm: 'row' }, '& > :not(style)': { ml: 0 } }}>
        <Button onClick={() => setLoadDialogOpen(false)} size="small" sx={{ width: { xs: '100%', sm: 'auto' } }}>Close</Button>
      </DialogActions>
    </Dialog>
  </>
  );
};

export default AnalysisPage;
