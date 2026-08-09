import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  MatchFoundPayload,
  GameStatePayload,
  MoveAcceptedPayload,
  MoveRejectedPayload,
  GameEndedPayload,
  ClockUpdatePayload,
  OpponentPresencePayload,
  AbortWarningPayload,
  GameResumablePayload,
} from '../../shared/types/socket';
import { SocketEvents } from '../../shared/constants/socketEvents.js';
import { useGameSounds } from './useGameSounds';
import { useAppSelector } from './useStore';
import {
  INITIAL_ONLINE,
  applyDisconnectForfeit,
  applyGameEnded,
  applyGameStatePayload,
  applyMoveAccepted,
  moveOutcomeFromSan,
  resolveYourColor,
} from './onlineGameState';
import type { OnlineGameState } from './onlineGameState';
import { useClockInterpolation } from './useClockInterpolation';

export type { OnlineGameState };

const SOCKET_URL = import.meta.env.VITE_API_URL;
const DISCONNECT_FORFEIT_MS = 60_000;

export function useSocket() {
  const { playGameStart, playGameEnd, playIllegalMove, playMoveOutcome } = useGameSounds();
  // Identity comes from the server-verified auth state, not from decoding the
  // JWT payload client-side.
  const currentUserId = useAppSelector((s) => s.auth.user?._id ?? null);
  const currentUserIdRef = useRef<string | null>(currentUserId);
  currentUserIdRef.current = currentUserId;
  const socketRef = useRef<Socket | null>(null);
  const disconnectFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [onlineGame, setOnlineGame] = useState<OnlineGameState>(INITIAL_ONLINE);
  const [drawOffered, setDrawOffered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rematchOffered, setRematchOffered] = useState(false);
  const [rematchPending, setRematchPending] = useState(false);
  const [rematchDeclined, setRematchDeclined] = useState(false);
  const [rematchDeclineReason, setRematchDeclineReason] = useState<string | null>(null);

  const { updateServerClocks, clearServerClocks } = useClockInterpolation(setOnlineGame);

  const clearDisconnectFallback = useCallback(() => {
    if (disconnectFallbackTimerRef.current) {
      clearTimeout(disconnectFallbackTimerRef.current);
      disconnectFallbackTimerRef.current = null;
    }
  }, []);

  const scheduleDisconnectFallback = useCallback(() => {
    clearDisconnectFallback();
    disconnectFallbackTimerRef.current = setTimeout(() => {
      setOnlineGame(applyDisconnectForfeit);
      clearServerClocks();
      disconnectFallbackTimerRef.current = null;
    }, DISCONNECT_FORFEIT_MS);
  }, [clearDisconnectFallback, clearServerClocks]);

  // Connect socket with auth token
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Refresh auth token before each reconnect attempt so an expired
    // access-token doesn't block re-connection.
    socket.on('reconnect_attempt', () => {
      const freshToken = localStorage.getItem('accessToken');
      if (freshToken) {
        socket.auth = { token: freshToken };
      }
    });

    socket.on('connect', () => {
      setIsConnected(true);
      // If already in a game, re-join the room on reconnect
      setOnlineGame((prev) => {
        if (prev.gameId && prev.status === 'active') {
          socket.emit(SocketEvents.GAME_JOIN, { gameId: prev.gameId });
        }
        return prev;
      });
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    // Server tells us we have an active game to resume (FR-30)
    socket.on(SocketEvents.GAME_RESUMABLE, (data: GameResumablePayload) => {
      setOnlineGame((prev) => {
        // Only auto-rejoin if we're not already in a game
        if (!prev.gameId) {
          socket.emit(SocketEvents.GAME_JOIN, { gameId: data.gameId });
          return { ...prev, gameId: data.gameId, status: 'active' };
        }
        return prev;
      });
    });

    // Matchmaking
    socket.on(SocketEvents.MATCH_FOUND, (data: MatchFoundPayload) => {
      playGameStart();
      clearDisconnectFallback();
      setIsInQueue(false);
      setOnlineGame((prev) => ({
        ...prev,
        gameId: data.gameId,
        yourColor: data.yourColor,
        status: 'active',
        opponentOnline: true,
        abortWarning: null,
        whitePlayer: { type: 'user', name: data.whiteName, userId: data.whiteUserId },
        blackPlayer: { type: 'user', name: data.blackName, userId: data.blackUserId },
      }));
      socket.emit(SocketEvents.GAME_JOIN, { gameId: data.gameId });
    });

    socket.on(SocketEvents.QUEUE_JOINED, () => setIsInQueue(true));
    socket.on(SocketEvents.QUEUE_LEFT, () => setIsInQueue(false));

    // Game events
    socket.on(SocketEvents.GAME_STATE, (data: GameStatePayload) => {
      if (data.status !== 'active') {
        clearDisconnectFallback();
      }

      if (data.clocks) {
        updateServerClocks(data.clocks);
      }

      setOnlineGame((prev) => applyGameStatePayload(prev, data, currentUserIdRef.current));

      // Restore draw offer from state sync
      if ((data as GameStatePayload & { drawOfferedBy?: string | null }).drawOfferedBy) {
        setDrawOffered(true);
      }
    });

    socket.on(SocketEvents.GAME_MOVE_ACCEPTED, (data: MoveAcceptedPayload) => {
      playMoveOutcome(moveOutcomeFromSan(data.move.san));

      if (data.clocks) {
        updateServerClocks(data.clocks);
      }

      setOnlineGame((prev) => applyMoveAccepted(prev, data));
      // Clear draw offer on new move
      setDrawOffered(false);
    });

    socket.on(SocketEvents.GAME_MOVE_REJECTED, (data: MoveRejectedPayload) => {
      playIllegalMove();
      setError(`Move rejected: ${data.reason}`);
    });

    socket.on(SocketEvents.GAME_ENDED, (data: GameEndedPayload) => {
      if (data.reason !== 'checkmate') {
        playGameEnd();
      }

      clearDisconnectFallback();
      setOnlineGame((prev) => applyGameEnded(prev, data));
      clearServerClocks();
    });

    socket.on(SocketEvents.GAME_CLOCK, (data: ClockUpdatePayload) => {
      updateServerClocks(data.clocks);
      setOnlineGame((prev) => ({
        ...prev,
        clocks: {
          whiteRemainingMs: data.clocks.whiteRemainingMs,
          blackRemainingMs: data.clocks.blackRemainingMs,
          activeColor: data.clocks.activeColor,
        },
      }));
    });

    // Draw events
    socket.on(SocketEvents.GAME_DRAW_OFFERED, () => setDrawOffered(true));
    socket.on(SocketEvents.GAME_DRAW_DECLINED, () => {
      setDrawOffered(false);
      setError('Draw offer declined');
    });

    // Opponent presence (FR-41)
    socket.on(SocketEvents.OPPONENT_PRESENCE, (data: OpponentPresencePayload) => {
      if (data.online) {
        clearDisconnectFallback();
      } else {
        scheduleDisconnectFallback();
      }

      setOnlineGame((prev) => ({
        ...prev,
        opponentOnline: data.online,
      }));
    });

    socket.on(SocketEvents.GAME_OPPONENT_DISCONNECTED, () => {
      scheduleDisconnectFallback();
      setOnlineGame((prev) => ({ ...prev, opponentOnline: false }));
    });

    socket.on(SocketEvents.GAME_OPPONENT_RECONNECTED, () => {
      clearDisconnectFallback();
      setOnlineGame((prev) => ({ ...prev, opponentOnline: true, abortWarning: null }));
    });

    // Abort warning (disconnect timeout countdown)
    socket.on(SocketEvents.GAME_ABORT_WARNING, (data: AbortWarningPayload) => {
      setOnlineGame((prev) => ({
        ...prev,
        abortWarning: { secondsLeft: data.secondsLeft, reason: data.reason },
      }));
    });

    // Rematch events
    socket.on(SocketEvents.GAME_REMATCH_OFFERED, () => {
      setRematchOffered(true);
    });

    socket.on(SocketEvents.GAME_REMATCH_ACCEPTED, (data: {
      oldGameId: string;
      newGameId: string;
      whitePlayer: { type: string; name: string; userId?: string };
      blackPlayer: { type: string; name: string; userId?: string };
      timeControl?: { initialMs: number; incrementMs: number };
    }) => {
      playGameStart();
      setRematchPending(false);
      setRematchOffered(false);
      setRematchDeclined(false);
      setDrawOffered(false);

      // Determine our color in the new game
      setOnlineGame((prev) => {
        const newColor = resolveYourColor(currentUserIdRef.current, data.whitePlayer, data.blackPlayer, prev.yourColor);
        return {
          ...INITIAL_ONLINE,
          gameId: data.newGameId,
          yourColor: newColor as 'white' | 'black',
          status: 'active',
          opponentOnline: true,
          whitePlayer: data.whitePlayer,
          blackPlayer: data.blackPlayer,
        };
      });

      // Join the new game room
      socket.emit(SocketEvents.GAME_JOIN, { gameId: data.newGameId });
    });

    socket.on(SocketEvents.GAME_REMATCH_DECLINED, (data?: { gameId?: string; reason?: string }) => {
      setRematchPending(false);
      setRematchDeclined(true);
      setRematchDeclineReason(data?.reason || null);
    });

    socket.on(SocketEvents.GAME_REMATCH_EXPIRED, () => {
      setRematchPending(false);
      setRematchOffered(false);
      setRematchDeclined(true);
      setRematchDeclineReason('Rematch request expired.');
    });

    return () => {
      clearDisconnectFallback();
      socket.disconnect();
      socketRef.current = null;
      clearServerClocks();
    };
  }, [
    clearDisconnectFallback,
    scheduleDisconnectFallback,
    updateServerClocks,
    clearServerClocks,
    playGameStart,
    playGameEnd,
    playIllegalMove,
    playMoveOutcome,
  ]);

  const joinQueue = useCallback(
    (timeControl: { initialMs: number; incrementMs: number }, preferredColor?: string) => {
      socketRef.current?.emit(SocketEvents.QUEUE_JOIN, { timeControl, preferredColor });
    },
    [],
  );

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit(SocketEvents.QUEUE_LEAVE);
    setIsInQueue(false);
  }, []);

  const sendMove = useCallback((gameId: string, move: { from: string; to: string; promotion?: string }) => {
    socketRef.current?.emit(SocketEvents.GAME_MOVE, { gameId, move });
  }, []);

  const resign = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_RESIGN, { gameId });
  }, []);

  const offerDraw = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_OFFER_DRAW, { gameId });
  }, []);

  const acceptDraw = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_ACCEPT_DRAW, { gameId });
    setDrawOffered(false);
  }, []);

  const declineDraw = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_DECLINE_DRAW, { gameId });
    setDrawOffered(false);
  }, []);

  const requestRematch = useCallback((gameId: string) => {
    // Prevent duplicate requests
    if (rematchPending) return;
    socketRef.current?.emit(SocketEvents.GAME_REMATCH_REQUEST, { gameId });
    setRematchPending(true);
    setRematchDeclined(false);
    setRematchDeclineReason(null);
  }, [rematchPending]);

  const acceptRematch = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_REMATCH_ACCEPT, { gameId });
    setRematchOffered(false);
  }, []);

  const declineRematch = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_REMATCH_DECLINE, { gameId });
    setRematchOffered(false);
  }, []);

  const resetOnlineGame = useCallback(() => {
    clearDisconnectFallback();
    setOnlineGame(INITIAL_ONLINE);
    setDrawOffered(false);
    setRematchOffered(false);
    setRematchPending(false);
    setRematchDeclined(false);
    setRematchDeclineReason(null);
    setError(null);
    clearServerClocks();
  }, [clearDisconnectFallback, clearServerClocks]);

  const syncGame = useCallback((gameId: string) => {
    socketRef.current?.emit(SocketEvents.GAME_SYNC_REQUEST, { gameId });
  }, []);

  return {
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
    syncGame,
    clearError: () => setError(null),
  };
}
