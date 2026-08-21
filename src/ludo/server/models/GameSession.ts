import mongoose, { Schema } from 'mongoose'
import type { GameState } from '../types.js'

interface GameSessionDocument {
  gameId: string
  state: GameState
  createdAt: Date
  updatedAt: Date
}

const gameSessionSchema = new Schema<GameSessionDocument>(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    state: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    collection: 'game_sessions',
    timestamps: true,
  },
)

export const GameSession =
  mongoose.models.GameSession ||
  mongoose.model<GameSessionDocument>('GameSession', gameSessionSchema)
