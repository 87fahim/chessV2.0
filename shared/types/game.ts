export interface PlayerInfo {
  type: 'user' | 'guest' | 'computer';
  userId?: string;
  guestId?: string;
  name: string;
}

export interface MoveRecord {
  ply: number;
  from: string;
  to: string;
  san: string;
  fenAfter: string;
  movedAt: string;
  spentTimeMs?: number;
}

export interface TimeControl {
  initialMs: number;
  incrementMs: number;
}

export interface ClockState {
  whiteRemainingMs: number;
  blackRemainingMs: number;
  activeColor: string;
  activeSince?: string;
}

export type GameMode = 'local' | 'computer' | 'analysis' | 'online';
export type GameStatus = 'pending' | 'waiting_for_opponent' | 'active' | 'completed' | 'abandoned' | 'cancelled';
export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';
export type TerminationReason =
  | 'checkmate'
  | 'resignation'
  | 'timeout'
  | 'stalemate'
  | 'draw_agreement'
  | 'repetition'
  | 'insufficient_material'
  | 'abandonment';

export interface GameData {
  _id: string;
  mode: GameMode;
  status: GameStatus;
  label?: string;
  ownerUserId?: string;
  whitePlayer: PlayerInfo;
  blackPlayer: PlayerInfo;
  fen: string;
  pgn: string;
  moves: MoveRecord[];
  result: GameResult;
  terminationReason?: TerminationReason;
  timeControl?: TimeControl;
  clocks?: ClockState;
  difficulty?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateGameRequest {
  mode: GameMode;
  whitePlayer: PlayerInfo;
  blackPlayer: PlayerInfo;
  fen?: string;
  timeControl?: TimeControl;
  difficulty?: string;
  label?: string;
}

export interface HistoryFilter {
  result?: string;
  mode?: string;
  color?: 'white' | 'black';
  dateFrom?: string;
  dateTo?: string;
}
