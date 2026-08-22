import type { PlayerColor } from './types'

export const COLOR_STACK_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue', 'orange', 'purple']

/** Horizontal anchors (% of tile width) so stacked tokens fan like a card deck. */
export function stackAnchorPercents(count: number): number[] {
  if (count <= 1) {
    return [50]
  }
  if (count === 2) {
    return [38, 62]
  }

  const min = 35
  const max = 75
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1))
}

/** Scale vs one full tile width; keeps the fan inside the tile horizontally. */
export function stackTokenScale(count: number): number {
  if (count <= 1) {
    return 1
  }

  const anchors = stackAnchorPercents(count)
  const minAnchor = Math.min(...anchors)
  const maxAnchor = Math.max(...anchors)
  const maxScale = Math.min(minAnchor, 100 - maxAnchor) / 50
  return Math.min(1, Math.max(0.36, maxScale * 0.96))
}
