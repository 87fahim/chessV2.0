import { randomInt } from 'node:crypto'
import { v4 as uuidv4 } from 'uuid'
import type {
  CreateGameInput,
  GameState,
  LastActionSummary,
  MoveSummary,
  PlayerColor,
  PlayerState,
  TokenState,
} from './types.js'

const PLAYER_COLORS_BY_COUNT: Record<2 | 3 | 4, PlayerColor[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'red', 'green'],
  4: ['blue', 'red', 'green', 'yellow'],
}
const START_INDEX_BY_COLOR: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}
const SAFE_TRACK_CELLS = new Set([0, 8, 13, 21, 26, 34, 39, 47])
const FINISH_PROGRESS = 56

function nowIso(): string {
  return new Date().toISOString()
}

function setCurrentPlayer(game: GameState): void {
  game.currentPlayerId = game.players[game.currentPlayerIndex]?.id ?? ''
}

function setLastAction(game: GameState, action: LastActionSummary): void {
  game.lastAction = action
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
  const start = START_INDEX_BY_COLOR[color]
  return (start + progress) % 52
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

function canMoveToken(token: TokenState, roll: number): boolean {
  if (token.progress === -1) {
    return roll === 6
  }

  if (token.progress >= FINISH_PROGRESS) {
    return false
  }

  return token.progress + roll <= FINISH_PROGRESS
}

function getLegalMovesForRoll(player: PlayerState, roll: number): string[] {
  return player.tokens.filter((token) => canMoveToken(token, roll)).map((token) => token.id)
}

function isWinner(player: PlayerState): boolean {
  return player.tokens.every((token) => token.progress >= FINISH_PROGRESS)
}

function getNextPlayerIndex(game: GameState): number {
  return (game.currentPlayerIndex + 1) % game.players.length
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
    if (!SAFE_TRACK_CELLS.has(destinationTrack)) {
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
  if (fromTrack !== null && !SAFE_TRACK_CELLS.has(fromTrack)) {
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

export function createGame(input: CreateGameInput): GameState {
  const id = uuidv4()
  const createdAt = nowIso()
  const colors = PLAYER_COLORS_BY_COUNT[input.playerCount]

  const players: PlayerState[] = colors.map(
    (color, playerIndex) => ({
      id: `${color}-player`,
      color,
      name: normalizeName(input.playerNames[playerIndex] ?? '', `Player ${playerIndex + 1}`),
      userId: null,
      tokens: createTokens(color),
      capturesMade: 0,
      timesCaptured: 0,
    }),
  )

  const startingPlayerIndex = randomInt(0, players.length)
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
    playerCount: input.playerCount,
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

export function rollDice(game: GameState, clientRoll: number): GameState {
  if (game.winnerPlayerId || game.status === 'COMPLETED') {
    throw new Error('Game is complete. Start a new game.')
  }

  if (game.pendingRoll !== null) {
    throw new Error('Current player must move a token before rolling again.')
  }

  if (!Number.isInteger(clientRoll) || clientRoll < 1 || clientRoll > 6) {
    throw new Error('Roll must be an integer from 1 to 6.')
  }

  const player = game.players[game.currentPlayerIndex]
  const roll = clientRoll
  const legalMoves = getLegalMovesForRoll(player, roll)

  game.pendingRoll = roll
  game.lastDiceRoll = roll
  game.legalMoves = legalMoves
  game.updatedAt = nowIso()
  game.revision += 1

  if (legalMoves.length === 0) {
    game.pendingRoll = null
    game.legalMoves = []
    game.currentPlayerIndex = getNextPlayerIndex(game)
    setCurrentPlayer(game)
    game.message = `${player.name} rolled ${roll} but has no legal moves. Turn passes.`
  } else {
    game.message = `${player.name} rolled ${roll}. Select a token to move.`
  }

  setLastAction(game, {
    type: 'ROLL',
    at: game.updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: game.message,
  })

  return game
}

export function moveToken(game: GameState, tokenId: string): GameState {
  if (game.winnerPlayerId || game.status === 'COMPLETED') {
    throw new Error('Game is complete. Start a new game.')
  }

  if (game.pendingRoll === null) {
    throw new Error('Roll the dice before moving a token.')
  }

  if (!game.legalMoves.includes(tokenId)) {
    throw new Error('Selected token is not a legal move for this roll.')
  }

  const player = game.players[game.currentPlayerIndex]
  const token = player.tokens.find((item) => item.id === tokenId)

  if (!token) {
    throw new Error('Token not found for current player.')
  }

  const roll = game.pendingRoll
  const summary = applyMoveAndCapture(game, player, token, roll)

  game.lastMove = summary
  game.pendingRoll = null
  game.legalMoves = []
  game.moveCount += 1
  game.updatedAt = nowIso()
  game.revision += 1

  if (isWinner(player)) {
    game.winnerPlayerId = player.id
    game.status = 'COMPLETED'
    game.message = `${player.name} wins the game.`
    setLastAction(game, {
      type: 'MOVE',
      at: game.updatedAt,
      playerId: player.id,
      playerName: player.name,
      message: game.message,
    })
    return game
  }

  const reachedFinish = summary.to >= FINISH_PROGRESS
  const earnedExtraTurn =
    roll === 6 || summary.capturedTokenIds.length > 0 || reachedFinish

  if (!earnedExtraTurn) {
    game.currentPlayerIndex = getNextPlayerIndex(game)
    setCurrentPlayer(game)
  }

  if (earnedExtraTurn) {
    const bonusReason = reachedFinish
      ? 'getting a token home'
      : roll === 6
        ? 'a 6'
        : 'a capture'
    game.message = `${player.name} moved ${token.id} and earned an extra turn with ${bonusReason}.`
  } else {
    const nextPlayer = game.players[game.currentPlayerIndex]
    game.message = `${player.name} moved ${token.id}. ${nextPlayer.name}'s turn.`
  }

  setLastAction(game, {
    type: 'MOVE',
    at: game.updatedAt,
    playerId: player.id,
    playerName: player.name,
    message: game.message,
  })

  return game
}
