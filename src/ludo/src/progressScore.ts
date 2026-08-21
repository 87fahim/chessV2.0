import { FINISH_PROGRESS, SAFE_OUTER_INDEXES, START_INDEX } from './boardLayout'
import type { PlayerColor, PlayerState, TokenState } from './types'

function getOuterTrackIndex(color: PlayerColor, progress: number): number {
  return (START_INDEX[color] + progress) % 52
}

/** Steps an opponent must roll forward to land on `targetIndex` from `fromIndex` (0 = same cell). */
function forwardStepsOnTrack(fromIndex: number, targetIndex: number): number {
  return (targetIndex - fromIndex + 52) % 52
}

/**
 * Capture pressure from opponent pieces within one die roll behind on the outer track.
 * Safe tiles and 2+ own-token stacks are treated as protected (no penalty).
 */
function behindThreatAway(player: PlayerState, token: TokenState, allPlayers: PlayerState[]): number {
  if (token.progress < 0 || token.progress > 50) {
    return 0
  }

  const trackIndex = getOuterTrackIndex(player.color, token.progress)
  if (SAFE_OUTER_INDEXES.has(trackIndex)) {
    return 0
  }

  const ownStack = player.tokens.filter(
    (entry) =>
      entry.progress >= 0 &&
      entry.progress <= 50 &&
      getOuterTrackIndex(player.color, entry.progress) === trackIndex,
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
      if (enemy.progress < 0 || enemy.progress > 50) {
        continue
      }
      const enemyIndex = getOuterTrackIndex(other.color, enemy.progress)
      const steps = forwardStepsOnTrack(enemyIndex, trackIndex)
      if (steps >= 1 && steps <= 6) {
        threat += (7 - steps) / 6
      }
    }
  }

  return Math.min(12, threat * 4)
}

/**
 * Average closeness to finish (0–100%), with risk adjustments:
 * home exit, exact-finish zone, home-yard exposure, and behind-threat.
 */
export function averageProgressScore(player: PlayerState, allPlayers: PlayerState[]): number {
  const tokens = player.tokens
  if (tokens.length === 0) {
    return 0
  }

  const MAX_AWAY = 60
  const EXPOSURE_PER_HOME_TOKEN = 3
  const homeCount = tokens.filter((token) => token.progress < 0).length

  const totalCloseness = tokens.reduce((sum, token) => {
    let effectiveAway = 0

    if (token.progress >= FINISH_PROGRESS) {
      effectiveAway = 0
    } else if (token.progress < 0) {
      effectiveAway = MAX_AWAY
    } else {
      const tilesLeft = FINISH_PROGRESS - token.progress
      effectiveAway = tilesLeft + 1

      if (tilesLeft >= 1 && tilesLeft <= 5) {
        effectiveAway += 6 - tilesLeft
      }

      if (homeCount > 0) {
        effectiveAway += homeCount * EXPOSURE_PER_HOME_TOKEN
      }

      effectiveAway += behindThreatAway(player, token, allPlayers)
    }

    return sum + Math.max(0, MAX_AWAY - effectiveAway)
  }, 0)

  return Math.round((totalCloseness / tokens.length / MAX_AWAY) * 100)
}
