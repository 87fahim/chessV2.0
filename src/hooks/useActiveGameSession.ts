import { useEffect, useState } from 'react';
import { useAppSelector } from './useStore';
import { gameApi } from '../services/gameService';

export interface ActiveSessionGame {
  _id: string;
  mode: string;
  status: string;
  gameId: string;
}

/**
 * On mount, calls GET /games/active-session to check if the current browser session
 * has an in-progress game. Returns the game document or null.
 *
 * Used to satisfy AC1 (tab duplication), AC3 (guest restore), AC4 (logged-in restore),
 * AC7 (refresh), and AC8 (disconnect/reconnect) via the HTTP layer.
 */
export function useActiveGameSession() {
  const { guestId } = useAppSelector((s) => s.auth);
  const [activeGame, setActiveGame] = useState<ActiveSessionGame | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    let cancelled = false;

    gameApi
      .getActiveSession(guestId)
      .then((res) => {
        if (!cancelled) {
          const game = res.data?.data?.game ?? null;
          setActiveGame(
            game
              ? { _id: game._id, mode: game.mode, status: game.status, gameId: game._id }
              : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) setActiveGame(null);
      });

    return () => {
      cancelled = true;
    };
  }, [guestId]);

  return { activeGame, isChecking: activeGame === undefined };
}
