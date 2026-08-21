import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import { isValidObjectId } from 'mongoose'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { connectLudoDb, isLudoDbConnected } from './config/ludoDb.js'
import { ludoEnv } from './config/ludoEnv.js'
import { ensureDbCollections } from './bootstrapDb.js'
import { createGame, moveToken, rollDice } from './ludoEngine.js'
import { AnonymousSession } from './models/AnonymousSession.js'
import { IdempotencyRecord } from './models/IdempotencyRecord.js'
import { User } from './models/User.js'
import { loadGame, saveGame } from './persistence.js'
import {
  ensureSessionToken,
  getSessionExpiresAt,
  getSessionToken,
  hashSessionToken,
} from './session.js'
import type { CreateGameInput, GameState } from './types.js'

const app = express()
const port = ludoEnv.port

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)
app.use(express.json())

interface FieldError {
  field: string
  message: string
}

interface ApiErrorPayload {
  code: string
  message: string
  correlationId: string
  fieldErrors?: FieldError[]
  latestRevision?: number
}

type CorrelatedRequest = Request & { correlationId?: string }

app.use((request: CorrelatedRequest, response: Response, next: NextFunction) => {
  const correlationId = request.header('x-correlation-id')?.trim() || randomUUID()
  request.correlationId = correlationId
  response.setHeader('x-correlation-id', correlationId)
  next()
})

function sendError(
  response: Response,
  request: CorrelatedRequest,
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldError[],
  latestRevision?: number,
): void {
  const payload: ApiErrorPayload = {
    code,
    message,
    correlationId: request.correlationId ?? randomUUID(),
  }

  if (fieldErrors && fieldErrors.length > 0) {
    payload.fieldErrors = fieldErrors
  }

  if (typeof latestRevision === 'number') {
    payload.latestRevision = latestRevision
  }

  response.status(status).json(payload)
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseUserName(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('name must be a string.')
  }

  const name = input.trim()
  if (!name) {
    throw new Error('name is required.')
  }

  if (name.length > 40) {
    throw new Error('name must be at most 40 characters.')
  }

  return name
}

function parseDisplayNames(rawNames: unknown, playerCount: 2 | 3 | 4): string[] {
  const defaults = ['Player 1', 'Player 2', 'Player 3', 'Player 4']
  const values = Array.isArray(rawNames) ? rawNames : []
  const normalized: string[] = []
  const fieldErrors: FieldError[] = []
  const uniqueness = new Set<string>()

  for (let index = 0; index < playerCount; index += 1) {
    const raw = values[index]
    const fallback = defaults[index]
    const candidate = typeof raw === 'string' ? raw.trim() : fallback
    const length = Array.from(candidate).length
    const fieldName = `playerNames[${index}]`

    if (length < 1 || length > 24) {
      fieldErrors.push({
        field: fieldName,
        message: 'Name must be between 1 and 24 characters.',
      })
      normalized.push(fallback)
      continue
    }

    const key = candidate.toLocaleLowerCase()
    if (uniqueness.has(key)) {
      fieldErrors.push({
        field: fieldName,
        message: 'Names must be unique (case-insensitive).',
      })
      normalized.push(candidate)
      continue
    }

    uniqueness.add(key)
    normalized.push(candidate)
  }

  if (fieldErrors.length > 0) {
    const error = new Error('Invalid player names.') as Error & { fieldErrors?: FieldError[] }
    error.fieldErrors = fieldErrors
    throw error
  }

  return normalized
}

function parseCreateGameInput(request: Request): CreateGameInput {
  const body = request.body as Partial<CreateGameInput> | undefined
  const playerCount = body?.playerCount

  if (playerCount !== 2 && playerCount !== 3 && playerCount !== 4) {
    throw new Error('playerCount must be 2, 3, or 4.')
  }

  return {
    playerCount,
    playerNames: parseDisplayNames(body?.playerNames, playerCount),
  }
}

function mapUserDocument(user: {
  _id: unknown
  name: string
  createdAt: Date | string
  updatedAt: Date | string
}): { id: string; name: string; createdAt: Date | string; updatedAt: Date | string } {
  return {
    id: String(user._id),
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function resolveOrCreateUserByName(name: string): Promise<string> {
  const exactNameRegex = new RegExp(`^${escapeRegex(name)}$`, 'i')
  const existing = await User.findOne({ name: exactNameRegex }).sort({ updatedAt: -1 }).lean()
  if (existing) {
    return String(existing._id)
  }

  const created = await User.create({ name })
  return String(created._id)
}

async function attachUsersToGamePlayers(game: GameState): Promise<void> {
  await Promise.all(
    game.players.map(async (player) => {
      player.userId = await resolveOrCreateUserByName(player.name)
    }),
  )
}

async function getGameOr404(
  request: CorrelatedRequest,
  response: Response,
  gameId: string,
): Promise<GameState | null> {
  if (typeof gameId !== 'string' || gameId.trim().length === 0) {
    sendError(response, request, 400, 'INVALID_GAME_ID', 'A valid gameId is required.')
    return null
  }

  const game = await loadGame(gameId)
  if (!game) {
    sendError(response, request, 404, 'GAME_NOT_FOUND', 'Game session was not found.')
    return null
  }

  return game
}

function getIdempotencyKey(request: CorrelatedRequest): string {
  const key = request.header('idempotency-key')?.trim()
  if (!key) {
    throw new Error('Idempotency-Key header is required.')
  }

  return key
}

async function getSessionHashOrNull(request: CorrelatedRequest): Promise<string | null> {
  const token = getSessionToken(request)
  if (!token) {
    return null
  }

  return hashSessionToken(token)
}

async function bindSessionToGame(sessionHash: string, gameId: string): Promise<void> {
  await AnonymousSession.findOneAndUpdate(
    { sessionHash },
    {
      $set: {
        gameId,
        expiresAt: getSessionExpiresAt(),
      },
    },
    {
      upsert: true,
      returnDocument: 'after',
    },
  )
}

async function getAuthorizedSessionGameId(request: CorrelatedRequest): Promise<string | null> {
  const sessionHash = await getSessionHashOrNull(request)
  if (!sessionHash) {
    return null
  }

  const session = await AnonymousSession.findOne({
    sessionHash,
    expiresAt: { $gt: new Date() },
  })
    .select({ gameId: 1 })
    .lean()

  return session?.gameId ?? null
}

async function tryServeIdempotentResponse(
  response: Response,
  sessionHash: string,
  scope: string,
  key: string,
): Promise<boolean> {
  const existing = await IdempotencyRecord.findOne({ sessionHash, scope, key }).lean()
  if (!existing) {
    return false
  }

  response.status(existing.statusCode).json(existing.responseBody)
  return true
}

async function recordIdempotentResponse(
  sessionHash: string,
  scope: string,
  key: string,
  statusCode: number,
  responseBody: unknown,
): Promise<void> {
  try {
    await IdempotencyRecord.create({ sessionHash, scope, key, statusCode, responseBody })
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) {
      throw error
    }
  }
}

app.get('/api/health', (_request, response) => {
  const dbReady = isLudoDbConnected()
  response.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    database: {
      ok: dbReady,
      name: ludoEnv.mongoDbName,
    },
  })
})

app.get('/api/v1/session/game', async (request: CorrelatedRequest, response) => {
  const gameId = await getAuthorizedSessionGameId(request)
  if (!gameId) {
    response.status(204).send()
    return
  }

  const game = await loadGame(gameId)
  if (!game) {
    response.status(204).send()
    return
  }

  response.status(200).json(game)
})

app.post('/api/v1/games', async (request: CorrelatedRequest, response) => {
  try {
    const idempotencyKey = getIdempotencyKey(request)
    const sessionToken = ensureSessionToken(request, response)
    const sessionHash = hashSessionToken(sessionToken)
    const scope = 'create-game'

    if (await tryServeIdempotentResponse(response, sessionHash, scope, idempotencyKey)) {
      return
    }

    const input = parseCreateGameInput(request)
    const game = createGame(input)
    await attachUsersToGamePlayers(game)
    await saveGame(game)
    await bindSessionToGame(sessionHash, game.gameId)
    await recordIdempotentResponse(sessionHash, scope, idempotencyKey, 201, game)

    response.status(201).json(game)
  } catch (error) {
    const fieldErrors = (error as { fieldErrors?: FieldError[] }).fieldErrors
    const message = error instanceof Error ? error.message : 'Failed to create game.'
    sendError(response, request, 400, 'CREATE_GAME_FAILED', message, fieldErrors)
  }
})

app.get('/api/v1/games/:gameId', async (request: CorrelatedRequest, response) => {
  const requestedGameId = request.params.gameId
  const authorizedGameId = await getAuthorizedSessionGameId(request)

  if (!authorizedGameId || authorizedGameId !== requestedGameId) {
    sendError(response, request, 403, 'FORBIDDEN', 'You are not authorized to access this game.')
    return
  }

  const game = await getGameOr404(request, response, requestedGameId)
  if (!game) {
    return
  }

  response.status(200).json(game)
})

app.post('/api/v1/games/:gameId/actions', async (request: CorrelatedRequest, response) => {
  const requestedGameId = request.params.gameId
  const authorizedGameId = await getAuthorizedSessionGameId(request)

  if (!authorizedGameId || authorizedGameId !== requestedGameId) {
    sendError(response, request, 403, 'FORBIDDEN', 'You are not authorized to access this game.')
    return
  }

  const sessionHash = await getSessionHashOrNull(request)
  if (!sessionHash) {
    sendError(response, request, 401, 'UNAUTHORIZED', 'Session is required to perform actions.')
    return
  }

  let idempotencyKey = ''
  try {
    idempotencyKey = getIdempotencyKey(request)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Missing idempotency key.'
    sendError(response, request, 400, 'IDEMPOTENCY_REQUIRED', message)
    return
  }

  const scope = `game-action:${requestedGameId}`
  if (await tryServeIdempotentResponse(response, sessionHash, scope, idempotencyKey)) {
    return
  }

  const game = await getGameOr404(request, response, requestedGameId)
  if (!game) {
    return
  }

  const body = request.body as
    | { type?: 'ROLL' | 'MOVE'; payload?: { tokenId?: string; roll?: number }; expectedRevision?: number }
    | undefined

  const expectedRevision = body?.expectedRevision
  if (!Number.isInteger(expectedRevision)) {
    sendError(response, request, 400, 'EXPECTED_REVISION_REQUIRED', 'expectedRevision must be an integer.')
    return
  }

  if (expectedRevision !== game.revision) {
    sendError(
      response,
      request,
      409,
      'REVISION_CONFLICT',
      'State is stale. Fetch the latest game and retry.',
      undefined,
      game.revision,
    )
    return
  }

  try {
    let updated: GameState
    if (body?.type === 'ROLL') {
      const roll = body.payload?.roll
      if (!Number.isInteger(roll)) {
        sendError(response, request, 400, 'ROLL_REQUIRED', 'payload.roll must be an integer from 1 to 6.')
        return
      }

      updated = rollDice(game, roll as number)
    } else if (body?.type === 'MOVE') {
      const tokenId = body.payload?.tokenId
      if (!tokenId) {
        sendError(response, request, 400, 'TOKEN_ID_REQUIRED', 'tokenId is required for MOVE action.')
        return
      }

      updated = moveToken(game, tokenId)
    } else {
      sendError(response, request, 400, 'INVALID_ACTION_TYPE', 'type must be ROLL or MOVE.')
      return
    }

    await saveGame(updated)
    await bindSessionToGame(sessionHash, requestedGameId)
    await recordIdempotentResponse(sessionHash, scope, idempotencyKey, 200, updated)
    response.status(200).json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process action.'
    sendError(response, request, 400, 'ACTION_FAILED', message)
  }
})

app.post('/api/users', async (request: CorrelatedRequest, response) => {
  try {
    const name = parseUserName((request.body as { name?: unknown } | undefined)?.name)
    const user = await User.create({ name })
    response.status(201).json(mapUserDocument(user))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user.'
    sendError(response, request, 400, 'CREATE_USER_FAILED', message)
  }
})

app.get('/api/users', async (request: CorrelatedRequest, response) => {
  const rawLimit = request.query.limit
  const rawSearch = request.query.search

  const limitValue = typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : Number.NaN
  const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 200) : 50
  const search = typeof rawSearch === 'string' ? rawSearch.trim() : ''

  const filter = search
    ? {
        name: {
          $regex: escapeRegex(search),
          $options: 'i',
        },
      }
    : {}

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
  response.json(users.map(mapUserDocument))
})

app.get('/api/users/:userId', async (request: CorrelatedRequest, response) => {
  const userId = request.params.userId
  if (!isValidObjectId(userId)) {
    sendError(response, request, 400, 'INVALID_USER_ID', 'A valid userId is required.')
    return
  }

  const user = await User.findById(userId).lean()
  if (!user) {
    sendError(response, request, 404, 'USER_NOT_FOUND', 'User was not found.')
    return
  }

  response.json(mapUserDocument(user))
})

app.patch('/api/users/:userId', async (request: CorrelatedRequest, response) => {
  const userId = request.params.userId
  if (!isValidObjectId(userId)) {
    sendError(response, request, 400, 'INVALID_USER_ID', 'A valid userId is required.')
    return
  }

  try {
    const name = parseUserName((request.body as { name?: unknown } | undefined)?.name)
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { name } },
      { returnDocument: 'after', runValidators: true },
    ).lean()

    if (!updated) {
      sendError(response, request, 404, 'USER_NOT_FOUND', 'User was not found.')
      return
    }

    response.json(mapUserDocument(updated))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user.'
    sendError(response, request, 400, 'UPDATE_USER_FAILED', message)
  }
})

app.delete('/api/users/:userId', async (request: CorrelatedRequest, response) => {
  const userId = request.params.userId
  if (!isValidObjectId(userId)) {
    sendError(response, request, 400, 'INVALID_USER_ID', 'A valid userId is required.')
    return
  }

  const deleted = await User.findByIdAndDelete(userId).lean()
  if (!deleted) {
    sendError(response, request, 404, 'USER_NOT_FOUND', 'User was not found.')
    return
  }

  response.status(204).send()
})

const distPath = path.resolve(process.cwd(), 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))

  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(distPath, 'index.html'))
  })
}

connectLudoDb()
  .then(async () => {
    await ensureDbCollections()
    app.listen(port, () => {
      console.log(`Ludo server listening on port ${port}`)
    })
  })
  .catch((error) => {
    console.error('Server startup failed', error)
    process.exit(1)
  })
