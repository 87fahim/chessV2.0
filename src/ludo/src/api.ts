import type { GameState } from './types'

interface ApiErrorResponse {
  message?: string
  code?: string
  latestRevision?: number
}

function makeIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

async function parseResponse(response: Response): Promise<GameState> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ message: 'Request failed.' }))) as ApiErrorResponse
    throw new Error(payload.message ?? 'Request failed.')
  }

  return (await response.json()) as GameState
}

export async function createGame(playerCount: 2 | 3 | 4, playerNames: string[]): Promise<GameState> {
  const key = makeIdempotencyKey()
  const response = await fetch('/api/v1/games', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({ playerCount, playerNames }),
  })

  return parseResponse(response)
}

export async function createGameWithKey(
  playerCount: 2 | 3 | 4,
  playerNames: string[],
  idempotencyKey: string,
): Promise<GameState> {
  const response = await fetch('/api/v1/games', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ playerCount, playerNames }),
  })

  return parseResponse(response)
}

export async function getGame(gameId: string): Promise<GameState> {
  const response = await fetch(`/api/v1/games/${gameId}`, {
    credentials: 'include',
  })
  return parseResponse(response)
}

export async function resumeGame(): Promise<GameState | null> {
  const response = await fetch('/api/v1/session/game', {
    credentials: 'include',
  })

  if (response.status === 204) {
    return null
  }

  return parseResponse(response)
}

export async function rollDice(
  gameId: string,
  expectedRevision: number,
  roll: number,
): Promise<GameState> {
  const response = await fetch(`/api/v1/games/${gameId}/actions`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': makeIdempotencyKey(),
    },
    body: JSON.stringify({
      type: 'ROLL',
      expectedRevision,
      payload: { roll },
    }),
  })
  return parseResponse(response)
}

export async function moveToken(
  gameId: string,
  tokenId: string,
  expectedRevision: number,
): Promise<GameState> {
  const response = await fetch(`/api/v1/games/${gameId}/actions`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': makeIdempotencyKey(),
    },
    body: JSON.stringify({
      type: 'MOVE',
      expectedRevision,
      payload: { tokenId },
    }),
  })

  return parseResponse(response)
}
