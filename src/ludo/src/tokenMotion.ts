import {
  BOARD_SIZE,
  FINISH_COORDS,
  FINISH_PROGRESS,
  HOME_SLOT_POSITIONS,
  HOME_YARDS,
  getTokenCoord,
  type ClassicPlayerColor,
  type Coordinate,
} from './boardLayout'
import type { PlayerColor } from './types'

const HOP_DURATION_MS = 220
const HOP_LIFT_PERCENT = 2.4
const YARD_INNER_INSET = 0.17
const HOP_PAUSE_MS = 0

export type BoardPercent = { left: number; top: number }

function isClassicPlayerColor(color: PlayerColor): color is ClassicPlayerColor {
  return color === 'red' || color === 'green' || color === 'yellow' || color === 'blue'
}

export function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

export function getProgressCoord(
  color: PlayerColor,
  progress: number,
  tokenIndex = 0,
): Coordinate | null {
  if (!isClassicPlayerColor(color)) {
    return null
  }
  if (progress >= FINISH_PROGRESS) {
    return FINISH_COORDS[color]
  }

  return getTokenCoord(color, { id: 'preview', index: tokenIndex, progress })
}

export function coordToPercent(coord: Coordinate): BoardPercent {
  const [row, column] = coord
  return {
    left: ((column + 0.5) / BOARD_SIZE) * 100,
    top: ((row + 0.5) / BOARD_SIZE) * 100,
  }
}

/** Maps a home-yard slot to board percentage, matching `.home-yard-tokens__inner` layout. */
export function yardSlotToPercent(color: PlayerColor, tokenIndex: number): BoardPercent {
  if (!isClassicPlayerColor(color)) {
    return { left: 50, top: 50 }
  }
  const yard = HOME_YARDS[color]
  const slot = HOME_SLOT_POSITIONS[tokenIndex % HOME_SLOT_POSITIONS.length]
  const yardLeft = (yard.columnStart / BOARD_SIZE) * 100
  const yardTop = (yard.rowStart / BOARD_SIZE) * 100
  const yardWidth = (yard.columnSpan / BOARD_SIZE) * 100
  const yardHeight = (yard.rowSpan / BOARD_SIZE) * 100
  const innerLeft = yardLeft + yardWidth * YARD_INNER_INSET
  const innerTop = yardTop + yardHeight * YARD_INNER_INSET
  const innerWidth = yardWidth * (1 - YARD_INNER_INSET * 2)
  const innerHeight = yardHeight * (1 - YARD_INNER_INSET * 2)

  return {
    left: innerLeft + (slot.x / 100) * innerWidth,
    top: innerTop + (slot.y / 100) * innerHeight,
  }
}

/** Inclusive hop path from the pre-move tile through each step to the destination. */
export function buildMovePercentPath(
  color: PlayerColor,
  fromProgress: number,
  toProgress: number,
  tokenIndex = 0,
): BoardPercent[] {
  const path: BoardPercent[] = []

  if (fromProgress === -1) {
    path.push(yardSlotToPercent(color, tokenIndex))
    const destination = getProgressCoord(color, toProgress, tokenIndex)
    if (destination) {
      path.push(coordToPercent(destination))
    }
    return path
  }

  const start = getProgressCoord(color, fromProgress, tokenIndex)
  if (start) {
    path.push(coordToPercent(start))
  }

  const end = Math.max(fromProgress, toProgress)
  for (let progress = fromProgress + 1; progress <= end; progress += 1) {
    const coord = getProgressCoord(color, progress, tokenIndex)
    if (coord) {
      path.push(coordToPercent(coord))
    }
  }

  return path
}

/** Reverse path from the capture tile back through every prior tile into the home yard. */
export function buildCaptureReturnPercentPath(
  color: PlayerColor,
  fromProgress: number,
  tokenIndex = 0,
): BoardPercent[] {
  if (fromProgress < 0) {
    return [yardSlotToPercent(color, tokenIndex)]
  }

  const path: BoardPercent[] = []
  for (let progress = fromProgress; progress >= 0; progress -= 1) {
    const coord = getProgressCoord(color, progress, tokenIndex)
    if (coord) {
      path.push(coordToPercent(coord))
    }
  }
  path.push(yardSlotToPercent(color, tokenIndex))
  return path
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function placeToken(element: HTMLElement, point: BoardPercent, anchorYPercent = 90): void {
  element.style.left = `${point.left}%`
  element.style.top = `${point.top}%`
  element.style.transform = `translate(-50%, -${anchorYPercent}%) scale(1)`
}

async function animateHop(
  element: HTMLElement,
  from: BoardPercent,
  to: BoardPercent,
  durationMs: number,
  anchorYPercent = 90,
): Promise<void> {
  const frames = 18
  const keyframes: Keyframe[] = []

  for (let index = 0; index <= frames; index += 1) {
    const t = index / frames
    const eased = easeInOutCubic(t)
    const arc = Math.sin(Math.PI * t)
    const scale = 1 + arc * 0.08

    keyframes.push({
      left: `${from.left + (to.left - from.left) * eased}%`,
      top: `${from.top + (to.top - from.top) * eased - arc * HOP_LIFT_PERCENT}%`,
      transform: `translate(-50%, -${anchorYPercent}%) scale(${scale})`,
      offset: t,
    })
  }

  const animation = element.animate(keyframes, {
    duration: durationMs,
    easing: 'linear',
    fill: 'forwards',
  })

  try {
    await animation.finished
  } catch {
    animation.cancel()
  }

  placeToken(element, to, anchorYPercent)
}

export async function animateTokenHops(
  element: HTMLElement,
  path: BoardPercent[],
  options?: {
    hopDurationMs?: number
    signal?: AbortSignal
    onHopStart?: (hopIndex: number) => void
    /** Vertical translate percent; square pins use 90, hex centered tokens use 50. */
    anchorYPercent?: number
  },
): Promise<void> {
  if (path.length === 0) {
    return
  }

  const anchorYPercent = options?.anchorYPercent ?? 90
  placeToken(element, path[0], anchorYPercent)

  if (path.length < 2 || prefersReducedMotion()) {
    placeToken(element, path[path.length - 1], anchorYPercent)
    return
  }

  const hopDurationMs = options?.hopDurationMs ?? HOP_DURATION_MS

  for (let index = 0; index < path.length - 1; index += 1) {
    if (options?.signal?.aborted) {
      placeToken(element, path[path.length - 1], anchorYPercent)
      return
    }

    options?.onHopStart?.(index)
    await animateHop(element, path[index], path[index + 1], hopDurationMs, anchorYPercent)
    if (index < path.length - 2) {
      await wait(HOP_PAUSE_MS)
    }
  }
}

const SLIDE_SEGMENT_MS = 42

/** Capture return: smooth shrink-slide home (no hop arc). */
export async function animateTokenSlide(
  element: HTMLElement,
  path: BoardPercent[],
  options?: {
    segmentDurationMs?: number
    signal?: AbortSignal
    onStart?: (durationMs: number) => void
    onComplete?: () => void
    anchorYPercent?: number
  },
): Promise<void> {
  if (path.length === 0) {
    return
  }

  const anchorYPercent = options?.anchorYPercent ?? 90
  placeToken(element, path[0], anchorYPercent)
  element.classList.add('board-returning-token--active')

  if (path.length < 2 || prefersReducedMotion()) {
    placeToken(element, path[path.length - 1], anchorYPercent)
    element.classList.remove('board-returning-token--active')
    options?.onComplete?.()
    return
  }

  if (options?.signal?.aborted) {
    placeToken(element, path[path.length - 1], anchorYPercent)
    element.classList.remove('board-returning-token--active')
    return
  }

  const segmentDurationMs = options?.segmentDurationMs ?? SLIDE_SEGMENT_MS
  const durationMs = segmentDurationMs * (path.length - 1)
  options?.onStart?.(durationMs)

  const keyframes: Keyframe[] = path.map((point, index) => {
    const t = index / (path.length - 1)
    const shrink = 1 - Math.sin(Math.PI * t) * 0.12
    return {
      left: `${point.left}%`,
      top: `${point.top}%`,
      transform: `translate(-50%, -${anchorYPercent}%) scale(${shrink})`,
      offset: t,
      easing: 'ease-in-out',
    }
  })

  const animation = element.animate(keyframes, {
    duration: durationMs,
    easing: 'linear',
    fill: 'forwards',
  })

  const onAbort = () => {
    animation.cancel()
  }
  options?.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await animation.finished
  } catch {
    animation.cancel()
  } finally {
    options?.signal?.removeEventListener('abort', onAbort)
    element.classList.remove('board-returning-token--active')
  }

  placeToken(element, path[path.length - 1], anchorYPercent)
  options?.onComplete?.()
}
