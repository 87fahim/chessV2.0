import { FINISH_PROGRESS as SQUARE_FINISH_PROGRESS, SAFE_OUTER_INDEXES, START_INDEX } from './boardLayout'
import type { PlayerColor } from './types'

export type BoardKind = 'square' | 'radial'

export type PlayerCount = 2 | 3 | 4 | 5 | 6
export type RadialPlayerCount = 5 | 6

/** Shared movement parameters for square (2–4) and radial (5–6) boards. */
export interface BoardRules {
  kind: BoardKind
  playerCount: PlayerCount
  outerLength: number
  /** Highest progress still on the shared outer track. */
  lastOuterProgress: number
  /** First progress value on the colored home lane. */
  homeLaneStart: number
  /** Progress when a token sits on the finish tile. */
  finishProgress: number
  startIndex: Partial<Record<PlayerColor, number>> & Record<string, number>
  safeOuterIndexes: Set<number>
}

/** Outer cells per radial seat: left col (6) + tip mid (1) + right col (6). */
export const RADIAL_CELLS_PER_SEAT = 13
const HOME_LANE_LENGTH = 5

export function isRadialPlayerCount(playerCount: number): playerCount is RadialPlayerCount {
  return playerCount === 5 || playerCount === 6
}

/** @deprecated use isRadialPlayerCount */
export const isHexPlayerCount = isRadialPlayerCount

export function getBoardRules(playerCount: PlayerCount, seatColors: PlayerColor[]): BoardRules {
  if (!isRadialPlayerCount(playerCount)) {
    return {
      kind: 'square',
      playerCount,
      outerLength: 52,
      lastOuterProgress: 50,
      homeLaneStart: 51,
      finishProgress: SQUARE_FINISH_PROGRESS,
      startIndex: { ...START_INDEX },
      safeOuterIndexes: new Set(SAFE_OUTER_INDEXES),
    }
  }

  const outerLength = playerCount * RADIAL_CELLS_PER_SEAT
  const lastOuterProgress = outerLength - 2
  const homeLaneStart = lastOuterProgress + 1
  const finishProgress = homeLaneStart + HOME_LANE_LENGTH

  const startIndex: Record<string, number> = {}
  const safeOuterIndexes = new Set<number>()

  seatColors.forEach((color, seatIndex) => {
    // Segment walk: r0c0…r5c0, tip r5c1, r5c2…r0c2.
    // Start at r4c2 (index +8) so a full lap’s last outer cell is the tip (start-2),
    // which sits next to the first home-lane tile (r4c1).
    const segmentStart = seatIndex * RADIAL_CELLS_PER_SEAT
    const start = segmentStart + 8
    const star = segmentStart + 3 // r3c0 — two tiles before former r5c0 star
    startIndex[color] = start
    safeOuterIndexes.add(start)
    safeOuterIndexes.add(star)
  })

  return {
    kind: 'radial',
    playerCount,
    outerLength,
    lastOuterProgress,
    homeLaneStart,
    finishProgress,
    startIndex,
    safeOuterIndexes,
  }
}

export function getTrackIndexForRules(rules: BoardRules, color: PlayerColor, progress: number): number {
  const start = rules.startIndex[color]
  if (typeof start !== 'number') {
    return 0
  }
  return (start + progress) % rules.outerLength
}
