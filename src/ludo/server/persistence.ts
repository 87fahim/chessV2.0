import { GameSession } from './models/GameSession.js'
import type { GameState } from './types.js'

export async function saveGame(game: GameState): Promise<void> {
  await GameSession.findOneAndUpdate(
    { gameId: game.id },
    { $set: { state: game } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
}

export async function loadGame(gameId: string): Promise<GameState | null> {
  const session = await GameSession.findOne({ gameId }).lean()
  return (session?.state as GameState | undefined) ?? null
}
