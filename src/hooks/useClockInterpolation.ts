import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { OnlineGameState } from './onlineGameState';

/** Client-side clock interpolation interval (ms) */
const CLOCK_TICK_MS = 100;

interface ServerClocks {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: string;
}

/**
 * Smooth visual clock countdown between server updates (NFR-3).
 * Holds the latest server clocks and interpolates the active side's
 * remaining time locally every tick.
 */
export function useClockInterpolation(setOnlineGame: Dispatch<SetStateAction<OnlineGameState>>) {
  const serverClocksRef = useRef<(ServerClocks & { receivedAt: number }) | null>(null);

  const updateServerClocks = useCallback((clocks: ServerClocks) => {
    serverClocksRef.current = {
      whiteRemainingMs: clocks.whiteRemainingMs,
      blackRemainingMs: clocks.blackRemainingMs,
      activeColor: clocks.activeColor,
      receivedAt: Date.now(),
    };
  }, []);

  const clearServerClocks = useCallback(() => {
    serverClocksRef.current = null;
  }, []);

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
  }, [setOnlineGame]);

  return { updateServerClocks, clearServerClocks };
}
