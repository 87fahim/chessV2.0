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

const SOCKET_URL = import.meta.env.VITE_API_URL;

export interface OnlineGameState {
  gameId: string | null;
  fen: string;
  moves: Array<{ from: string; to: string; san: string; ply: number }>;
  yourColor: 'white' | 'black' | null;
  status: string;
  result: string;
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
  clocks: null,
  whitePlayer: null,
  blackPlayer: null,
  opponentOnline: true,
  abortWarning: null,
};

/** Client-side clock interpolation interval (ms) */
const CLOCK_TICK_MS = 100;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [onlineGame, setOnlineGame] = useState<OnlineGameState>(INITIAL_ONLINE);
  const [drawOffered, setDrawOffered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to hold latest clocks from server for interpolation
  const serverClocksRef = useRef<{
    whiteRemainingMs: number;
    blackRemainingMs: number;
    activeColor: string;
    receivedAt: number;
  } | null>(null);

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
      setOnlineGame((prev) => {
        // Determine our color from player info if not already set
        let yourColor = prev.yourColor;
        if (!yourColor && data.whitePlayer && data.blackPlayer) {
          // The server doesn't send who we are, so keep our assigned color
          yourColor = prev.yourColor;
        }

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
      setError(`Move rejected: ${data.reason}`);
    });

    socket.on('game:ended', (data: GameEndedPayload) => {
      setOnlineGame((prev) => ({
        ...prev,
        status: 'completed',
        result: data.result,
        abortWarning: null,
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
      setOnlineGame((prev) => ({
        ...prev,
        opponentOnline: data.online,
      }));
    });

    socket.on('game:opponentDisconnected', () => {
      setOnlineGame((prev) => ({ ...prev, opponentOnline: false }));
    });

    socket.on('game:opponentReconnected', () => {
      setOnlineGame((prev) => ({ ...prev, opponentOnline: true, abortWarning: null }));
    });

    // Abort warning (disconnect timeout countdown)
    socket.on('game:abortWarning', (data: AbortWarningPayload) => {
      setOnlineGame((prev) => ({
        ...prev,
        abortWarning: { secondsLeft: data.secondsLeft, reason: data.reason },
      }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      serverClocksRef.current = null;
    };
  }, []);

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

  const resetOnlineGame = useCallback(() => {
    setOnlineGame(INITIAL_ONLINE);
    setDrawOffered(false);
    setError(null);
    serverClocksRef.current = null;
  }, []);

  const syncGame = useCallback((gameId: string) => {
    socketRef.current?.emit('game:syncRequest', { gameId });
  }, []);

  return {
    isConnected,
    isInQueue,
    onlineGame,
    drawOffered,
    error,
    joinQueue,
    leaveQueue,
    sendMove,
    resign,
    offerDraw,
    acceptDraw,
    declineDraw,
    resetOnlineGame,
    syncGame,
    clearError: () => setError(null),
  };
}
