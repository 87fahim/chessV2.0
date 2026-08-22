import { FINISH_PROGRESS, SAFE_OUTER_INDEXES, START_INDEX } from './boardLayout'
import { getBoardRules, getTrackIndexForRules } from './boardRules'
import type { PlayerColor, PlayerCount, PlayerState, TokenState } from './types'

function forwardStepsOnTrack(fromIndex: number, targetIndex: number, outerLength: number): number {
  return (targetIndex - fromIndex + outerLength) % outerLength
}

function behindThreatAway(
  player: PlayerState,
  token: TokenState,
  allPlayers: PlayerState[],
  playerCount: PlayerCount,
): number {
  const rules = getBoardRules(
    playerCount,
    allPlayers.map((entry) => entry.color),
  )

  if (token.progress < 0 || token.progress > rules.lastOuterProgress) {
    return 0
  }

  const trackIndex = getTrackIndexForRules(rules, player.color, token.progress)
  if (rules.safeOuterIndexes.has(trackIndex)) {
    return 0
  }

  const ownStack = player.tokens.filter(
    (entry) =>
      entry.progress >= 0 &&
      entry.progress <= rules.lastOuterProgress &&
      getTrackIndexForRules(rules, player.color, entry.progress) === trackIndex,
  ).length
  if (ownStack >= 2) {
    return 0
  }

  let threat = 0
  for (const other of allPlayers) {
    if (other.id === player.id) {
      continue
    }
    for (const enemy of other.tokens) {
      if (enemy.progress < 0 || enemy.progress > rules.lastOuterProgress) {
        continue
      }
      const enemyIndex = getTrackIndexForRules(rules, other.color, enemy.progress)
      const steps = forwardStepsOnTrack(enemyIndex, trackIndex, rules.outerLength)
      if (steps >= 1 && steps <= 6) {
        threat += (7 - steps) / 6
      }
    }
  }

  return Math.min(12, threat * 4)
}

/**
 * Average closeness to finish (0–100%), with risk adjustments.
 */
export function averageProgressScore(
  player: PlayerState,
  allPlayers: PlayerState[],
  playerCount: PlayerCount = 4,
): number {
  const tokens = player.tokens
  if (tokens.length === 0) {
    return 0
  }

  const rules = getBoardRules(
    playerCount,
    allPlayers.map((entry) => entry.color),
  )
  const finishProgress = rules.finishProgress
  const MAX_AWAY = Math.max(60, finishProgress + 4)
  const EXPOSURE_PER_HOME_TOKEN = 3
  const homeCount = tokens.filter((token) => token.progress < 0).length

  const totalCloseness = tokens.reduce((sum, token) => {
    let effectiveAway = 0

    if (token.progress >= finishProgress) {
      effectiveAway = 0
    } else if (token.progress < 0) {
      effectiveAway = MAX_AWAY
    } else {
      const tilesLeft = finishProgress - token.progress
      effectiveAway = tilesLeft + 1

      if (tilesLeft >= 1 && tilesLeft <= 5) {
        effectiveAway += 6 - tilesLeft
      }

      if (homeCount > 0) {
        effectiveAway += homeCount * EXPOSURE_PER_HOME_TOKEN
      }

      effectiveAway += behindThreatAway(player, token, allPlayers, playerCount)
    }

    return sum + Math.max(0, MAX_AWAY - effectiveAway)
  }, 0)

  return Math.round((totalCloseness / tokens.length / MAX_AWAY) * 100)
}

/** @deprecated square-only helpers kept for classic board math call sites. */
export function classicOuterIndex(color: PlayerColor, progress: number): number | null {
  if (color !== 'red' && color !== 'green' && color !== 'yellow' && color !== 'blue') {
    return null
  }
  return (START_INDEX[color] + progress) % 52
}

export { FINISH_PROGRESS, SAFE_OUTER_INDEXES }
