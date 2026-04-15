import { Game, IGame } from '../models/Game.js';
import { GameStatus } from '../constants/gameStatus.js';

export interface ClockState {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: string;
  activeSince?: Date;
}

export function calculateRemainingTime(game: IGame): ClockState | null {
  if (!game.clocks || !game.timeControl) return null;

  const now = Date.now();
  let whiteRemaining = game.clocks.whiteRemainingMs;
  let blackRemaining = game.clocks.blackRemainingMs;

  // Subtract elapsed time for the active player
  if (game.clocks.activeSince && game.status === GameStatus.ACTIVE) {
    const elapsed = now - game.clocks.activeSince.getTime();
    if (game.clocks.activeColor === 'white') {
      whiteRemaining -= elapsed;
    } else {
      blackRemaining -= elapsed;
    }
  }

  return {
    whiteRemainingMs: Math.max(0, whiteRemaining),
    blackRemainingMs: Math.max(0, blackRemaining),
    activeColor: game.clocks.activeColor,
    activeSince: game.clocks.activeSince,
  };
}

export async function checkTimeout(gameId: string): Promise<{ timedOut: boolean; loser?: 'white' | 'black' }> {
  const game = await Game.findById(gameId);
  if (!game || game.status !== GameStatus.ACTIVE || !game.clocks) {
    return { timedOut: false };
  }

  const clocks = calculateRemainingTime(game);
  if (!clocks) return { timedOut: false };

  if (clocks.whiteRemainingMs <= 0) {
    return { timedOut: true, loser: 'white' };
  }
  if (clocks.blackRemainingMs <= 0) {
    return { timedOut: true, loser: 'black' };
  }

  return { timedOut: false };
}

export function startClock(game: IGame): void {
  if (game.clocks) {
    game.clocks.activeSince = new Date();
  }
}
