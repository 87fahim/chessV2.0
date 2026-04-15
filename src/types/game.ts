import type { PieceColor } from './chess';

export type GameMode = 'vs-computer' | 'practice' | 'analysis' | 'online';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface GameSettings {
  mode: GameMode;
  playerColor: PieceColor;
  difficulty: Difficulty;
  timeControl?: number; // seconds, optional
  allowUndo: boolean;
}

export interface GameState {
  id: string;
  settings: GameSettings;
  fen: string;
  moves: string[];
  status: GameStatus;
  result: string | null; // '1-0', '0-1', '1/2-1/2', null
  startedAt: string;
  endedAt: string | null;
}
