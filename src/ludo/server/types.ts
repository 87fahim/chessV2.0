export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'

export interface TokenState {
  id: string
  index: number
  progress: number
}

export type GameStatus = 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED'

export interface LastActionSummary {
  type: 'CREATE_GAME' | 'ROLL' | 'MOVE'
  at: string
  playerId?: string
  playerName?: string
  message: string
}

export interface PlayerState {
  id: string
  color: PlayerColor
  name: string
  userId?: string | null
  tokens: TokenState[]
  capturesMade: number
  timesCaptured: number
}

export interface MoveSummary {
  playerId: string
  playerName: string
  tokenId: string
  roll: number
  from: number
  to: number
  capturedTokenIds: string[]
}

export interface GameState {
  id: string
  gameId: string
  schemaVersion: number
  status: GameStatus
  revision: number
  createdAt: string
  updatedAt: string
  moveCount: number
  playerCount: 2 | 3 | 4
  players: PlayerState[]
  currentPlayerIndex: number
  currentPlayerId: string
  pendingRoll: number | null
  lastDiceRoll: number | null
  legalMoves: string[]
  winnerPlayerId: string | null
  /** Player ids in the order they finished all tokens (#1 first). */
  finishOrder: string[]
  lastMove: MoveSummary | null
  lastAction: LastActionSummary | null
  message: string
}

export interface CreateGameInput {
  playerCount: 2 | 3 | 4
  playerNames: string[]
}
