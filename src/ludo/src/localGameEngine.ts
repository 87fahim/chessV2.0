import { FINISH_PROGRESS, SAFE_OUTER_INDEXES, START_INDEX } from './boardLayout'
import { DEFAULT_PAINT_BY_SEAT, normalizePaintHex } from './playerPaint'
import type { GameState, MoveSummary, PlayerColor, PlayerState, TokenState } from './types'

const STORAGE_KEY = 'ludo.activeGame'

const PLAYER_COLORS_BY_COUNT: Record<2 | 3 | 4, PlayerColor[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'red', 'green'],
  4: ['blue', 'red', 'green', 'yellow'],
}

function nowIso(): string {
  return new Date().toISOString()
}

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeName(name: string, fallback: string): string {
  const trimmed = name.trim()
  return trimmed.length > 0 ? trimmed.slice(0, 24) : fallback
}

function createTokens(color: PlayerColor): TokenState[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `${color}-${index + 1}`,
    index,
    progress: -1,
  }))
}

function getTrackIndex(color: PlayerColor, progress: number): number {
  return (START_INDEX[color] + progress) % 52
}

function canMoveToken(token: TokenState, roll: number): boolean {
  // Yard exit only on 6.
  if (token.progress === -1) {
    return roll === 6
  }

  // Finished tokens are out of play — never movable and never highlighted.
  if (token.progress >= FINISH_PROGRESS) {
    return false
  }

  // Exact / no-overshoot: may only move if the roll lands on or before the finish tile.
  return token.progress + roll <= FINISH_PROGRESS
}

function getLegalMovesForRoll(player: PlayerState, roll: number): string[] {
  return player.tokens.filter((token) => canMoveToken(token, roll)).map((token) => token.id)
}

function isWinner(player: PlayerState): boolean {
  return player.tokens.every((token) => token.progress >= FINISH_PROGRESS)
}

function ensureFinishOrder(game: GameState): string[] {
  if (!Array.isArray(game.finishOrder)) {
    game.finishOrder = []
  }
  return game.finishOrder
}

function playerHasFinished(game: GameState, player: PlayerState): boolean {
  return ensureFinishOrder(game).includes(player.id) || isWinner(player)
}

function gameIsComplete(game: GameState): boolean {
  return game.status === 'COMPLETED'
}

function nextActivePlayerIndex(game: GameState, fromIndex: number): number {
  const count = game.players.length
  let index = fromIndex
  for (let step = 0; step < count; step += 1) {
    index = (index + 1) % count
    if (!playerHasFinished(game, game.players[index])) {
      return index
    }
  }
  return fromIndex
}

function finalizeIfRaceOver(game: GameState): boolean {
  const order = ensureFinishOrder(game)
  if (order.length === 0) {
    return false
  }

  const remaining = game.players.filter((player) => !order.includes(player.id))
  // End when only the last player is left unfinished (e.g. 3 of 4 have finished).
  if (remaining.length <= 1 && order.length >= game.players.length - 1) {
    for (const player of remaining) {
      if (!order.includes(player.id)) {
        order.push(player.id)
      }
    }
    game.status = 'COMPLETED'
    game.pendingRoll = null
    game.legalMoves = []
    if (!game.winnerPlayerId && order[0]) {
      game.winnerPlayerId = order[0]
    }
    return true
  }

  return game.status === 'COMPLETED'
}

function advanceToNextActivePlayer(game: GameState): void {
  if (finalizeIfRaceOver(game)) {
    return
  }

  const unfinished = game.players.filter((player) => !playerHasFinished(game, player))
  if (unfinished.length === 0) {
    game.status = 'COMPLETED'
    return
  }

  const nextIndex = nextActivePlayerIndex(game, game.currentPlayerIndex)
  const nextPlayer = game.players[nextIndex]
  if (!nextPlayer || playerHasFinished(game, nextPlayer)) {
    const fallbackIndex = game.players.findIndex((player) => !playerHasFinished(game, player))
    game.currentPlayerIndex = fallbackIndex >= 0 ? fallbackIndex : game.currentPlayerIndex
  } else {
    game.currentPlayerIndex = nextIndex
  }

  game.currentPlayerId = game.players[game.currentPlayerIndex]?.id ?? ''
  game.status = 'ACTIVE'
}

function recordPlayerFinish(game: GameState, player: PlayerState): number {
  const order = ensureFinishOrder(game)
  if (!order.includes(player.id)) {
    order.push(player.id)
  }
  if (!game.winnerPlayerId) {
    game.winnerPlayerId = player.id
  }
  finalizeIfRaceOver(game)
  return order.indexOf(player.id) + 1
}

function placeLabel(place: number, isLast: boolean): string {
  if (isLast) {
    return 'Loser'
  }
  if (place === 1) {
    return 'Champion'
  }
  if (place === 2) {
    return 'Runner-up'
  }
  if (place === 3) {
    return 'Third Place'
  }
  return `${place}th Place`
}

type TrackOccupant = { player: PlayerState; token: TokenState }

function getTokensOnTrack(game: GameState, trackIndex: number): TrackOccupant[] {
  const occupants: TrackOccupant[] = []
  for (const otherPlayer of game.players) {
    for (const otherToken of otherPlayer.tokens) {
      if (otherToken.progress < 0 || otherToken.progress > 50) {
        continue
      }
      if (getTrackIndex(otherPlayer.color, otherToken.progress) === trackIndex) {
        occupants.push({ player: otherPlayer, token: otherToken })
      }
    }
  }
  return occupants
}

function groupOccupantsByPlayer(occupants: TrackOccupant[]): Map<string, TrackOccupant[]> {
  const groups = new Map<string, TrackOccupant[]>()
  for (const occupant of occupants) {
    const list = groups.get(occupant.player.id) ?? []
    list.push(occupant)
    groups.set(occupant.player.id, list)
  }
  return groups
}

function applyMoveAndCapture(
  game: GameState,
  player: PlayerState,
  token: TokenState,
  roll: number,
): MoveSummary {
  const from = token.progress
  const to = from === -1 ? 0 : from + roll
  const fromTrack = from >= 0 && from <= 50 ? getTrackIndex(player.color, from) : null

  token.progress = to

  const capturedTokenIds: string[] = []

  // Captures only on the shared outer track. Safe tiles never capture.
  // 2+ tokens of the same player protect each other from a landing capture.
  if (to >= 0 && to <= 50) {
    const destinationTrack = getTrackIndex(player.color, to)
    if (!SAFE_OUTER_INDEXES.has(destinationTrack)) {
      const groups = groupOccupantsByPlayer(getTokensOnTrack(game, destinationTrack))
      for (const [otherPlayerId, group] of groups) {
        if (otherPlayerId === player.id) {
          continue
        }
        if (group.length === 1) {
          group[0].token.progress = -1
          capturedTokenIds.push(group[0].token.id)
        }
      }
    }
  }

  // Leaving a non-safe tile with exactly one of your tokens left beside an enemy
  // captures that leftover token.
  if (fromTrack !== null && !SAFE_OUTER_INDEXES.has(fromTrack)) {
    const destinationTrack = to >= 0 && to <= 50 ? getTrackIndex(player.color, to) : null
    if (destinationTrack !== fromTrack) {
      const groups = groupOccupantsByPlayer(getTokensOnTrack(game, fromTrack))
      const leftovers = groups.get(player.id) ?? []
      const enemyPresent = [...groups.keys()].some((id) => id !== player.id)
      if (leftovers.length === 1 && enemyPresent) {
        leftovers[0].token.progress = -1
        capturedTokenIds.push(leftovers[0].token.id)
      }
    }
  }

  return {
    playerId: player.id,
    playerName: player.name,
    tokenId: token.id,
    roll,
    from,
    to,
    capturedTokenIds,
  }
}

function recordCaptureStats(game: GameState, moverId: string, capturedTokenIds: string[]): void {
  for (const tokenId of capturedTokenIds) {
    const owner = game.players.find((entry) => entry.tokens.some((token) => token.id === tokenId))
    if (!owner) {
      continue
    }

    owner.timesCaptured = (Number.isFinite(owner.timesCaptured) ? owner.timesCaptured : 0) + 1
    if (owner.id !== moverId) {
      const mover = game.players.find((entry) => entry.id === moverId)
      if (mover) {
        mover.capturesMade = (Number.isFinite(mover.capturesMade) ? mover.capturesMade : 0) + 1
      }
    }
  }
}

export function createLocalGame(playerCount: 2 | 3 | 4, playerNames: string[]): GameState {
  const id = makeId()
  const createdAt = nowIso()
  const colors = PLAYER_COLORS_BY_COUNT[playerCount]

  const players: PlayerState[] = colors.map((color, playerIndex) => ({
    id: `${color}-player`,
    color,
    paintHex: DEFAULT_PAINT_BY_SEAT[color],
    name: normalizeName(playerNames[playerIndex] ?? '', `Player ${playerIndex + 1}`),
    userId: null,
    tokens: createTokens(color),
    capturesMade: 0,
    timesCaptured: 0,
  }))

  const startingPlayerIndex = Math.floor(Math.random() * players.length)
  const startingPlayer = players[startingPlayerIndex]

  return {
    id,
    gameId: id,
    schemaVersion: 1,
    status: 'ACTIVE',
    revision: 1,
    createdAt,
    updatedAt: createdAt,
    moveCount: 0,
    playerCount,
    players,
    currentPlayerIndex: startingPlayerIndex,
    currentPlayerId: startingPlayer.id,
    pendingRoll: null,
    lastDiceRoll: null,
    legalMoves: [],
    winnerPlayerId: null,
    finishOrder: [],
    lastMove: null,
    lastAction: {
      type: 'CREATE_GAME',
      at: createdAt,
      playerId: startingPlayer.id,
      playerName: startingPlayer.name,
      message: `${startingPlayer.name} was chosen to start.`,
    },
    message: `${startingPlayer.name} starts. Roll the dice.`,
  }
}

export function applyLocalRoll(game: GameState, clientRoll: number): GameState {
  const next = structuredClone(game)
  ensureFinishOrder(next)

  if (next.status === 'COMPLETED') {
    throw new Error('Game is complete. Start a new game.')
  }

  if (next.pendingRoll !== null) {
    throw new Error('Current player must move a token before rolling again.')
  }

  if (!Number.isInteger(clientRoll) || clientRoll < 1 || clientRoll > 6) {
    throw new Error('Roll must be an integer from 1 to 6.')
  }

  let player = next.players[next.currentPlayerIndex]
  if (playerHasFinished(next, player)) {
    advanceToNextActivePlayer(next)
    player = next.players[next.currentPlayerIndex]
    if (!player || playerHasFinished(next, player) || gameIsComplete(next)) {
      next.status = 'COMPLETED'
      throw new Error('Game is complete. Start a new game.')
    }
  }

  const legalMoves = getLegalMovesForRoll(player, clientRoll)
  const updatedAt = nowIso()

  next.pendingRoll = clientRoll
  next.lastDiceRoll = clientRoll
  next.legalMoves = legalMoves
  next.updatedAt = updatedAt
  next.revision += 1

  if (legalMoves.length === 0) {
    next.pendingRoll = null
    next.legalMoves = []
    advanceToNextActivePlayer(next)
    next.message = `${player.name} rolled ${clientRoll} but has no legal moves. Turn passes.`
  } else {
    next.message = `${player.name} rolled ${clientRoll}. Select a token to move.`
  }

  next.lastAction = {
    type: 'ROLL',
    at: updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: next.message,
  }

  return next
}

export function applyLocalMove(game: GameState, tokenId: string): GameState {

  const next = structuredClone(game)
  ensureFinishOrder(next)

  if (next.status === 'COMPLETED') {
    throw new Error('Game is complete. Start a new game.')
  }

  if (next.pendingRoll === null) {
    throw new Error('Roll the dice before moving a token.')
  }

  if (!next.legalMoves.includes(tokenId)) {
    throw new Error('Selected token is not a legal move for this roll.')
  }

  const player = next.players[next.currentPlayerIndex]
  const token = player.tokens.find((item) => item.id === tokenId)

  if (!token) {
    throw new Error('Token not found for current player.')
  }

  const roll = next.pendingRoll
  const summary = applyMoveAndCapture(next, player, token, roll)
  recordCaptureStats(next, player.id, summary.capturedTokenIds)
  const updatedAt = nowIso()

  next.lastMove = summary
  next.pendingRoll = null
  next.legalMoves = []
  next.moveCount += 1
  next.updatedAt = updatedAt
  next.revision += 1

  if (isWinner(player)) {
    const place = recordPlayerFinish(next, player)
    const isLast = place === next.players.length
    const title = placeLabel(place, isLast)

    if (gameIsComplete(next)) {
      next.message = `Game over! Final standings are in — ${player.name} placed #${place}.`
    } else {
      advanceToNextActivePlayer(next)
      if (gameIsComplete(next)) {
        next.message = `Game over! Final standings are in — ${player.name} placed #${place}.`
      } else {
        const nextPlayer = next.players[next.currentPlayerIndex]
        next.message = `${player.name} finishes #${place} — ${title}! ${nextPlayer.name}'s turn.`
      }
    }

    next.lastAction = {
      type: 'MOVE',
      at: updatedAt,
      playerId: player.id,
      playerName: player.name,
      message: next.message,
    }
    return next
  }

  const reachedFinish = summary.to >= FINISH_PROGRESS
  const earnedExtraTurn =
    roll === 6 || summary.capturedTokenIds.length > 0 || reachedFinish

  if (!earnedExtraTurn) {
    advanceToNextActivePlayer(next)
  } else {
    next.currentPlayerId = next.players[next.currentPlayerIndex]?.id ?? ''
  }

  if (earnedExtraTurn) {
    const bonusReason = reachedFinish
      ? 'getting a token home'
      : roll === 6
        ? 'a 6'
        : 'a capture'
    next.message = `${player.name} moved ${token.id} and earned an extra turn with ${bonusReason}.`
  } else {
    const nextPlayer = next.players[next.currentPlayerIndex]
    next.message = `${player.name} moved ${token.id}. ${nextPlayer.name}'s turn.`
  }

  next.lastAction = {
    type: 'MOVE',
    at: updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: next.message,
  }

  return next
}

function normalizeLoadedGame(game: GameState): GameState {
  ensureFinishOrder(game)

  for (const player of game.players) {
    player.capturesMade =
      typeof player.capturesMade === 'number' && Number.isFinite(player.capturesMade)
        ? Math.max(0, Math.floor(player.capturesMade))
        : 0
    player.timesCaptured =
      typeof player.timesCaptured === 'number' && Number.isFinite(player.timesCaptured)
        ? Math.max(0, Math.floor(player.timesCaptured))
        : 0
    player.paintHex = normalizePaintHex(player.paintHex) ?? DEFAULT_PAINT_BY_SEAT[player.color]
    for (const token of player.tokens) {
      if (token.progress > FINISH_PROGRESS) {
        token.progress = FINISH_PROGRESS
      }
    }
    if (isWinner(player) && !game.finishOrder.includes(player.id)) {
      game.finishOrder.push(player.id)
      if (!game.winnerPlayerId) {
        game.winnerPlayerId = player.id
      }
    }
  }

  if (finalizeIfRaceOver(game)) {
    return game
  }

  const unfinished = game.players.filter((player) => !playerHasFinished(game, player))
  if (unfinished.length === 0) {
    game.status = 'COMPLETED'
    game.pendingRoll = null
    game.legalMoves = []
    return game
  }

  // Repair stuck turns: never leave a finished player as the current player.
  const current = game.players[game.currentPlayerIndex]
  if (!current || playerHasFinished(game, current)) {
    game.pendingRoll = null
    game.legalMoves = []

    const blueIndex = game.players.findIndex(
      (player) => player.color === 'blue' && !playerHasFinished(game, player),
    )
    if (blueIndex >= 0) {
      game.currentPlayerIndex = blueIndex
      game.currentPlayerId = game.players[blueIndex].id
    } else {
      const fallbackIndex = game.players.findIndex((player) => !playerHasFinished(game, player))
      game.currentPlayerIndex = fallbackIndex
      game.currentPlayerId = game.players[fallbackIndex]?.id ?? ''
    }
    game.message = `${game.players[game.currentPlayerIndex]?.name ?? 'Next player'}'s turn.`
  }

  game.status = 'ACTIVE'
  return game
}

/**
 * Set a player's cosmetic paint color (any #rrggbb). Board seat / path is unchanged.
 */
export function setPlayerPaintHex(game: GameState, playerId: string, paintHex: string): GameState {
  const nextHex = normalizePaintHex(paintHex)
  if (!nextHex) {
    throw new Error('Pick a valid color.')
  }

  const next = structuredClone(game)
  const player = next.players.find((entry) => entry.id === playerId)
  if (!player) {
    throw new Error('Player not found.')
  }

  player.paintHex = nextHex
  next.updatedAt = nowIso()
  return next
}

/** Returns a repaired copy when the turn is stuck on a finished player; ignores real race endings. */
export function repairStuckTurn(game: GameState): GameState | null {
  ensureFinishOrder(game)

  // Real end-game: enough finishers that only a loser remains (or none).
  if (game.finishOrder.length >= Math.max(1, game.players.length - 1)) {
    if (game.status !== 'COMPLETED' || game.finishOrder.length < game.players.length) {
      const next = structuredClone(game)
      finalizeIfRaceOver(next)
      return next.status === 'COMPLETED' ? next : null
    }
    return null
  }

  const current = game.players[game.currentPlayerIndex]
  const stuckOnFinished = Boolean(current && playerHasFinished(game, current))
  if (!stuckOnFinished) {
    return null
  }

  return normalizeLoadedGame(structuredClone(game))
}

export function loadGameLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isGameStateShape(parsed)) {
      clearGameLocal()
      return null
    }

    return normalizeLoadedGame(parsed)
  } catch {
    return null
  }
}

function isGameStateShape(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const game = value as Record<string, unknown>
  if (typeof game.id !== 'string' || typeof game.gameId !== 'string') {
    return false
  }
  if (game.playerCount !== 2 && game.playerCount !== 3 && game.playerCount !== 4) {
    return false
  }
  if (!Array.isArray(game.players) || game.players.length !== game.playerCount) {
    return false
  }
  if (typeof game.currentPlayerIndex !== 'number' || !Number.isInteger(game.currentPlayerIndex)) {
    return false
  }
  if (game.currentPlayerIndex < 0 || game.currentPlayerIndex >= game.players.length) {
    return false
  }

  for (const player of game.players) {
    if (!player || typeof player !== 'object') {
      return false
    }
    const entry = player as Record<string, unknown>
    if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      return false
    }
    if (entry.color !== 'red' && entry.color !== 'green' && entry.color !== 'yellow' && entry.color !== 'blue') {
      return false
    }
    if (!Array.isArray(entry.tokens) || entry.tokens.length !== 4) {
      return false
    }
    for (const token of entry.tokens) {
      if (!token || typeof token !== 'object') {
        return false
      }
      const piece = token as Record<string, unknown>
      if (typeof piece.id !== 'string' || typeof piece.index !== 'number' || typeof piece.progress !== 'number') {
        return false
      }
      if (!Number.isFinite(piece.progress) || piece.progress < -1 || piece.progress > FINISH_PROGRESS + 8) {
        return false
      }
    }
  }

  return true
}

export function saveGameLocal(game: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
  } catch {
    // Ignore quota / private-mode failures; gameplay stays in memory.
  }
}

export function clearGameLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
