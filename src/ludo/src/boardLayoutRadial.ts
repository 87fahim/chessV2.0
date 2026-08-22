import type { PlayerColor } from './types'
import {
  getBoardRules,
  getTrackIndexForRules,
  isRadialPlayerCount,
  RADIAL_CELLS_PER_SEAT,
  type BoardRules,
  type RadialPlayerCount,
} from './boardRules'

export type Point = { x: number; y: number }


export type RadialTileType = 'outer-track' | 'home-lane' | 'start' | 'safe' | 'home-entry'

export interface BoardTile {
  id: string
  seat: number
  row: number
  column: number
  center: Point
  points: Point[]
  type: RadialTileType
  color: PlayerColor | null
  /** Degrees; home-entry arrow rotation (points toward board center). */
  arrowRotationDeg?: number
}

export interface RadialSeatLayout {
  seat: number
  color: PlayerColor
  angle: number
  arm: BoardTile[]
  homeTriangle: Point[]
  /** Inset white triangle inside the home yard. */
  homeTriangleInner: Point[]
  yardSlots: Point[]
  labelPosition: Point
  /** Degrees; aligns the name chip with the home-triangle outer edge. */
  labelRotationDeg: number
  /** Absolute degrees; tops of letters face the board center (aligned with card). */
  labelTextRotationDeg: number
  finishCenter: Point
  /** Colored finish triangle in the center hub (pie slice). */
  centerWedge: Point[]
  /** Rest slots for finished tokens inside `centerWedge` (away from the die). */
  finishSlots: Point[]
  /** Middle-column home cells, outer→inner (progress order). */
  homeLaneIds: string[]
  startCellId: string
  /** Former start tile; now the home-entry arrow toward center. */
  homeEntryCellId: string
}

export interface BoardMeasurements {
  sectorAngle: number
  tileSize: number
  armHalfWidth: number
  innerRadius: number
}

export interface RadialBoardLayout {
  playerCount: RadialPlayerCount
  rules: BoardRules
  measurements: BoardMeasurements
  seats: RadialSeatLayout[]
  tiles: BoardTile[]
  cellsById: Record<string, BoardTile>
  /** Outer track cell ids in walk order (CCW). */
  outerRoute: string[]
  finishIds: Record<string, string>
  center: Point
  /** Outer silhouette of the radial board (pentagon / hexagon rim). */
  outerRim: Point[]
}

export const VIEW_SIZE = 1000
export const CENTER: Point = { x: 500, y: 500 }
export const ARM_ROWS = 6
export const ARM_COLUMNS = 3
export const OUTER_RADIUS = 465

export function pointToPercent(point: Point): { left: number; top: number } {
  return {
    left: (point.x / VIEW_SIZE) * 100,
    top: (point.y / VIEW_SIZE) * 100,
  }
}

export function pointsToSvg(points: Point[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function calculateBoardMeasurements(playerCount: RadialPlayerCount): BoardMeasurements {
  const sectorAngle = (2 * Math.PI) / playerCount
  const tileSize =
    OUTER_RADIUS / (ARM_ROWS + ARM_COLUMNS / 2 / Math.tan(sectorAngle / 2))
  const armHalfWidth = (ARM_COLUMNS * tileSize) / 2
  const innerRadius = armHalfWidth / Math.tan(sectorAngle / 2)
  return { sectorAngle, tileSize, armHalfWidth, innerRadius }
}

export function positionInSector(angle: number, radial: number, sideways: number): Point {
  return {
    x: CENTER.x + radial * Math.cos(angle) - sideways * Math.sin(angle),
    y: CENTER.y + radial * Math.sin(angle) + sideways * Math.cos(angle),
  }
}

/** Seat 0 at bottom; remaining seats CCW. */
export function seatAngle(seat: number, playerCount: RadialPlayerCount): number {
  return Math.PI / 2 + seat * ((2 * Math.PI) / playerCount)
}

function tileId(seat: number, row: number, column: number): string {
  return `seat-${seat}-r${row}-c${column}`
}

function createArmTiles(
  seat: number,
  playerCount: RadialPlayerCount,
  color: PlayerColor,
): BoardTile[] {
  const { tileSize, innerRadius } = calculateBoardMeasurements(playerCount)
  const angle = seatAngle(seat, playerCount)
  const tiles: BoardTile[] = []

  for (let row = 0; row < ARM_ROWS; row += 1) {
    for (let column = 0; column < ARM_COLUMNS; column += 1) {
      const radialStart = innerRadius + row * tileSize
      const radialEnd = radialStart + tileSize
      const sidewaysStart = (column - ARM_COLUMNS / 2) * tileSize
      const sidewaysEnd = sidewaysStart + tileSize

      const points = [
        positionInSector(angle, radialStart, sidewaysStart),
        positionInSector(angle, radialStart, sidewaysEnd),
        positionInSector(angle, radialEnd, sidewaysEnd),
        positionInSector(angle, radialEnd, sidewaysStart),
      ]

      const isHomeLane = column === 1 && row < ARM_ROWS - 1

      tiles.push({
        id: tileId(seat, row, column),
        seat,
        row,
        column,
        points,
        center: positionInSector(
          angle,
          radialStart + tileSize / 2,
          sidewaysStart + tileSize / 2,
        ),
        type: isHomeLane ? 'home-lane' : 'outer-track',
        color: isHomeLane ? color : null,
      })
    }
  }

  return tiles
}

export function createHomeTriangle(seat: number, playerCount: RadialPlayerCount): Point[] {
  const { sectorAngle, armHalfWidth, innerRadius } = calculateBoardMeasurements(playerCount)
  const currentAngle = seatAngle(seat, playerCount)
  const nextAngle = currentAngle + sectorAngle

  return [
    positionInSector(currentAngle, OUTER_RADIUS, armHalfWidth),
    positionInSector(nextAngle, OUTER_RADIUS, -armHalfWidth),
    positionInSector(currentAngle, innerRadius, armHalfWidth),
  ]
}

/** Outer rim vertices around all home yards (board silhouette). */
export function buildOuterRim(playerCount: RadialPlayerCount, pad = 6): Point[] {
  const { sectorAngle, armHalfWidth } = calculateBoardMeasurements(playerCount)
  const points: Point[] = []
  for (let seat = 0; seat < playerCount; seat += 1) {
    const angle = seatAngle(seat, playerCount)
    points.push(positionInSector(angle, OUTER_RADIUS, armHalfWidth))
    points.push(positionInSector(angle + sectorAngle, OUTER_RADIUS, -armHalfWidth))
  }
  if (pad === 0) {
    return points
  }
  return points.map((point) => {
    const dx = point.x - CENTER.x
    const dy = point.y - CENTER.y
    const len = Math.hypot(dx, dy) || 1
    return {
      x: point.x + (dx / len) * pad,
      y: point.y + (dy / len) * pad,
    }
  })
}

/** Finish pie-slice: board center → inner corners of that seat’s arm. */
export function createCenterWedge(seat: number, playerCount: RadialPlayerCount): Point[] {
  const { armHalfWidth, innerRadius } = calculateBoardMeasurements(playerCount)
  const angle = seatAngle(seat, playerCount)
  return [
    { ...CENTER },
    positionInSector(angle, innerRadius, -armHalfWidth),
    positionInSector(angle, innerRadius, armHalfWidth),
  ]
}

/**
 * Rest points for finished tokens: compact 2×2 grid in the visible trapezoid.
 * Upright pins grow upward from the foot, so bottom seats (heads toward the die)
 * are nudged outward to keep clearance from the die plate.
 */
function finishSlotsInWedge(wedge: Point[]): Point[] {
  const [hub, a, b] = wedge
  const baseMid = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }

  const radialX = baseMid.x - hub.x
  const radialY = baseMid.y - hub.y
  const radialLen = Math.hypot(radialX, radialY) || 1
  const rx = radialX / radialLen
  const ry = radialY / radialLen

  // Screen-up in SVG (y grows downward). Bottom seats have outward +Y, so
  // upright pin heads grow toward the die — push those clusters outward.
  const headsTowardDie = Math.max(0, ry)
  const focusT = 0.72 + headsTowardDie * 0.14
  const focus = lerpPoint(hub, baseMid, Math.min(0.9, focusT))

  const alongX = b.x - a.x
  const alongY = b.y - a.y
  const alongLen = Math.hypot(alongX, alongY) || 1
  const ux = alongX / alongLen
  const uy = alongY / alongLen

  const halfW = Math.min(alongLen * 0.18, 16)
  const halfD = Math.min(radialLen * (0.09 + headsTowardDie * 0.02), 12)

  return [
    { x: focus.x - ux * halfW + rx * halfD, y: focus.y - uy * halfW + ry * halfD },
    { x: focus.x + ux * halfW + rx * halfD, y: focus.y + uy * halfW + ry * halfD },
    { x: focus.x - ux * halfW - rx * halfD, y: focus.y - uy * halfW - ry * halfD },
    { x: focus.x + ux * halfW - rx * halfD, y: focus.y + uy * halfW - ry * halfD },
  ]
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function signedArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    area += a.x * b.y - b.x * a.y
  }
  return area / 2
}

function lineIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const dxa = a2.x - a1.x
  const dya = a2.y - a1.y
  const dxb = b2.x - b1.x
  const dyb = b2.y - b1.y
  const denom = dxa * dyb - dya * dxb
  if (Math.abs(denom) < 1e-8) return null
  const t = ((b1.x - a1.x) * dyb - (b1.y - a1.y) * dxb) / denom
  return { x: a1.x + t * dxa, y: a1.y + t * dya }
}

/** Inset a triangle so every edge sits inward by `distance` (≈ one tile rim). */
function insetTriangleByDistance(triangle: Point[], distance: number): Point[] {
  if (distance <= 0) return triangle.map((p) => ({ ...p }))

  // Walk CCW so left normals point inward.
  const pts = signedArea(triangle) < 0 ? [...triangle].reverse() : [...triangle]
  const n = pts.length
  const offsetEdges: { a: Point; b: Point }[] = []

  for (let i = 0; i < n; i += 1) {
    const a = pts[i]
    const b = pts[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    offsetEdges.push({
      a: { x: a.x + nx * distance, y: a.y + ny * distance },
      b: { x: b.x + nx * distance, y: b.y + ny * distance },
    })
  }

  const inset: Point[] = []
  for (let i = 0; i < n; i += 1) {
    const prev = offsetEdges[(i + n - 1) % n]
    const curr = offsetEdges[i]
    const hit = lineIntersection(prev.a, prev.b, curr.a, curr.b)
    if (!hit) {
      // Fallback: pull vertex toward centroid if edges are parallel.
      const centroid = {
        x: (pts[0].x + pts[1].x + pts[2].x) / 3,
        y: (pts[0].y + pts[1].y + pts[2].y) / 3,
      }
      inset.push(lerpPoint(pts[i], centroid, 0.35))
      continue
    }
    inset.push(hit)
  }

  // Preserve original winding so SVG fill matches the outer triangle.
  return signedArea(triangle) < 0 ? inset.reverse() : inset
}

/** Three slots near the vertices + one at the centroid, evenly spaced. */
function yardSlotsInTriangle(triangle: Point[]): Point[] {
  const [a, b, c] = triangle
  const centroid = {
    x: (a.x + b.x + c.x) / 3,
    y: (a.y + b.y + c.y) / 3,
  }
  // Pull each vertex slot toward the center so they clear the rim evenly.
  const towardCenter = 0.48
  return [
    lerpPoint(a, centroid, towardCenter),
    lerpPoint(b, centroid, towardCenter),
    lerpPoint(c, centroid, towardCenter),
    { ...centroid },
  ]
}

function outerSegmentIds(seat: number): string[] {
  const ids: string[] = []
  for (let row = 0; row < ARM_ROWS; row += 1) {
    ids.push(tileId(seat, row, 0))
  }
  ids.push(tileId(seat, ARM_ROWS - 1, 1))
  for (let row = ARM_ROWS - 1; row >= 0; row -= 1) {
    ids.push(tileId(seat, row, 2))
  }
  return ids
}

export function buildRadialBoardLayout(seatColors: PlayerColor[]): RadialBoardLayout {
  const playerCount = seatColors.length
  if (!isRadialPlayerCount(playerCount)) {
    throw new Error('Radial board requires 5 or 6 seats.')
  }

  const measurements = calculateBoardMeasurements(playerCount)
  const rules = getBoardRules(playerCount, seatColors)
  const cellsById: Record<string, BoardTile> = {}
  const tiles: BoardTile[] = []
  const outerRoute: string[] = []
  const finishIds: Record<string, string> = {}

  const seats: RadialSeatLayout[] = seatColors.map((color, seat) => {
    const angle = seatAngle(seat, playerCount)
    const arm = createArmTiles(seat, playerCount, color)
    for (const tile of arm) {
      cellsById[tile.id] = tile
      tiles.push(tile)
    }

    const homeTriangle = createHomeTriangle(seat, playerCount)
    // Classic-style thick colored rim around the white yard pad.
    const homeTriangleInner = insetTriangleByDistance(homeTriangle, measurements.tileSize * 0.85)
    const homeLaneIds = Array.from({ length: ARM_ROWS - 1 }, (_, index) => {
      const row = ARM_ROWS - 2 - index
      return tileId(seat, row, 1)
    })

    const tip = cellsById[tileId(seat, ARM_ROWS - 1, 1)]
    // Tip is the home-entry approach (not a star tile).
    if (tip) {
      tip.type = 'outer-track'
      tip.color = null
    }

    // Star safe two tiles back from the old tip-corner (r5c0 → r3c0).
    const starTile = cellsById[tileId(seat, 3, 0)]
    if (starTile && starTile.type === 'outer-track') {
      starTile.type = 'safe'
    }

    outerRoute.push(...outerSegmentIds(seat))
    finishIds[color] = `seat-${seat}-finish`

    const midAngle = angle + measurements.sectorAngle / 2
    const labelRadial = OUTER_RADIUS + measurements.tileSize * 0.55
    // Label card runs along the triangle’s outer edge (tangent to the sector midline).
    let labelRotationDeg = ((midAngle * 180) / Math.PI + 90) % 360
    if (labelRotationDeg < 0) {
      labelRotationDeg += 360
    }
    // Keep the card readable (not upside-down) on the far side of the board.
    if (labelRotationDeg > 90 && labelRotationDeg < 270) {
      labelRotationDeg = (labelRotationDeg + 180) % 360
    }
    // Text stays aligned with the card; tops of letters face the board center.
    let labelTextRotationDeg = ((midAngle * 180) / Math.PI - 90) % 360
    if (labelTextRotationDeg < 0) {
      labelTextRotationDeg += 360
    }

    const centerWedge = createCenterWedge(seat, playerCount)
    const finishSlots = finishSlotsInWedge(centerWedge)

    return {
      seat,
      color,
      angle,
      arm,
      homeTriangle,
      homeTriangleInner,
      yardSlots: yardSlotsInTriangle(homeTriangleInner),
      labelPosition: positionInSector(midAngle, labelRadial, 0),
      labelRotationDeg,
      labelTextRotationDeg,
      centerWedge,
      finishSlots,
      finishCenter: finishSlots[3] ?? finishSlots[0]!,
      homeLaneIds,
      startCellId: tileId(seat, 4, 2),
      homeEntryCellId: tileId(seat, ARM_ROWS - 1, 1),
    }
  })

  // Start = r4c2 on that seat’s arm. Home-entry arrow = tip r5c1 (points into home / center).
  for (const seat of seats) {
    const startTile = cellsById[seat.startCellId]
    if (startTile) {
      startTile.type = 'start'
      startTile.color = seat.color
    }

    const entryTile = cellsById[seat.homeEntryCellId]
    if (entryTile) {
      entryTile.type = 'home-entry'
      entryTile.color = seat.color
      entryTile.arrowRotationDeg = (seat.angle * 180) / Math.PI + 270
    }
  }

  return {
    playerCount,
    rules,
    measurements,
    seats,
    tiles,
    cellsById,
    outerRoute,
    finishIds,
    center: CENTER,
    outerRim: buildOuterRim(playerCount, 8),
  }
}

export function getRadialTokenPoint(
  layout: RadialBoardLayout,
  color: PlayerColor,
  progress: number,
  tokenIndex = 0,
): Point | null {
  const seat = layout.seats.find((entry) => entry.color === color)
  if (!seat) {
    return null
  }

  const { rules } = layout

  if (progress < 0) {
    return seat.yardSlots[tokenIndex % seat.yardSlots.length] ?? null
  }

  if (progress >= rules.finishProgress) {
    return seat.finishSlots[tokenIndex % seat.finishSlots.length] ?? seat.finishCenter
  }

  if (progress >= rules.homeLaneStart && progress < rules.finishProgress) {
    const laneIndex = progress - rules.homeLaneStart
    const cellId = seat.homeLaneIds[laneIndex]
    const cell = cellId ? layout.cellsById[cellId] : null
    return cell?.center ?? seat.finishCenter
  }

  if (progress >= 0 && progress <= rules.lastOuterProgress) {
    const start = rules.startIndex[color]
    if (typeof start !== 'number') {
      return null
    }
    const outerIndex = (start + progress) % rules.outerLength
    const cellId = layout.outerRoute[outerIndex]
    const cell = cellId ? layout.cellsById[cellId] : null
    return cell?.center ?? null
  }

  return null
}

export function getRadialTokenPercent(
  layout: RadialBoardLayout,
  color: PlayerColor,
  progress: number,
  tokenIndex = 0,
): { left: number; top: number } | null {
  const point = getRadialTokenPoint(layout, color, progress, tokenIndex)
  return point ? pointToPercent(point) : null
}

/**
 * Ordered path steps for one color from yard-exit (progress 0) through finish.
 * Used for path debugging overlays (step numbers on tiles).
 */
export function getRadialPlayerPathSteps(
  layout: RadialBoardLayout,
  color: PlayerColor,
): Array<{
  progress: number
  label: string
  cellId: string | null
  point: Point
  kind: 'start' | 'outer' | 'home-entry' | 'home' | 'finish'
}> {
  const seat = layout.seats.find((entry) => entry.color === color)
  if (!seat) {
    return []
  }

  const { rules } = layout
  const steps: Array<{
    progress: number
    label: string
    cellId: string | null
    point: Point
    kind: 'start' | 'outer' | 'home-entry' | 'home' | 'finish'
  }> = []

  for (let progress = 0; progress <= rules.lastOuterProgress; progress += 1) {
    const outerIndex = getTrackIndexForRules(rules, color, progress)
    const cellId = layout.outerRoute[outerIndex] ?? null
    const cell = cellId ? layout.cellsById[cellId] : null
    const point = cell?.center ?? getRadialTokenPoint(layout, color, progress, 0)
    if (!point) {
      continue
    }

    let kind: 'start' | 'outer' | 'home-entry' = 'outer'
    if (progress === 0) {
      kind = 'start'
    } else if (cellId === seat.homeEntryCellId) {
      kind = 'home-entry'
    }

    steps.push({
      progress,
      label: String(progress),
      cellId,
      point,
      kind,
    })
  }

  for (let lane = 0; lane < seat.homeLaneIds.length; lane += 1) {
    const progress = rules.homeLaneStart + lane
    const cellId = seat.homeLaneIds[lane]
    const cell = layout.cellsById[cellId]
    if (!cell) {
      continue
    }
    steps.push({
      progress,
      label: String(progress),
      cellId,
      point: cell.center,
      kind: 'home',
    })
  }

  steps.push({
    progress: rules.finishProgress,
    label: String(rules.finishProgress),
    cellId: layout.finishIds[color] ?? null,
    point: seat.finishCenter,
    kind: 'finish',
  })

  return steps
}

export function buildRadialMovePercentPath(
  layout: RadialBoardLayout,
  color: PlayerColor,
  fromProgress: number,
  toProgress: number,
  tokenIndex = 0,
): Array<{ left: number; top: number }> {
  const path: Array<{ left: number; top: number }> = []

  if (fromProgress === -1) {
    const yard = getRadialTokenPercent(layout, color, -1, tokenIndex)
    const destination = getRadialTokenPercent(layout, color, toProgress, tokenIndex)
    if (yard) path.push(yard)
    if (destination) path.push(destination)
    return path
  }

  const start = getRadialTokenPercent(layout, color, fromProgress, tokenIndex)
  if (start) path.push(start)

  const end = Math.max(fromProgress, toProgress)
  for (let progress = fromProgress + 1; progress <= end; progress += 1) {
    const point = getRadialTokenPercent(layout, color, progress, tokenIndex)
    if (point) path.push(point)
  }
  return path
}

export function buildRadialCaptureReturnPercentPath(
  layout: RadialBoardLayout,
  color: PlayerColor,
  fromProgress: number,
  tokenIndex = 0,
): Array<{ left: number; top: number }> {
  if (fromProgress < 0) {
    const yard = getRadialTokenPercent(layout, color, -1, tokenIndex)
    return yard ? [yard] : []
  }

  const path: Array<{ left: number; top: number }> = []
  for (let progress = fromProgress; progress >= 0; progress -= 1) {
    const point = getRadialTokenPercent(layout, color, progress, tokenIndex)
    if (point) path.push(point)
  }
  const yard = getRadialTokenPercent(layout, color, -1, tokenIndex)
  if (yard) path.push(yard)
  return path
}
