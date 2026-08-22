import type { PlayerColor, TokenState } from './types'

/** Colors used by the classic 15×15 square board only. */
export type ClassicPlayerColor = 'red' | 'green' | 'yellow' | 'blue'

export type Coordinate = readonly [number, number]

export const BOARD_SIZE = 15

export type CellType =
  | 'blank'
  | 'track'
  | 'safe'
  | 'start'
  | 'red-path'
  | 'green-path'
  | 'blue-path'
  | 'yellow-path'
  | 'center'

export type TileKind = 'outer' | 'home-lane' | 'finish'

export type TileMarker = 'star' | 'start' | 'home-entry' | 'none'

export interface BoardTile {
  id: string
  kind: TileKind
  row?: number
  column?: number
  color?: ClassicPlayerColor
  outerIndex?: number
  laneIndex?: number
  safe: boolean
  marker: TileMarker
  direction?: 'up' | 'down' | 'left' | 'right'
  ariaLabel: string
}

export interface BoardCell {
  id: string
  row: number
  column: number
  type: CellType
  color?: ClassicPlayerColor
  outerIndex?: number
  laneIndex?: number
  marker?: TileMarker
  direction?: 'up' | 'down' | 'left' | 'right'
  safe: boolean
  ariaLabel: string
}

export interface HomeYardDefinition {
  color: ClassicPlayerColor
  rowStart: number
  columnStart: number
  rowSpan: 6
  columnSpan: 6
}

export const HOME_SLOT_POSITIONS = [
  { x: 28, y: 28 },
  { x: 72, y: 28 },
  { x: 28, y: 72 },
  { x: 72, y: 72 },
] as const

export const START_INDEX: Record<ClassicPlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
}

export const HOME_ENTRY: Record<
  ClassicPlayerColor,
  {
    outerIndex: number
    coordinate: Coordinate
    direction: 'up' | 'down' | 'left' | 'right'
  }
> = {
  red: { outerIndex: 50, coordinate: [7, 0], direction: 'right' },
  green: { outerIndex: 11, coordinate: [0, 7], direction: 'down' },
  yellow: { outerIndex: 24, coordinate: [7, 14], direction: 'left' },
  blue: { outerIndex: 37, coordinate: [14, 7], direction: 'up' },
}

export const FINISH_IDS = {
  red: 'finish-red',
  green: 'finish-green',
  yellow: 'finish-yellow',
  blue: 'finish-blue',
} as const

/** Progress value when a token has reached its center finish tile (square board). */
export const FINISH_PROGRESS = 56

/** Per-color finish resting cells (center edges adjacent to the last home-lane tile). */
export const FINISH_COORDS: Record<ClassicPlayerColor, Coordinate> = {
  red: [7, 6],
  green: [6, 7],
  yellow: [7, 8],
  blue: [8, 7],
}

export const HOME_YARDS: Record<ClassicPlayerColor, HomeYardDefinition> = {
  red: { color: 'red', rowStart: 0, columnStart: 0, rowSpan: 6, columnSpan: 6 },
  green: { color: 'green', rowStart: 0, columnStart: 9, rowSpan: 6, columnSpan: 6 },
  blue: { color: 'blue', rowStart: 9, columnStart: 0, rowSpan: 6, columnSpan: 6 },
  yellow: { color: 'yellow', rowStart: 9, columnStart: 9, rowSpan: 6, columnSpan: 6 },
}

export const OUTER_PATH: readonly Coordinate[] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
] as const

export const HOME_LANES: Record<ClassicPlayerColor, readonly Coordinate[]> = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  blue: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
} as const

const HOME_TOKEN_COORDS: Record<ClassicPlayerColor, readonly Coordinate[]> = {
  red: [
    [2, 2],
    [4, 2],
    [2, 4],
    [4, 4],
  ],
  green: [
    [2, 10],
    [4, 10],
    [2, 12],
    [4, 12],
  ],
  blue: [
    [10, 2],
    [12, 2],
    [10, 4],
    [12, 4],
  ],
  yellow: [
    [10, 10],
    [12, 10],
    [10, 12],
    [12, 12],
  ],
}

export const SAFE_OUTER_INDEXES = new Set([0, 8, 13, 21, 26, 34, 39, 47])

const OUTER_INDEX_BY_COORD = new Map<string, number>()
for (let index = 0; index < OUTER_PATH.length; index += 1) {
  const [row, column] = OUTER_PATH[index]
  OUTER_INDEX_BY_COORD.set(toCellKey(row, column), index)
}

const HOME_LANE_INDEX_BY_COORD = new Map<string, { color: ClassicPlayerColor; laneIndex: number }>()
for (const color of ['red', 'green', 'yellow', 'blue'] as const) {
  HOME_LANES[color].forEach(([row, column], laneIndex) => {
    HOME_LANE_INDEX_BY_COORD.set(toCellKey(row, column), { color, laneIndex })
  })
}

function toCellKey(row: number, column: number): string {
  return `${row}-${column}`
}

function inBounds(row: number, column: number): boolean {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE
}

function getDirectionForOuterIndex(outerIndex: number): 'up' | 'down' | 'left' | 'right' | undefined {
  for (const [color, startIndex] of Object.entries(START_INDEX) as Array<[ClassicPlayerColor, number]>) {
    if (startIndex === outerIndex) {
      return color === 'red' ? 'right' : color === 'green' ? 'down' : color === 'yellow' ? 'left' : 'up'
    }
  }

  for (const [, entry] of Object.entries(HOME_ENTRY) as Array<[ClassicPlayerColor, (typeof HOME_ENTRY)[ClassicPlayerColor]]>) {
    if (entry.outerIndex === outerIndex) {
      return entry.direction
    }
  }

  return undefined
}

function getMarkerForOuterIndex(outerIndex: number): TileMarker {
  if (START_INDEX.red === outerIndex || START_INDEX.green === outerIndex || START_INDEX.yellow === outerIndex || START_INDEX.blue === outerIndex) {
    return 'start'
  }

  if (HOME_ENTRY.red.outerIndex === outerIndex || HOME_ENTRY.green.outerIndex === outerIndex || HOME_ENTRY.yellow.outerIndex === outerIndex || HOME_ENTRY.blue.outerIndex === outerIndex) {
    return 'home-entry'
  }

  if (SAFE_OUTER_INDEXES.has(outerIndex)) {
    return 'star'
  }

  return 'none'
}

function buildBoardTiles(): BoardTile[] {
  const tiles: BoardTile[] = []

  for (let outerIndex = 0; outerIndex < OUTER_PATH.length; outerIndex += 1) {
    const [row, column] = OUTER_PATH[outerIndex]
    const color = (Object.entries(START_INDEX) as Array<[ClassicPlayerColor, number]>).find(([, index]) => index === outerIndex)?.[0]

    tiles.push({
      id: `outer-${outerIndex}`,
      kind: 'outer',
      row,
      column,
      outerIndex,
      color,
      safe: Boolean(color) || SAFE_OUTER_INDEXES.has(outerIndex),
      marker: getMarkerForOuterIndex(outerIndex),
      direction: getDirectionForOuterIndex(outerIndex),
      ariaLabel: `${color ? `${color[0].toUpperCase()}${color.slice(1)}` : 'Outer'} track position ${outerIndex}`,
    })
  }

  for (const color of ['red', 'green', 'yellow', 'blue'] as const) {
    HOME_LANES[color].forEach(([row, column], laneIndex) => {
      tiles.push({
        id: `${color}-home-${laneIndex}`,
        kind: 'home-lane',
        row,
        column,
        color,
        laneIndex,
        safe: true,
        marker: 'none',
        ariaLabel: `${color} home lane position ${laneIndex + 1}`,
      })
    })
  }

  tiles.push({
    id: FINISH_IDS.red,
    kind: 'finish',
    row: 7,
    column: 7,
    safe: true,
    marker: 'none',
    ariaLabel: 'Center finish area',
  })

  return tiles
}

export const BOARD_TILES = buildBoardTiles()

export interface BoardGridCell {
  id: string
  row: number
  column: number
  type: CellType
  color?: ClassicPlayerColor
  outerIndex?: number
  laneIndex?: number
  marker?: TileMarker
  direction?: 'up' | 'down' | 'left' | 'right'
  safe: boolean
  ariaLabel: string
}

function buildBoardGridCells(): BoardGridCell[] {
  const cells: BoardGridCell[] = []

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let column = 0; column < BOARD_SIZE; column += 1) {
      const id = `${row}-${column}`
      const outerIndex = OUTER_INDEX_BY_COORD.get(id)
      const laneCell = HOME_LANE_INDEX_BY_COORD.get(id)
      const center = row >= 6 && row <= 8 && column >= 6 && column <= 8

      if (outerIndex !== undefined) {
        const tile = BOARD_TILES.find((entry) => entry.kind === 'outer' && entry.outerIndex === outerIndex)
        const marker = tile?.marker ?? 'none'
        const markerColor =
          marker === 'home-entry'
            ? outerIndex === HOME_ENTRY.red.outerIndex
              ? 'red'
              : outerIndex === HOME_ENTRY.green.outerIndex
                ? 'green'
                : outerIndex === HOME_ENTRY.yellow.outerIndex
                  ? 'yellow'
                  : outerIndex === HOME_ENTRY.blue.outerIndex
                    ? 'blue'
                    : undefined
            : tile?.color
        const type: CellType =
          marker === 'start' ? 'start' : marker === 'star' ? 'safe' : marker === 'home-entry' ? 'track' : 'track'

        cells.push({
          id,
          row,
          column,
          type,
          color: markerColor,
          outerIndex,
          marker,
          direction: tile?.direction,
          safe: tile?.safe ?? false,
          ariaLabel: tile?.ariaLabel ?? `Outer track position ${outerIndex}`,
        })
        continue
      }

      if (laneCell) {
        const cellType = `${laneCell.color}-path` as CellType
        cells.push({
          id,
          row,
          column,
          type: cellType,
          color: laneCell.color,
          laneIndex: laneCell.laneIndex,
          safe: true,
          marker: 'none',
          ariaLabel: `${laneCell.color} home lane position ${laneCell.laneIndex + 1}`,
        })
        continue
      }

      if (center) {
        cells.push({
          id,
          row,
          column,
          type: 'center',
          safe: true,
          marker: 'none',
          ariaLabel: 'Center finish area',
        })
        continue
      }

      cells.push({
        id,
        row,
        column,
        type: 'blank',
        safe: false,
        marker: 'none',
        ariaLabel: `Board cell ${row}, ${column}`,
      })
    }
  }

  return cells
}

export const BOARD_CELLS = buildBoardGridCells()

function isAdjacent(a: Coordinate, b: Coordinate): boolean {
  const rowDelta = Math.abs(a[0] - b[0])
  const columnDelta = Math.abs(a[1] - b[1])
  return rowDelta + columnDelta === 1
}

function isAllowedCornerTransition(previousIndex: number, nextIndex: number): boolean {
  return (
    (previousIndex === 4 && nextIndex === 5) ||
    (previousIndex === 17 && nextIndex === 18) ||
    (previousIndex === 30 && nextIndex === 31) ||
    (previousIndex === 43 && nextIndex === 44)
  )
}

function validateConfiguration(): string[] {
  const errors: string[] = []

  if (OUTER_PATH.length !== 52) {
    errors.push(`Expected 52 outer tiles, found ${OUTER_PATH.length}.`)
  }

  for (const [color, lane] of Object.entries(HOME_LANES) as Array<[ClassicPlayerColor, readonly Coordinate[]]>) {
    if (lane.length !== 5) {
      errors.push(`Expected 5 home-lane tiles for ${color}, found ${lane.length}.`)
    }
  }

  const startTiles = Object.values(START_INDEX)
  if (new Set(startTiles).size !== 4) {
    errors.push('Expected exactly 4 starting tiles.')
  }

  if (SAFE_OUTER_INDEXES.size !== 8) {
    errors.push(`Expected 8 safe outer indexes, found ${SAFE_OUTER_INDEXES.size}.`)
  }

  const outerCoordinates = new Set<string>()
  OUTER_PATH.forEach(([row, column], index) => {
    if (!inBounds(row, column)) {
      errors.push(`Outer tile ${index} is out of bounds.`)
    }

    const key = toCellKey(row, column)
    if (outerCoordinates.has(key)) {
      errors.push(`Duplicate outer coordinate detected at ${key}.`)
    }
    outerCoordinates.add(key)

    if (index > 0 && !isAdjacent(OUTER_PATH[index - 1], [row, column]) && !isAllowedCornerTransition(index - 1, index)) {
      errors.push(`Outer tiles ${index - 1} and ${index} do not touch.`)
    }
  })

  if (!isAdjacent(OUTER_PATH[OUTER_PATH.length - 1], OUTER_PATH[0]) && !isAllowedCornerTransition(51, 0)) {
    errors.push('Outer tile 51 does not connect back to tile 0.')
  }

  for (const [color, entry] of Object.entries(HOME_ENTRY) as Array<[ClassicPlayerColor, (typeof HOME_ENTRY)[ClassicPlayerColor]]>) {
    const firstLane = HOME_LANES[color][0]
    if (!isAdjacent(entry.coordinate, firstLane)) {
      errors.push(`${color} home-entry tile does not touch its first home-lane tile.`)
    }

    const finalLane = HOME_LANES[color][HOME_LANES[color].length - 1]
    const centerEdge =
      color === 'red'
        ? ([7, 6] as Coordinate)
        : color === 'green'
          ? ([6, 7] as Coordinate)
          : color === 'yellow'
            ? ([7, 8] as Coordinate)
            : ([8, 7] as Coordinate)

    if (!isAdjacent(finalLane, centerEdge)) {
      errors.push(`${color} final home-lane tile does not touch the center.`)
    }
  }

  for (const [row, column] of OUTER_PATH) {
    if (!inBounds(row, column)) {
      errors.push(`Outer coordinate [${row}, ${column}] is out of bounds.`)
    }
  }

  for (const [, lane] of Object.entries(HOME_LANES) as Array<[ClassicPlayerColor, readonly Coordinate[]]>) {
    for (const [row, column] of lane) {
      if (!inBounds(row, column)) {
        errors.push(`Home-lane coordinate [${row}, ${column}] is out of bounds.`)
      }
    }
  }

  return errors
}

export function validateBoardConfiguration(): string[] {
  return validateConfiguration()
}

export type RouteStep =
  | {
      type: 'outer'
      step: number
      globalIndex: number
      coordinate: Coordinate
    }
  | {
      type: 'home-lane'
      step: number
      laneIndex: number
      coordinate: Coordinate
    }
  | {
      type: 'finish'
      step: 56
      finishId: (typeof FINISH_IDS)[ClassicPlayerColor]
    }

export function getPlayerRoute(color: ClassicPlayerColor): RouteStep[] {
  const startIndex = START_INDEX[color]
  const outerRoute = Array.from({ length: 51 }, (_, step) => {
    const globalIndex = (startIndex + step) % OUTER_PATH.length
    return {
      type: 'outer' as const,
      step,
      globalIndex,
      coordinate: OUTER_PATH[globalIndex],
    }
  })

  const homeRoute = HOME_LANES[color].map((coordinate, laneIndex) => ({
    type: 'home-lane' as const,
    step: 51 + laneIndex,
    laneIndex,
    coordinate,
  }))

  return [
    ...outerRoute,
    ...homeRoute,
    {
      type: 'finish' as const,
      step: 56,
      finishId: FINISH_IDS[color],
    },
  ]
}

export function getTokenCoord(color: PlayerColor, token: TokenState): Coordinate | null {
  if (color !== 'red' && color !== 'green' && color !== 'yellow' && color !== 'blue') {
    return null
  }

  if (token.progress === -1) {
    return HOME_TOKEN_COORDS[color][token.index] ?? null
  }

  if (token.progress >= FINISH_PROGRESS) {
    return FINISH_COORDS[color]
  }

  if (token.progress >= 0 && token.progress <= 50) {
    const globalIndex = (START_INDEX[color] + token.progress) % OUTER_PATH.length
    return OUTER_PATH[globalIndex] ?? null
  }

  if (token.progress >= 51 && token.progress <= 55) {
    const laneIndex = token.progress - 51
    return HOME_LANES[color][laneIndex] ?? null
  }

  return null
}

export function getTrackCells(): Array<Coordinate> {
  return OUTER_PATH as Coordinate[]
}

export function getStretchCells(color: ClassicPlayerColor): Array<Coordinate> {
  return HOME_LANES[color] as Coordinate[]
}

export function getStartTrackCell(color: ClassicPlayerColor): Coordinate {
  return OUTER_PATH[START_INDEX[color]]
}

export function getHomeTokenCells(color: ClassicPlayerColor): Array<Coordinate> {
  return HOME_TOKEN_COORDS[color] as Coordinate[]
}

export function getSafeTrackCells(): Array<Coordinate> {
  return Array.from(SAFE_OUTER_INDEXES, (index) => OUTER_PATH[index])
}
