import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import { Chess } from 'chess.js';
import { useNavigate } from 'react-router-dom';
import ChessBoard from '../components/chess/ChessBoard';
import MoveList from '../components/chess/MoveList';
import GameStartCurtain from '../components/chess/GameStartCurtain';
import GameEndDialog from '../components/chess/GameEndDialog';
import BoardLayout from '../components/chess/BoardLayout';
import ZoomControls from '../components/chess/ZoomControls';
import {
  controlBarPaperSx,
  controlBarRowSx,
  controlBarTitleSx,
  controlOutlinedButtonSx,
} from '../components/chess/controlBarStyles';
import OnlineLobby from '../features/onlinePlay/OnlineLobby';
import PlayerStrip from '../features/onlinePlay/PlayerStrip';
import ConfirmActionDialog from '../features/onlinePlay/ConfirmActionDialog';
import {
  DISCONNECT_TIMEOUT_S,
  getCapturedCounts,
  getResultText,
  isPlayersTurn,
  resolveDefaultTimeControl,
  resolvePreferredColor,
  type TimeControlValue,
} from '../features/onlinePlay/onlinePlayUtils';
import { useBoardZoom } from '../hooks/useBoardZoom';
import { useSocket } from '../hooks/useSocket';
import { usePremoveQueue } from '../hooks/usePremoveQueue';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { useActiveGameSession } from '../hooks/useActiveGameSession';
import { setFen, moveMade, gameOver, setStatus, resetGame, setFlipped, setLastMove } from '../features/game/gameSlice';
import type { PieceColor, PieceType } from '../types/chess';

const OnlinePlayPage: React.FC = () => {
  const zoom = useBoardZoom();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const settings = useAppSelector((s) => s.settings.data);
  const defaultBoardFlipped = settings.boardFlipped === true;
  const defaultSelectedTC = resolveDefaultTimeControl(settings.defaultTimeControl);
  const defaultPreferredColor = resolvePreferredColor(settings.preferredColor);

  // AC1/AC2/AC7/AC8: check for an active game on this browser session before socket connects
  const { isChecking: isCheckingSession } = useActiveGameSession();

  const {
    isConnected,
    isInQueue,
    onlineGame,
    drawOffered,
    rematchOffered,
    rematchPending,
    rematchDeclined,
    rematchDeclineReason,
    error,
    joinQueue,
    leaveQueue,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    requestRematch,
    acceptRematch,
    declineRematch,
    resetOnlineGame,
    clearError,
  } = useSocket();

  const [selectedTCOverride, setSelectedTCOverride] = useState<TimeControlValue | null>(null);
  const [preferredColorOverride, setPreferredColorOverride] = useState<'random' | 'white' | 'black' | null>(null);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const prevStatusRef = useRef(onlineGame.status);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const selectedTC = selectedTCOverride ?? defaultSelectedTC;
  const preferredColor = preferredColorOverride ?? defaultPreferredColor;

  /* --- Premove queue ----------------------------------------------- */
  const { queue: premoveQueue, premoveSquares, addPremove, clearPremoves, processNextPremove } = usePremoveQueue();

  const resetLobbySelections = useCallback(() => {
    setSelectedTCOverride(null);
    setPreferredColorOverride(null);
  }, []);

  // Derive player color as PieceColor for ChessBoard
  const myPieceColor: PieceColor | undefined = onlineGame.yourColor === 'white' ? 'w' : onlineGame.yourColor === 'black' ? 'b' : undefined;

  // Disconnect countdown: tick from 60 → 0 when opponent goes offline
  useEffect(() => {
    if (!onlineGame.opponentOnline && onlineGame.status === 'active') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional disconnect countdown init
      setDisconnectCountdown(DISCONNECT_TIMEOUT_S);
      const interval = setInterval(() => {
        setDisconnectCountdown((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setDisconnectCountdown(null);
    }
  }, [onlineGame.opponentOnline, onlineGame.status]);

  // Show curtain when game becomes active
  useEffect(() => {
    if (onlineGame.status === 'active' && prevStatusRef.current !== 'active') {
      // Auto-dismiss any stale popups from previous game
      setShowEndDialog(false);
      setShowCurtain(true);
      const timer = setTimeout(() => setShowCurtain(false), 1500);
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = onlineGame.status;
  }, [onlineGame.status]);

  // Close end dialog immediately when a new game starts (e.g. rematch accepted)
  useEffect(() => {
    if (onlineGame.gameId && onlineGame.status === 'active') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowEndDialog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineGame.gameId]);

  // Show end dialog when game completes
  useEffect(() => {
    if (onlineGame.status === 'completed' || onlineGame.status === 'abandoned') {
      const timer = setTimeout(() => setShowEndDialog(true), 500);
      return () => clearTimeout(timer);
    }
  }, [onlineGame.status]);

  // Sync online game fen to redux for ChessBoard rendering
  useEffect(() => {
    if (onlineGame.gameId && onlineGame.fen) {
      dispatch(setFen(onlineGame.fen));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.fen]);

  // Sync last move highlight when opponent moves
  useEffect(() => {
    if (!onlineGame.gameId) return;
    const moves = onlineGame.moves;
    if (moves.length > 0) {
      const lastMove = moves[moves.length - 1];
      dispatch(setLastMove({ from: lastMove.from, to: lastMove.to }));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.moves]);

  // Set status to 'playing' when game starts, reset when it ends or leaves
  useEffect(() => {
    if (onlineGame.gameId && onlineGame.status === 'active') {
      dispatch(setStatus('playing'));
    }
  }, [dispatch, onlineGame.gameId, onlineGame.status]);

  // Reset game state when leaving online play
  useEffect(() => {
    return () => {
      dispatch(resetGame());
    };
  }, [dispatch]);

  // Set board orientation based on assigned color (not a toggle)
  useEffect(() => {
    if (onlineGame.yourColor) {
      dispatch(setFlipped(defaultBoardFlipped ? onlineGame.yourColor === 'white' : onlineGame.yourColor === 'black'));
    }
  }, [defaultBoardFlipped, dispatch, onlineGame.yourColor]);

  // Game ended
  useEffect(() => {
    if ((onlineGame.status === 'completed' || onlineGame.status === 'abandoned') && onlineGame.result !== '*') {
      dispatch(gameOver({ result: onlineGame.result, reason: onlineGame.terminationReason || undefined }));
    }
  }, [dispatch, onlineGame.result, onlineGame.status, onlineGame.terminationReason]);

  /* --- Premove: clear on game end / leave / new game --------------- */
  useEffect(() => {
    if (onlineGame.status !== 'active') {
      clearPremoves();
    }
  }, [onlineGame.status, clearPremoves]);

  useEffect(() => {
    clearPremoves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineGame.gameId]);

  /** Raw move handler — executes the move without clearing premoves. */
  const handleMoveInternal = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!onlineGame.gameId) return;
      if (!isPlayersTurn(onlineGame.fen, onlineGame.yourColor)) return;

      // Validate locally first
      const game = new Chess(onlineGame.fen);
      const result = game.move({ from, to, promotion: promotion || undefined });
      if (!result) return;

      // Optimistic local update
      dispatch(
        moveMade({
          fen: game.fen(),
          san: result.san,
          from: result.from,
          to: result.to,
          captured: result.captured as PieceType | undefined,
          color: result.color as PieceColor,
        }),
      );

      sendMove(onlineGame.gameId, { from, to, promotion });
    },
    [dispatch, onlineGame.gameId, onlineGame.fen, onlineGame.yourColor, sendMove],
  );

  /* --- Premove: process queue when turn arrives -------------------- */
  const prevFenRef = useRef(onlineGame.fen);
  useEffect(() => {
    // Only trigger on FEN changes (opponent moved or server sync)
    if (prevFenRef.current === onlineGame.fen) return;
    prevFenRef.current = onlineGame.fen;

    if (onlineGame.status !== 'active' || !onlineGame.gameId) return;
    if (premoveQueue.length === 0) return;
    if (!isPlayersTurn(onlineGame.fen, onlineGame.yourColor)) return;

    const premove = processNextPremove(onlineGame.fen);
    if (premove) {
      // Execute the premove through the normal move handler
      handleMoveInternal(premove.from, premove.to, premove.promotion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineGame.fen]);

  /** Board-facing move handler — clears premoves when user makes a manual move. */
  const handleMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      clearPremoves();
      handleMoveInternal(from, to, promotion);
    },
    [clearPremoves, handleMoveInternal],
  );

  const handleResign = () => {
    if (onlineGame.gameId) resign(onlineGame.gameId);
    setShowResignDialog(false);
  };

  const handleNewGame = () => {
    resetLobbySelections();
    dispatch(resetGame());
    resetOnlineGame();
  };

  const handleLeaveQueue = useCallback(() => {
    resetLobbySelections();
    leaveQueue();
  }, [leaveQueue, resetLobbySelections]);

  const handleJoinQueue = useCallback(() => {
    joinQueue(selectedTC, preferredColor);
  }, [joinQueue, preferredColor, selectedTC]);

  if (!isAuthenticated) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 3 }, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Sign in to play online.
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
          Sign In
        </Button>
      </Box>
    );
  }

  // Lobby view - no active game
  if (!onlineGame.gameId) {
    return (
      <OnlineLobby
        isConnected={isConnected}
        isCheckingSession={isCheckingSession}
        isInQueue={isInQueue}
        error={error}
        selectedTC={selectedTC}
        preferredColor={preferredColor}
        onClearError={clearError}
        onSelectTimeControl={setSelectedTCOverride}
        onSelectColor={setPreferredColorOverride}
        onJoinQueue={handleJoinQueue}
        onLeaveQueue={handleLeaveQueue}
      />
    );
  }

  // Active game view
  const isYourTurn = isPlayersTurn(onlineGame.fen, onlineGame.yourColor);
  const gameEnded = onlineGame.status === 'completed' || onlineGame.status === 'abandoned';
  const { capturedByWhite, capturedByBlack } = getCapturedCounts(onlineGame.fen);

  const isYouWhite = onlineGame.yourColor === 'white';
  const opponentName = isYouWhite
    ? onlineGame.blackPlayer?.name || 'Opponent'
    : onlineGame.whitePlayer?.name || 'Opponent';
  const yourName = user?.username || (isYouWhite ? onlineGame.whitePlayer?.name : onlineGame.blackPlayer?.name) || 'You';
  const yourCapturedCount = isYouWhite ? capturedByWhite : capturedByBlack;
  const opponentCapturedCount = isYouWhite ? capturedByBlack : capturedByWhite;

  const opponentClock = onlineGame.clocks
    ? (isYouWhite ? onlineGame.clocks.blackRemainingMs : onlineGame.clocks.whiteRemainingMs)
    : null;
  const yourClock = onlineGame.clocks
    ? (isYouWhite ? onlineGame.clocks.whiteRemainingMs : onlineGame.clocks.blackRemainingMs)
    : null;

  const opponentActive = onlineGame.clocks
    ? onlineGame.clocks.activeColor === (isYouWhite ? 'black' : 'white')
    : false;
  const youActive = onlineGame.clocks
    ? onlineGame.clocks.activeColor === (isYouWhite ? 'white' : 'black')
    : false;

  return (
    <>
      <BoardLayout
        panelWidth={380}
        boardColRef={zoom.boardColRef}
        boardWidth={zoom.boardWidth}
        board={<>
          <PlayerStrip
            name={opponentName}
            capturedCount={opponentCapturedCount}
            clockMs={opponentClock}
            active={opponentActive}
            isSelf={false}
            gameEnded={gameEnded}
            online={onlineGame.opponentOnline}
            countdown={disconnectCountdown}
          />
          <Box sx={{ position: 'relative' }}>
            <ChessBoard
              onMove={handleMove}
              onPremove={addPremove}
              onClearPremoves={clearPremoves}
              premoveQueue={premoveQueue}
              premoveSquares={premoveSquares}
              playerColor={myPieceColor}
            />
            <GameStartCurtain
              visible={showCurtain}
              playerLabel={onlineGame.yourColor === 'white' ? 'White' : 'Black'}
              subtitle={`vs ${opponentName}`}
            />
          </Box>
          <PlayerStrip
            name={yourName}
            capturedCount={yourCapturedCount}
            clockMs={yourClock}
            active={youActive}
            isSelf
            gameEnded={gameEnded}
          />
          <Paper elevation={2} sx={controlBarPaperSx}>
            <Typography variant="subtitle2" color="text.secondary" sx={controlBarTitleSx}>
              Controls
            </Typography>
            <Box sx={controlBarRowSx}>
              {!gameEnded && (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => onlineGame.gameId && offerDraw(onlineGame.gameId)}
                    sx={{ ...controlOutlinedButtonSx, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
                  >
                    Draw
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setShowResignDialog(true)}
                    sx={{ ...controlOutlinedButtonSx, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
                  >
                    Resign
                  </Button>
                </>
              )}
              {gameEnded && (
                <Button
                  variant="contained"
                  onClick={handleNewGame}
                  sx={{ ...controlOutlinedButtonSx, flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
                >
                  New
                </Button>
              )}
              <ZoomControls
                onZoomIn={zoom.handleZoomIn}
                onZoomOut={zoom.handleZoomOut}
                canZoomIn={zoom.canZoomIn}
                canZoomOut={zoom.canZoomOut}
                zoomPercent={zoom.zoomPercent}
              />
            </Box>
          </Paper>
        </>}
        panel={<>
          {/* Status */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
              Status
            </Typography>
            {gameEnded ? (
              <Typography variant="h6" sx={{ fontWeight: 800 }} color="primary">
                {getResultText(onlineGame.result, onlineGame.yourColor)}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={isYourTurn ? 'Your turn' : "Opponent's turn"}
                  color={isYourTurn ? 'success' : 'default'}
                  size="small"
                />
                {!isConnected && (
                  <Chip label="Reconnecting..." color="warning" size="small" variant="outlined" />
                )}
              </Box>
            )}

            {/* Abort / disconnect / inactivity warning */}
            {onlineGame.abortWarning && !gameEnded && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {onlineGame.abortWarning.reason === 'inactivity'
                  ? `You must move within ${onlineGame.abortWarning.secondsLeft}s or you will lose!`
                  : `Opponent disconnected — game will end in ${onlineGame.abortWarning.secondsLeft}s if they don't return.`}
              </Alert>
            )}

            {error && <Alert severity="error" sx={{ mt: 1 }} onClose={clearError}>{error}</Alert>}
          </Paper>

          {/* Draw offer banner */}
          {drawOffered && !gameEnded && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Your opponent offers a draw</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" onClick={() => onlineGame.gameId && acceptDraw(onlineGame.gameId)}>
                  Accept
                </Button>
                <Button size="small" variant="outlined" onClick={() => onlineGame.gameId && declineDraw(onlineGame.gameId)}>
                  Decline
                </Button>
              </Box>
            </Paper>
          )}

          <MoveList moves={onlineGame.moves.map((m) => m.san)} />
        </>}
      />

      {/* Resign confirmation */}
      <ConfirmActionDialog
        open={showResignDialog}
        title="Resign?"
        message="Are you sure you want to resign this game?"
        cancelLabel="Cancel"
        confirmLabel="Resign"
        confirmColor="error"
        onCancel={() => setShowResignDialog(false)}
        onConfirm={handleResign}
      />

      {/* Rematch offer from opponent */}
      <ConfirmActionDialog
        open={rematchOffered}
        title="Rematch Offer"
        message="Your opponent wants a rematch!"
        cancelLabel="Decline"
        confirmLabel="Accept"
        onCancel={() => onlineGame.gameId && declineRematch(onlineGame.gameId)}
        onConfirm={() => onlineGame.gameId && acceptRematch(onlineGame.gameId)}
      />

      {/* Game End Dialog */}
      <GameEndDialog
        open={showEndDialog}
        result={onlineGame.result as '1-0' | '0-1' | '1/2-1/2'}
        reason={onlineGame.terminationReason || 'unknown'}
        playerColor={onlineGame.yourColor || 'white'}
        mode="online"
        rematchPending={rematchPending}
        rematchDeclined={rematchDeclined}
        rematchDeclineReason={rematchDeclineReason}
        onRematch={() => {
          if (onlineGame.gameId && !rematchPending) requestRematch(onlineGame.gameId);
        }}
        onNewGame={() => {
          setShowEndDialog(false);
          handleNewGame();
        }}
        onClose={() => setShowEndDialog(false)}
      />
    </>
  );
};

export default OnlinePlayPage;
