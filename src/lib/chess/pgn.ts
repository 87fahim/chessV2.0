import { Chess } from 'chess.js';

export function gameToPgn(game: Chess): string {
  return game.pgn();
}

export function loadPgn(pgn: string): Chess | null {
  try {
    const game = new Chess();
    game.loadPgn(pgn);
    return game;
  } catch {
    return null;
  }
}
