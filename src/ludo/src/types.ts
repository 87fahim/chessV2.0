export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue' | 'orange' | 'purple'

export type PlayerCount = 2 | 3 | 4 | 5 | 6

export interface TokenState {
  id: string
  index: number
  progress: number
}

export interface PlayerState {
  id: string
  /** Board seat / path color. */
  color: PlayerColor
  /** Cosmetic token/UI color as #rrggbb. Falls back to seat default when missing. */
  paintHex?: string
  name: string
  userId?: string | null
  tokens: TokenState[]
  /** Opponent pieces this player has sent home. */
  capturesMade: number
  /** Times this player's pieces were sent home. */
  timesCaptured: number
  /** Removed mid-match — no tokens, no turns. */
  withdrawn?: boolean
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
  status: 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED'
  revision: number
  createdAt: string
  updatedAt: string
  moveCount: number
  playerCount: PlayerCount
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
  lastAction: {
    type: 'CREATE_GAME' | 'ROLL' | 'MOVE' | 'WITHDRAW'
    at: string
    playerId?: string
    playerName?: string
    message: string
  } | null
  message: string
}
