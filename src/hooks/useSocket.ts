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
import { useGameSounds } from './useGameSounds';

const SOCKET_URL = import.meta.env.VITE_API_URL;
const DISCONNECT_FORFEIT_MS = 60_000;

function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded)) as { userId?: string };

    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

function resolveYourColor(
  whitePlayer: { userId?: string } | null | undefined,
  blackPlayer: { userId?: string } | null | undefined,
  fallback: 'white' | 'black' | null,
): 'white' | 'black' | null {
  const currentUserId = getUserIdFromToken();
  if (!currentUserId) return fallback;
  if (whitePlayer?.userId === currentUserId) return 'white';
  if (blackPlayer?.userId === currentUserId) return 'black';
  return fallback;
}

export interface OnlineGameState {
  gameId: string | null;
  fen: string;
  moves: Array<{ from: string; to: string; san: string; ply: number }>;
  yourColor: 'white' | 'black' | null;
  status: string;
  result: string;
  terminationReason: string | null;
  clocks: { whiteRemainingMs: number; blackRemainingMs: number; activeColor: string } | null;
  whitePlayer: { type: string; name: string; userId?: string } | null;
  blackPlayer: { type: string; name: string; userId?: string } | null;
  opponentOnline: boolean;
  abortWarning: { secondsLeft: number; reason: string } | null;
}

const INITIAL_ONLINE: OnlineGameState = {
  gameId: null,
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  yourColor: null,
  status: 'idle',
  result: '*',
  terminationReason: null,
  clocks: null,
  whitePlayer: null,
  blackPlayer: null,
  opponentOnline: true,
  abortWarning: null,
};

/** Client-side clock interpolation interval (ms) */
const CLOCK_TICK_MS = 100;

export function useSocket() {
  const { playGameStart, playGameEnd, playIllegalMove, playMoveOutcome } = useGameSounds();
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

  // Ref to hold latest clocks from server for interpolation
  const serverClocksRef = useRef<{
    whiteRemainingMs: number;
    blackRemainingMs: number;
    activeColor: string;
    receivedAt: number;
  } | null>(null);

  const clearDisconnectFallback = useCallback(() => {
    if (disconnectFallbackTimerRef.current) {
      clearTimeout(disconnectFallbackTimerRef.current);
      disconnectFallbackTimerRef.current = null;
    }
  }, []);

  const scheduleDisconnectFallback = useCallback(() => {
    clearDisconnectFallback();
    disconnectFallbackTimerRef.current = setTimeout(() => {
      setOnlineGame((prev) => {
        if (prev.status !== 'active' || prev.opponentOnline) {
          return prev;
        }

        const result = prev.yourColor === 'white'
          ? '1-0'
          : prev.yourColor === 'black'
            ? '0-1'
            : prev.result;

        return {
          ...prev,
          status: 'abandoned',
          result,
          terminationReason: 'abandonment',
          abortWarning: null,
        };
      });

      serverClocksRef.current = null;
      disconnectFallbackTimerRef.current = null;
    }, DISCONNECT_FORFEIT_MS);
  }, [clearDisconnectFallback]);

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
          socket.emit('game:join', { gameId: prev.gameId });
        }
        return prev;
      });
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    // Server tells us we have an active game to resume (FR-30)
    socket.on('game:resumable', (data: GameResumablePayload) => {
      setOnlineGame((prev) => {
        // Only auto-rejoin if we're not already in a game
        if (!prev.gameId) {
          socket.emit('game:join', { gameId: data.gameId });
          return { ...prev, gameId: data.gameId, status: 'active' };
        }
        return prev;
      });
    });

    // Matchmaking
    socket.on('match:found', (data: MatchFoundPayload) => {
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
      socket.emit('game:join', { gameId: data.gameId });
    });

    socket.on('queue:joined', () => setIsInQueue(true));
    socket.on('queue:left', () => setIsInQueue(false));

    // Game events
    socket.on('game:state', (data: GameStatePayload) => {
      if (data.status !== 'active') {
        clearDisconnectFallback();
      }

      setOnlineGame((prev) => {
        const yourColor = resolveYourColor(data.whitePlayer, data.blackPlayer, prev.yourColor);

        // Update server clocks ref
        if (data.clocks) {
          serverClocksRef.current = {
            whiteRemainingMs: data.clocks.whiteRemainingMs,
            blackRemainingMs: data.clocks.blackRemainingMs,
            activeColor: data.clocks.activeColor,
            receivedAt: Date.now(),
          };
        }

        return {
          ...prev,
          gameId: data.gameId,
          fen: data.fen,
          moves: data.moves.map((m) => ({ from: m.from, to: m.to, san: m.san, ply: m.ply })),
          yourColor,
          status: data.status,
          result: data.result,
          clocks: data.clocks,
          whitePlayer: data.whitePlayer,
          blackPlayer: data.blackPlayer,
        };
      });

      // Restore draw offer from state sync
      if ((data as GameStatePayload & { drawOfferedBy?: string | null }).drawOfferedBy) {
        setDrawOffered(true);
      }
    });

    socket.on('game:moveAccepted', (data: MoveAcceptedPayload) => {
      playMoveOutcome({
        san: data.move.san,
        captured: data.move.san.includes('x'),
        promotion: data.move.san.includes('=') ? 'p' : undefined,
        isCheck: data.move.san.includes('+') || data.move.san.includes('#'),
        isCheckmate: data.move.san.includes('#'),
      });

      setOnlineGame((prev) => {
        // Update server clocks ref
        if (data.clocks) {
          serverClocksRef.current = {
            whiteRemainingMs: data.clocks.whiteRemainingMs,
            blackRemainingMs: data.clocks.blackRemainingMs,
            activeColor: data.clocks.activeColor,
            receivedAt: Date.now(),
          };
        }

        return {
          ...prev,
          fen: data.fen,
          moves: [...prev.moves, data.move],
          clocks: data.clocks ?? prev.clocks,
          abortWarning: null,
        };
      });
      // Clear draw offer on new move
      setDrawOffered(false);
    });

    socket.on('game:moveRejected', (data: MoveRejectedPayload) => {
      playIllegalMove();
      setError(`Move rejected: ${data.reason}`);
    });

    socket.on('game:ended', (data: GameEndedPayload) => {
      if (data.reason !== 'checkmate') {
        playGameEnd();
      }

      clearDisconnectFallback();
      setOnlineGame((prev) => ({
        ...prev,
        status: data.reason === 'abandonment' ? 'abandoned' : 'completed',
        result: data.result,
        terminationReason: data.reason,
        abortWarning: null,
        opponentOnline: true,
      }));
      serverClocksRef.current = null;
    });

    socket.on('game:clockUpdate', (data: ClockUpdatePayload) => {
      serverClocksRef.current = {
        whiteRemainingMs: data.clocks.whiteRemainingMs,
        blackRemainingMs: data.clocks.blackRemainingMs,
        activeColor: data.clocks.activeColor,
        receivedAt: Date.now(),
      };
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
    socket.on('game:drawOffered', () => setDrawOffered(true));
    socket.on('game:drawDeclined', () => {
      setDrawOffered(false);
      setError('Draw offer declined');
    });

    // Opponent presence (FR-41)
    socket.on('game:opponentPresence', (data: OpponentPresencePayload) => {
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

    socket.on('game:opponentDisconnected', () => {
      scheduleDisconnectFallback();
      setOnlineGame((prev) => ({ ...prev, opponentOnline: false }));
    });

    socket.on('game:opponentReconnected', () => {
      clearDisconnectFallback();
      setOnlineGame((prev) => ({ ...prev, opponentOnline: true, abortWarning: null }));
    });

    // Abort warning (disconnect timeout countdown)
    socket.on('game:abortWarning', (data: AbortWarningPayload) => {
      setOnlineGame((prev) => ({
        ...prev,
        abortWarning: { secondsLeft: data.secondsLeft, reason: data.reason },
      }));
    });

    // Rematch events
    socket.on('game:rematchOffered', () => {
      setRematchOffered(true);
    });

    socket.on('game:rematchAccepted', (data: {
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
        const newColor = resolveYourColor(data.whitePlayer, data.blackPlayer, prev.yourColor);
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
      socket.emit('game:join', { gameId: data.newGameId });
    });

    socket.on('game:rematchDeclined', (data?: { gameId?: string; reason?: string }) => {
      setRematchPending(false);
      setRematchDeclined(true);
      setRematchDeclineReason(data?.reason || null);
    });

    socket.on('game:rematchExpired', () => {
      setRematchPending(false);
      setRematchOffered(false);
      setRematchDeclined(true);
      setRematchDeclineReason('Rematch request expired.');
    });

    return () => {
      clearDisconnectFallback();
      socket.disconnect();
      socketRef.current = null;
      serverClocksRef.current = null;
    };
  }, [
    clearDisconnectFallback,
    scheduleDisconnectFallback,
    playGameStart,
    playGameEnd,
    playIllegalMove,
    playMoveOutcome,
  ]);

  // Client-side clock interpolation (NFR-3): smooth visual countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const sc = serverClocksRef.current;
      if (!sc) return;

      setOnlineGame((prev) => {
        if (prev.status !== 'active' || !prev.clocks) return prev;

        const elapsed = Date.now() - sc.receivedAt;
        let whiteMs = sc.whiteRemainingMs;
        let blackMs = sc.blackRemainingMs;

        if (sc.activeColor === 'white') {
          whiteMs = Math.max(0, sc.whiteRemainingMs - elapsed);
        } else {
          blackMs = Math.max(0, sc.blackRemainingMs - elapsed);
        }

        return {
          ...prev,
          clocks: {
            whiteRemainingMs: whiteMs,
            blackRemainingMs: blackMs,
            activeColor: sc.activeColor,
          },
        };
      });
    }, CLOCK_TICK_MS);

    return () => clearInterval(interval);
  }, []);

  const joinQueue = useCallback(
    (timeControl: { initialMs: number; incrementMs: number }, preferredColor?: string) => {
      socketRef.current?.emit('queue:join', { timeControl, preferredColor });
    },
    [],
  );

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('queue:leave');
    setIsInQueue(false);
  }, []);

  const sendMove = useCallback((gameId: string, move: { from: string; to: string; promotion?: string }) => {
    socketRef.current?.emit('game:move', { gameId, move });
  }, []);

  const resign = useCallback((gameId: string) => {
    socketRef.current?.emit('game:resign', { gameId });
  }, []);

  const offerDraw = useCallback((gameId: string) => {
    socketRef.current?.emit('game:offerDraw', { gameId });
  }, []);

  const acceptDraw = useCallback((gameId: string) => {
    socketRef.current?.emit('game:acceptDraw', { gameId });
    setDrawOffered(false);
  }, []);

  const declineDraw = useCallback((gameId: string) => {
    socketRef.current?.emit('game:declineDraw', { gameId });
    setDrawOffered(false);
  }, []);

  const requestRematch = useCallback((gameId: string) => {
    // Prevent duplicate requests
    if (rematchPending) return;
    socketRef.current?.emit('game:rematchRequest', { gameId });
    setRematchPending(true);
    setRematchDeclined(false);
    setRematchDeclineReason(null);
  }, [rematchPending]);

  const acceptRematch = useCallback((gameId: string) => {
    socketRef.current?.emit('game:rematchAccept', { gameId });
    setRematchOffered(false);
  }, []);

  const declineRematch = useCallback((gameId: string) => {
    socketRef.current?.emit('game:rematchDecline', { gameId });
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
    serverClocksRef.current = null;
  }, [clearDisconnectFallback]);

  const syncGame = useCallback((gameId: string) => {
    socketRef.current?.emit('game:syncRequest', { gameId });
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
