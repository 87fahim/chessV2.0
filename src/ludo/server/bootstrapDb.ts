import { AnonymousSession } from './models/AnonymousSession.js'
import { GameSession } from './models/GameSession.js'
import { IdempotencyRecord } from './models/IdempotencyRecord.js'
import { User } from './models/User.js'

async function ensureModelCollection(model: {
  createCollection: () => Promise<unknown>
  syncIndexes: () => Promise<unknown>
  collection: { collectionName: string }
}): Promise<void> {
  try {
    await model.createCollection()
  } catch (error) {
    const namespaceExistsCode = 48
    if ((error as { code?: number }).code !== namespaceExistsCode) {
      throw error
    }
  }

  await model.syncIndexes()
}

export async function ensureDbCollections(): Promise<void> {
  const models = [User, GameSession, AnonymousSession, IdempotencyRecord]

  for (const model of models) {
    await ensureModelCollection(model)
    console.log(`Collection ready: ${model.collection.collectionName}`)
  }
}
