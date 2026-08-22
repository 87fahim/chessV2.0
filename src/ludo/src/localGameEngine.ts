import { getBoardRules, getTrackIndexForRules, type BoardRules, type PlayerCount } from './boardRules'
import { DEFAULT_PAINT_BY_SEAT, normalizePaintHex } from './playerPaint'
import type { GameState, MoveSummary, PlayerColor, PlayerState, TokenState } from './types'

const STORAGE_KEY = 'ludo.activeGame'

const PLAYER_COLORS_BY_COUNT: Record<PlayerCount, PlayerColor[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'red', 'green'],
  4: ['blue', 'red', 'green', 'yellow'],
  5: ['blue', 'orange', 'green', 'red', 'yellow'],
  6: ['blue', 'orange', 'green', 'red', 'yellow', 'purple'],
}

function rulesForGame(game: Pick<GameState, 'playerCount' | 'players'>): BoardRules {
  return getBoardRules(game.playerCount, game.players.map((player) => player.color))
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

/** Uniform index in `[0, length)` for picking who starts (all player counts). */
function randomPlayerIndex(length: number): number {
  if (length <= 1) {
    return 0
  }
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.getRandomValues) {
    const buffer = new Uint32Array(1)
    cryptoObj.getRandomValues(buffer)
    return buffer[0]! % length
  }
  return Math.floor(Math.random() * length)
}

function createTokens(color: PlayerColor): TokenState[] {
  return Array.from({ length: 4 }, (_, index) => ({
    id: `${color}-${index + 1}`,
    index,
    progress: -1,
  }))
}

function canMoveToken(token: TokenState, roll: number, finishProgress: number): boolean {
  if (token.progress === -1) {
    return roll === 6
  }

  if (token.progress >= finishProgress) {
    return false
  }

  return token.progress + roll <= finishProgress
}

function getLegalMovesForRoll(player: PlayerState, roll: number, finishProgress: number): string[] {
  return player.tokens.filter((token) => canMoveToken(token, roll, finishProgress)).map((token) => token.id)
}

function isWinner(player: PlayerState, finishProgress: number): boolean {
  return player.tokens.every((token) => token.progress >= finishProgress)
}

function ensureFinishOrder(game: GameState): string[] {
  if (!Array.isArray(game.finishOrder)) {
    game.finishOrder = []
  }
  return game.finishOrder
}

function playerHasFinished(game: GameState, player: PlayerState): boolean {
  const rules = rulesForGame(game)
  return ensureFinishOrder(game).includes(player.id) || isWinner(player, rules.finishProgress)
}

function playerIsWithdrawn(player: PlayerState): boolean {
  return Boolean(player.withdrawn)
}

/** Still in the turn rotation (not finished, not removed). */
function playerIsActive(game: GameState, player: PlayerState): boolean {
  return !playerIsWithdrawn(player) && !playerHasFinished(game, player)
}

function gameIsComplete(game: GameState): boolean {
  return game.status === 'COMPLETED'
}

function nextActivePlayerIndex(game: GameState, fromIndex: number): number {
  const count = game.players.length
  let index = fromIndex
  for (let step = 0; step < count; step += 1) {
    index = (index + 1) % count
    if (playerIsActive(game, game.players[index])) {
      return index
    }
  }
  return fromIndex
}

function finalizeIfRaceOver(game: GameState): boolean {
  const order = ensureFinishOrder(game)
  if (order.length === 0) {
    // Still allow ending when only withdrawn players remain beside one active.
    const active = game.players.filter((player) => playerIsActive(game, player))
    if (active.length <= 1 && game.players.some((player) => playerIsWithdrawn(player))) {
      if (active[0]) {
        if (!order.includes(active[0].id)) {
          order.push(active[0].id)
        }
        if (!game.winnerPlayerId) {
          game.winnerPlayerId = active[0].id
        }
      }
      game.status = 'COMPLETED'
      game.pendingRoll = null
      game.legalMoves = []
      return true
    }
    return false
  }

  const remaining = game.players.filter(
    (player) => !playerIsWithdrawn(player) && !order.includes(player.id),
  )
  // End when only the last player is left unfinished (e.g. 3 of 4 have finished).
  if (remaining.length <= 1 && order.length >= game.players.filter((p) => !playerIsWithdrawn(p)).length - 1) {
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

  const unfinished = game.players.filter((player) => playerIsActive(game, player))
  if (unfinished.length === 0) {
    game.status = 'COMPLETED'
    return
  }

  const nextIndex = nextActivePlayerIndex(game, game.currentPlayerIndex)
  const nextPlayer = game.players[nextIndex]
  if (!nextPlayer || !playerIsActive(game, nextPlayer)) {
    const fallbackIndex = game.players.findIndex((player) => playerIsActive(game, player))
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

function getTokensOnTrack(game: GameState, rules: BoardRules, trackIndex: number): TrackOccupant[] {
  const occupants: TrackOccupant[] = []
  for (const otherPlayer of game.players) {
    for (const otherToken of otherPlayer.tokens) {
      if (otherToken.progress < 0 || otherToken.progress > rules.lastOuterProgress) {
        continue
      }
      if (getTrackIndexForRules(rules, otherPlayer.color, otherToken.progress) === trackIndex) {
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
  rules: BoardRules,
): MoveSummary {
  const from = token.progress
  const to = from === -1 ? 0 : from + roll
  const fromTrack =
    from >= 0 && from <= rules.lastOuterProgress
      ? getTrackIndexForRules(rules, player.color, from)
      : null

  token.progress = to

  const capturedTokenIds: string[] = []

  if (to >= 0 && to <= rules.lastOuterProgress) {
    const destinationTrack = getTrackIndexForRules(rules, player.color, to)
    if (!rules.safeOuterIndexes.has(destinationTrack)) {
      const groups = groupOccupantsByPlayer(getTokensOnTrack(game, rules, destinationTrack))
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

  if (fromTrack !== null && !rules.safeOuterIndexes.has(fromTrack)) {
    const destinationTrack =
      to >= 0 && to <= rules.lastOuterProgress
        ? getTrackIndexForRules(rules, player.color, to)
        : null
    if (destinationTrack !== fromTrack) {
      const groups = groupOccupantsByPlayer(getTokensOnTrack(game, rules, fromTrack))
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

export function createLocalGame(playerCount: PlayerCount, playerNames: string[]): GameState {
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
    withdrawn: false,
  }))

  const startingPlayerIndex = randomPlayerIndex(players.length)
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
  if (!player || !playerIsActive(next, player)) {
    advanceToNextActivePlayer(next)
    player = next.players[next.currentPlayerIndex]
    if (!player || !playerIsActive(next, player) || gameIsComplete(next)) {
      next.status = 'COMPLETED'
      throw new Error('Game is complete. Start a new game.')
    }
  }

  const legalMoves = getLegalMovesForRoll(player, clientRoll, rulesForGame(next).finishProgress)
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
  const rules = rulesForGame(next)
  const summary = applyMoveAndCapture(next, player, token, roll, rules)
  recordCaptureStats(next, player.id, summary.capturedTokenIds)
  const updatedAt = nowIso()

  next.lastMove = summary
  next.pendingRoll = null
  next.legalMoves = []
  next.moveCount += 1
  next.updatedAt = updatedAt
  next.revision += 1

  if (isWinner(player, rules.finishProgress)) {
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

  const reachedFinish = summary.to >= rules.finishProgress
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
  const rules = rulesForGame(game)

  for (const player of game.players) {
    player.withdrawn = Boolean(player.withdrawn)
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
      if (token.progress > rules.finishProgress) {
        token.progress = rules.finishProgress
      }
    }
    if (
      !playerIsWithdrawn(player) &&
      isWinner(player, rules.finishProgress) &&
      !game.finishOrder.includes(player.id)
    ) {
      game.finishOrder.push(player.id)
      if (!game.winnerPlayerId) {
        game.winnerPlayerId = player.id
      }
    }
  }

  if (finalizeIfRaceOver(game)) {
    return game
  }

  const unfinished = game.players.filter((player) => playerIsActive(game, player))
  if (unfinished.length === 0) {
    game.status = 'COMPLETED'
    game.pendingRoll = null
    game.legalMoves = []
    return game
  }

  // Repair stuck turns: never leave a finished/withdrawn player as the current player.
  const current = game.players[game.currentPlayerIndex]
  if (!current || !playerIsActive(game, current)) {
    game.pendingRoll = null
    game.legalMoves = []

    if (current) {
      // Mid-game: advance past the inactive seat (do not prefer blue).
      advanceToNextActivePlayer(game)
    } else {
      // Invalid index: pick a random active seat so loads do not always favor seat 0.
      const activeIndices = game.players
        .map((player, index) => (playerIsActive(game, player) ? index : -1))
        .filter((index) => index >= 0)
      const pick = activeIndices[randomPlayerIndex(activeIndices.length)] ?? 0
      game.currentPlayerIndex = pick
      game.currentPlayerId = game.players[pick]?.id ?? ''
    }
    game.message = `${game.players[game.currentPlayerIndex]?.name ?? 'Next player'}'s turn.`
  }

  game.status = 'ACTIVE'
  return game
}

/**
 * Set a player's display name (same string shown in Match Control and on the board).
 * Empty values are kept while typing; the board falls back to "Player N" when blank.
 */
export function setPlayerName(game: GameState, playerId: string, name: string): GameState {
  const next = structuredClone(game)
  const player = next.players.find((entry) => entry.id === playerId)
  if (!player) {
    throw new Error('Player not found.')
  }

  player.name = name.slice(0, 24)
  next.updatedAt = nowIso()
  return next
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

/**
 * Remove a player mid-match: tokens leave the board, they skip all turns.
 * If it was their turn, advance to the next active player.
 */
export function withdrawPlayer(game: GameState, playerId: string): GameState {
  const next = structuredClone(game)
  ensureFinishOrder(next)

  if (next.status === 'COMPLETED') {
    throw new Error('Game is complete. Start a new game.')
  }

  const player = next.players.find((entry) => entry.id === playerId)
  if (!player) {
    throw new Error('Player not found.')
  }
  if (playerIsWithdrawn(player)) {
    return next
  }
  if (playerHasFinished(next, player)) {
    throw new Error('Finished players cannot be removed.')
  }

  const wasCurrent = next.currentPlayerId === playerId
  player.withdrawn = true
  for (const token of player.tokens) {
    token.progress = -1
  }

  if (wasCurrent) {
    next.pendingRoll = null
    next.legalMoves = []
    next.lastDiceRoll = null
  }

  const stillActive = next.players.filter((entry) => playerIsActive(next, entry))
  if (stillActive.length <= 1) {
    if (stillActive[0]) {
      if (!next.finishOrder.includes(stillActive[0].id)) {
        next.finishOrder.push(stillActive[0].id)
      }
      if (!next.winnerPlayerId) {
        next.winnerPlayerId = stillActive[0].id
      }
      next.message = `${stillActive[0].name} wins — ${player.name} left the game.`
    } else {
      next.message = 'Game over — no players remain.'
    }
    next.status = 'COMPLETED'
    next.pendingRoll = null
    next.legalMoves = []
  } else if (wasCurrent) {
    advanceToNextActivePlayer(next)
    const nextPlayer = next.players[next.currentPlayerIndex]
    next.message = `${player.name} left. ${nextPlayer?.name ?? 'Next player'}'s turn.`
  } else {
    next.message = `${player.name} left the game.`
  }

  next.revision += 1
  next.updatedAt = nowIso()
  next.lastAction = {
    type: 'WITHDRAW',
    at: next.updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: next.message,
  }
  return next
}

/**
 * Test helper: send all of one player's tokens home and record their place.
 * Ends the match when only one unfinished seat remains.
 */
export function forceFinishPlayer(game: GameState, playerId: string): GameState {
  const next = structuredClone(game)
  ensureFinishOrder(next)

  if (next.status === 'COMPLETED') {
    throw new Error('Game is already complete.')
  }

  const player = next.players.find((entry) => entry.id === playerId)
  if (!player) {
    throw new Error('Player not found.')
  }
  if (playerIsWithdrawn(player)) {
    throw new Error('Withdrawn players cannot finish.')
  }
  if (playerHasFinished(next, player)) {
    throw new Error('Player has already finished.')
  }

  const rules = rulesForGame(next)
  for (const token of player.tokens) {
    token.progress = rules.finishProgress
  }

  next.pendingRoll = null
  next.legalMoves = []
  next.lastDiceRoll = null

  const place = recordPlayerFinish(next, player)
  const activeCount = next.players.filter((entry) => !playerIsWithdrawn(entry)).length
  const isLast = place === activeCount
  const title = placeLabel(place, isLast)
  const updatedAt = nowIso()

  if (gameIsComplete(next)) {
    next.message = `Game over! Final standings are in — ${player.name} placed #${place}.`
  } else {
    const currentSeat = next.players[next.currentPlayerIndex]
    if (
      currentSeat?.id === playerId ||
      !currentSeat ||
      !playerIsActive(next, currentSeat)
    ) {
      advanceToNextActivePlayer(next)
    }
    if (gameIsComplete(next)) {
      next.message = `Game over! Final standings are in — ${player.name} placed #${place}.`
    } else {
      const nextPlayer = next.players[next.currentPlayerIndex]
      next.message = `${player.name} finishes #${place} — ${title}! ${nextPlayer?.name ?? 'Next player'}'s turn.`
    }
  }

  next.revision += 1
  next.updatedAt = updatedAt
  next.lastAction = {
    type: 'MOVE',
    at: updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: next.message,
  }
  return next
}

/**
 * Test helper: finish every remaining seat (preserving existing places) and complete the match.
 */
export function forceEndGame(game: GameState): GameState {
  const next = structuredClone(game)
  ensureFinishOrder(next)

  if (next.status === 'COMPLETED') {
    throw new Error('Game is already complete.')
  }

  const rules = rulesForGame(next)
  next.pendingRoll = null
  next.legalMoves = []
  next.lastDiceRoll = null

  for (const player of next.players) {
    if (playerIsWithdrawn(player)) {
      continue
    }
    for (const token of player.tokens) {
      token.progress = rules.finishProgress
    }
    if (!next.finishOrder.includes(player.id)) {
      next.finishOrder.push(player.id)
    }
  }

  next.status = 'COMPLETED'
  if (!next.winnerPlayerId && next.finishOrder[0]) {
    next.winnerPlayerId = next.finishOrder[0]
  }

  const updatedAt = nowIso()
  const winnerName = next.players.find((entry) => entry.id === next.winnerPlayerId)?.name
  next.message = 'Game over! Final standings are in (forced).'
  next.revision += 1
  next.updatedAt = updatedAt
  next.lastAction = {
    type: 'MOVE',
    at: updatedAt,
    playerId: next.winnerPlayerId ?? undefined,
    playerName: winnerName,
    message: next.message,
  }
  return next
}

/** Returns a repaired copy when the turn is stuck on a finished player; ignores real race endings. */
export function repairStuckTurn(game: GameState): GameState | null {
  ensureFinishOrder(game)

  const activeCount = game.players.filter((player) => !playerIsWithdrawn(player)).length
  // Real end-game: enough finishers that only a loser remains (or none).
  if (game.finishOrder.length >= Math.max(1, activeCount - 1)) {
    if (game.status !== 'COMPLETED' || game.finishOrder.length < activeCount) {
      const next = structuredClone(game)
      finalizeIfRaceOver(next)
      return next.status === 'COMPLETED' ? next : null
    }
    return null
  }

  const current = game.players[game.currentPlayerIndex]
  const stuck = Boolean(current && !playerIsActive(game, current))
  if (!stuck) {
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
  if (
    game.playerCount !== 2 &&
    game.playerCount !== 3 &&
    game.playerCount !== 4 &&
    game.playerCount !== 5 &&
    game.playerCount !== 6
  ) {
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

  const allowedColors = new Set(['red', 'green', 'yellow', 'blue', 'orange', 'purple'])
  const finishCap = getBoardRules(
    game.playerCount as PlayerCount,
    (game.players as PlayerState[]).map((player) => player.color),
  ).finishProgress

  for (const player of game.players) {
    if (!player || typeof player !== 'object') {
      return false
    }
    const entry = player as Record<string, unknown>
    if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      return false
    }
    if (typeof entry.color !== 'string' || !allowedColors.has(entry.color)) {
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
      if (!Number.isFinite(piece.progress) || piece.progress < -1 || piece.progress > finishCap + 8) {
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
