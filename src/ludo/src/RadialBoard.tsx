import { useEffect, useMemo, useState, type RefObject } from 'react'
import {
  buildRadialBoardLayout,
  getRadialCellIdForProgress,
  getRadialTokenPercent,
  pointsToSvg,
  VIEW_SIZE,
  type Point,
  type RadialBoardLayout,
} from './boardLayoutRadial'
import { LudoToken } from './LudoToken'
import { resolvePlayerPaintHex, DEFAULT_PAINT_BY_SEAT, lightenPaintHex, darkenPaintHex } from './playerPaint'
import { COLOR_STACK_ORDER, stackDisplayForToken } from './boardStacking'
import type { DieValue } from './dieConfig'
import { DIE_ORIENTATIONS, DIE_PIP_LAYOUTS, DIE_VALUES } from './dieConfig'
import type { GameState, PlayerColor, TokenState } from './types'
import type { BoardPercent } from './tokenMotion'

type MotionToken = {
  tokenId: string
  color: PlayerColor
  paintHex: string
  path: BoardPercent[]
}

type RadialBoardProps = {
  game: GameState
  currentPlayerId: string | null
  dieValue: DieValue
  dieRolling: boolean
  canRoll: boolean
  legalMoveIds: Set<string>
  hoppingToken: MotionToken | null
  returningToken: MotionToken | null
  hoppingTokenRef: RefObject<HTMLDivElement | null>
  returningTokenRef: RefObject<HTMLDivElement | null>
  finishPlaceByPlayerId: Map<string, number>
  onRoll: () => void
  onSelectToken: (tokenId: string) => void
}

function safeStatCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function triangleCentroid(points: Point[]): Point {
  return {
    x: (points[0].x + points[1].x + points[2].x) / 3,
    y: (points[0].y + points[1].y + points[2].y) / 3,
  }
}

/** Shrink a triangle toward its centroid (`t` = 0 keeps size, 1 collapses). */
function insetTriangleByFactor(triangle: Point[], t: number): Point[] {
  const center = triangleCentroid(triangle)
  const amount = Math.max(0, Math.min(1, t))
  return triangle.map((point) => ({
    x: point.x + (center.x - point.x) * amount,
    y: point.y + (center.y - point.y) * amount,
  }))
}

/** Regular n-gon clip-path (%) — flats face seats (matches outer rim home edges). */
function regularPolygonClipPath(sides: number): string {
  const points: string[] = []
  // First vertex at seat boundary so each flat faces a seat (same as outer hex/pent).
  const start = Math.PI / 2 + Math.PI / sides
  for (let i = 0; i < sides; i += 1) {
    const angle = start + (i * 2 * Math.PI) / sides
    const x = 50 + 50 * Math.cos(angle)
    const y = 50 + 50 * Math.sin(angle)
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`)
  }
  return `polygon(${points.join(', ')})`
}

/** SVG polygon points for the dashed turn ring (viewBox 0–100). */
function regularPolygonSvgPoints(sides: number, radius = 47, cx = 50, cy = 50): string {
  const points: string[] = []
  const start = Math.PI / 2 + Math.PI / sides
  for (let i = 0; i < sides; i += 1) {
    const angle = start + (i * 2 * Math.PI) / sides
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`)
  }
  return points.join(' ')
}

function tileFill(
  tile: RadialBoardLayout['tiles'][number],
  paintByColor: Record<PlayerColor, string>,
): string {
  if (tile.color && (tile.type === 'home-lane' || tile.type === 'start')) {
    return paintByColor[tile.color] ?? DEFAULT_PAINT_BY_SEAT[tile.color]
  }
  if (tile.type === 'safe') {
    return '#fff8e8'
  }
  return '#f7fafc'
}

/** Classic board star (stroke polygon), sized to the radial tile. */
function ClassicSafeStar({ size }: { size: number }) {
  const half = size / 2
  return (
    <g className="radial-classic-star" transform={`translate(${-half} ${-half})`}>
      <svg width={size} height={size} viewBox="0 0 100 100" focusable="false" aria-hidden="true">
        <polygon
          points="50,6 61,35 92,35 67,53 76,84 50,66 24,84 33,53 8,35 39,35"
          fill="none"
          stroke="#7a8a9d"
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </g>
  )
}

/** Classic home-entry arrow artwork; rotation aims it at the hub. */
function ClassicHomeEntryArrow({
  color,
  paintHex,
  rotationDeg,
  size,
}: {
  color: PlayerColor
  paintHex: string
  rotationDeg: number
  size: number
}) {
  const half = size / 2
  return (
    <g transform={`rotate(${rotationDeg})`} className={`home-entry-arrow home-entry-arrow--${color}`}>
      <svg
        x={-half}
        y={-half}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        style={{ color: paintHex }}
      >
        <polygon
          points="50,10 82,42 66,42 66,90 34,90 34,42 18,42"
          fill="currentColor"
          stroke="#7a8a9d"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </g>
  )
}

export function RadialBoard({
  game,
  currentPlayerId,
  dieValue,
  dieRolling,
  canRoll,
  legalMoveIds,
  hoppingToken,
  returningToken,
  hoppingTokenRef,
  returningTokenRef,
  finishPlaceByPlayerId,
  onRoll,
  onSelectToken,
}: RadialBoardProps) {
  const seatColorsKey = game.players.map((player) => player.color).join(',')
  const layout = useMemo(
    () => buildRadialBoardLayout(game.players.map((player) => player.color)),
    // Geometry depends on seat colors / count, not turn or token motion.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seatColorsKey tracks color order
    [game.playerCount, seatColorsKey],
  )

  const paintByColor = useMemo(() => {
    const map = { ...DEFAULT_PAINT_BY_SEAT }
    for (const player of game.players) {
      map[player.color] = resolvePlayerPaintHex(player)
    }
    return map
  }, [game.players])

  /** Last place when the match is over — no place-number cover; keep normal home yard. */
  const loserPlayerId =
    game.status === 'COMPLETED' && (game.finishOrder?.length ?? 0) > 0
      ? game.finishOrder[game.finishOrder.length - 1]
      : null

  const orientation = DIE_ORIENTATIONS[dieValue]
  const currentColor = game.players.find((player) => player.id === currentPlayerId)?.color
  const currentFinished = currentPlayerId ? finishPlaceByPlayerId.has(currentPlayerId) : false
  const turnActive =
    Boolean(currentColor) &&
    !currentFinished &&
    game.pendingRoll === null &&
    !dieRolling &&
    game.status !== 'COMPLETED'
  const markerSize = layout.measurements.tileSize * 0.72
  const hubSides = layout.playerCount
  const diePlateClipPath = regularPolygonClipPath(hubSides)
  const diePlateRingPoints = regularPolygonSvgPoints(hubSides)

  const tokenPlacements = useMemo(() => {
    const raw: Array<{
      token: TokenState
      playerId: string
      color: PlayerColor
      paintHex: string
      baseLeft: number
      top: number
      finished: boolean
      stackKey: string
    }> = []
    const finishAt = layout.rules.finishProgress

    for (const player of game.players) {
      if (player.withdrawn) {
        continue
      }
      for (const token of player.tokens) {
        if (token.id === hoppingToken?.tokenId || token.id === returningToken?.tokenId) {
          continue
        }
        const percent = getRadialTokenPercent(layout, player.color, token.progress, token.index)
        if (!percent) {
          continue
        }
        const cellId = getRadialCellIdForProgress(layout, player.color, token.progress)
        raw.push({
          token,
          playerId: player.id,
          color: player.color,
          paintHex: resolvePlayerPaintHex(player),
          baseLeft: percent.left,
          top: percent.top,
          finished: token.progress >= finishAt,
          // Shared track/home cells stack; yard/finish keep unique slots.
          stackKey: cellId ?? `solo:${player.id}:${token.id}`,
        })
      }
    }

    const byCell = new Map<string, typeof raw>()
    for (const item of raw) {
      const group = byCell.get(item.stackKey)
      if (group) {
        group.push(item)
      } else {
        byCell.set(item.stackKey, [item])
      }
    }

    const placements: Array<{
      token: TokenState
      playerId: string
      color: PlayerColor
      paintHex: string
      baseLeft: number
      top: number
      finished: boolean
      stackIndex: number
      stackCount: number
    }> = []

    for (const group of byCell.values()) {
      group.sort((a, b) => {
        const colorDelta = COLOR_STACK_ORDER.indexOf(a.color) - COLOR_STACK_ORDER.indexOf(b.color)
        if (colorDelta !== 0) {
          return colorDelta
        }
        return a.token.index - b.token.index
      })
      const stackCount = group.length
      group.forEach((item, stackIndex) => {
        placements.push({
          token: item.token,
          playerId: item.playerId,
          color: item.color,
          paintHex: item.paintHex,
          baseLeft: item.baseLeft,
          top: item.top,
          finished: item.finished,
          stackIndex,
          stackCount,
        })
      })
    }

    // Paint lower tokens (higher `top`) above upper ones when pins overlap.
    placements.sort((a, b) => a.top - b.top || a.baseLeft - b.baseLeft || a.stackIndex - b.stackIndex)
    return placements
  }, [game.players, layout, hoppingToken?.tokenId, returningToken?.tokenId])

  const tileWidthPct = (layout.measurements.tileSize / VIEW_SIZE) * 100

  const [pageHidden, setPageHidden] = useState(
    () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  )

  useEffect(() => {
    const onVisibility = () => {
      setPageHidden(document.visibilityState === 'hidden')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div
      className={
        pageHidden ? 'radial-board-container radial-board-container--anim-paused' : 'radial-board-container'
      }
      aria-label={
        layout.playerCount === 5 ? 'Five-player radial Ludo board' : 'Six-player radial Ludo board'
      }
    >
      <div className="radial-board-stage">
      <svg
        className="radial-board"
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        role="presentation"
      >
        <defs>
          <filter id="radial-board-float" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor="#122038" floodOpacity="0.28" />
          </filter>
          {layout.seats.map((seat) => {
            const paint = paintByColor[seat.color]
            return (
              <linearGradient
                key={`seat-grads-${seat.seat}`}
                id={`radial-seat-grad-${seat.seat}`}
                x1="18%"
                y1="8%"
                x2="86%"
                y2="92%"
              >
                <stop offset="0%" stopColor={lightenPaintHex(paint, 0.28)} />
                <stop offset="55%" stopColor={paint} />
                <stop offset="100%" stopColor={darkenPaintHex(paint, 0.22)} />
              </linearGradient>
            )
          })}
        </defs>

        <polygon
          points={pointsToSvg(layout.outerRim)}
          className="radial-board-rim-plate"
          filter="url(#radial-board-float)"
        />
        <polygon
          points={pointsToSvg(layout.outerRim)}
          className="radial-board-rim"
        />

        {layout.seats.map((seat) => {
          const player = game.players.find((entry) => entry.color === seat.color)
          const place = player ? finishPlaceByPlayerId.get(player.id) : undefined
          const isLoser = Boolean(player && loserPlayerId && player.id === loserPlayerId)
          // Place-number cover is for finishers only — loser keeps the normal white home pad.
          const showPlaceCover = Boolean(place) && !isLoser
          const yardTurnActive =
            player !== undefined &&
            !player.withdrawn &&
            player.id === currentPlayerId &&
            !place &&
            game.status !== 'COMPLETED'
          const paint = paintByColor[seat.color]
          const slotRadius = layout.measurements.tileSize * 0.3
          const showSlots = !showPlaceCover

          return (
            <g
              key={`home-${seat.seat}`}
              className={
                yardTurnActive ? 'radial-yard radial-yard--turn-active' : 'radial-yard'
              }
            >
              {/* Colored outer frame — one shared gradient per seat */}
              <polygon
                points={pointsToSvg(seat.homeTriangle)}
                fill={`url(#radial-seat-grad-${seat.seat})`}
                className="radial-yard-outer"
              />
              {/* White classic yard plate */}
              <polygon
                points={pointsToSvg(seat.homeTriangleInner)}
                className="radial-yard-inner"
              />
              <polygon
                points={pointsToSvg(seat.homeTriangleInner)}
                className="radial-yard-inner-rim"
              />
              {showSlots
                ? seat.yardSlots.map((slot, index) => (
                    <g key={`yard-${seat.seat}-${index}`} className="radial-yard-slot-group">
                      <circle
                        cx={slot.x}
                        cy={slot.y}
                        r={slotRadius}
                        fill={paint}
                        className="radial-yard-slot"
                      />
                      <circle
                        cx={slot.x}
                        cy={slot.y}
                        r={slotRadius * 0.62}
                        className="radial-yard-slot-core"
                      />
                    </g>
                  ))
                : null}
            </g>
          )
        })}

        {layout.seats.map((seat) => (
          <polygon
            key={`hub-${seat.seat}`}
            points={pointsToSvg(seat.centerWedge)}
            fill={paintByColor[seat.color]}
            stroke="#718096"
            strokeWidth={2}
          />
        ))}

        {layout.tiles.map((tile) => (
          <g key={tile.id} className="radial-tile">
            <polygon
              points={pointsToSvg(tile.points)}
              fill={tileFill(tile, paintByColor)}
              stroke="#718096"
              strokeWidth={1.5}
              data-tile-id={tile.id}
            />
            {tile.type === 'safe' ? (
              <g transform={`translate(${tile.center.x} ${tile.center.y})`}>
                <ClassicSafeStar size={markerSize} />
              </g>
            ) : null}
            {tile.type === 'home-entry' && tile.color && typeof tile.arrowRotationDeg === 'number' ? (
              <g transform={`translate(${tile.center.x} ${tile.center.y})`}>
                <ClassicHomeEntryArrow
                  color={tile.color}
                  paintHex={paintByColor[tile.color]}
                  rotationDeg={tile.arrowRotationDeg}
                  size={markerSize}
                />
              </g>
            ) : null}
          </g>
        ))}

        {layout.seats.map((seat) => {
          const player = game.players.find((entry) => entry.color === seat.color)
          if (!player || player.withdrawn) {
            return null
          }
          const place = finishPlaceByPlayerId.get(player.id)
          if (!place) {
            return null
          }
          // Loser keeps the normal home yard — no place-number cover.
          if (loserPlayerId && player.id === loserPlayerId) {
            return null
          }

          // Large inset card — leaves a thin colored rim, number only.
          const panel = insetTriangleByFactor(seat.homeTriangle, 0.16)
          const center = triangleCentroid(panel)
          const tile = layout.measurements.tileSize
          const placeSize = Math.max(36, tile * 1.05)

          return (
            <g
              key={`finish-banner-${seat.seat}`}
              className={`radial-home-finish radial-home-finish--place-${place}`}
              aria-label={`${player.name} finished in place ${place}`}
            >
              <polygon
                points={pointsToSvg(panel)}
                fill={`url(#radial-seat-grad-${seat.seat})`}
                className="radial-home-finish__panel"
              />
              <polygon
                points={pointsToSvg(panel)}
                className="radial-home-finish__panel-rim"
              />
              <text
                x={center.x}
                y={center.y}
                className="radial-home-finish__place"
                style={{ fontSize: placeSize }}
              >
                {place}
              </text>
            </g>
          )
        })}

      </svg>

      {layout.seats.map((seat) => {
        const player = game.players.find((entry) => entry.color === seat.color)
        if (!player) {
          return null
        }
        const baseName = player.name.trim() || `Player ${seat.seat + 1}`
        const name = player.withdrawn ? `${baseName} (out)` : baseName
        const capturesMade = safeStatCount(player.capturesMade)
        const timesCaptured = safeStatCount(player.timesCaptured)
        const place = finishPlaceByPlayerId.get(player.id)
        const active = !player.withdrawn && player.id === currentPlayerId && !place
        const left = (seat.labelPosition.x / VIEW_SIZE) * 100
        const top = (seat.labelPosition.y / VIEW_SIZE) * 100

        return (
          <div
            key={`label-${seat.color}`}
            className={
              active
                ? `radial-seat-label radial-seat-label--active radial-seat-label--${seat.color}`
                : `radial-seat-label radial-seat-label--${seat.color}`
            }
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: `translate(-50%, -50%) rotate(${seat.labelRotationDeg}deg)`,
              ['--seat-paint' as string]: paintByColor[seat.color],
            }}
            title={`${name} — Captured ${capturesMade}, Lost ${timesCaptured}`}
          >
            <div
              className="radial-seat-label__text"
              style={{
                transform: `rotate(${seat.labelTextRotationDeg - seat.labelRotationDeg}deg)`,
              }}
            >
              <span className="radial-seat-label__stats">
                Captured {capturesMade} · Lost {timesCaptured}
              </span>
            </div>
          </div>
        )
      })}

      <div className="radial-center-die">
        <button
          type="button"
          className="corner-die"
          aria-label={`Roll center die. Current value ${dieValue}`}
          onClick={onRoll}
          disabled={!canRoll || dieRolling || currentFinished}
        >
          <span
            className={
              turnActive && currentColor && !currentFinished
                ? `corner-die__plate-wrap corner-die__plate-wrap--turn-active corner-die__plate--${currentColor}`
                : 'corner-die__plate-wrap'
            }
            aria-hidden="true"
          >
            <span
              className={
                turnActive && currentColor && !currentFinished
                  ? 'corner-die__plate corner-die__plate--hub corner-die__plate--turn-active'
                  : 'corner-die__plate corner-die__plate--hub'
              }
              style={{ clipPath: diePlateClipPath }}
            >
              <span
                className={
                  dieRolling
                    ? 'corner-die__ground-shadow corner-die__ground-shadow--rolling'
                    : 'corner-die__ground-shadow'
                }
              />
            </span>
            {turnActive ? (
              <svg className="corner-die__plate-ring" viewBox="0 0 100 100" focusable="false">
                <polygon
                  className="corner-die__plate-ring-path"
                  points={diePlateRingPoints}
                  pathLength={100}
                />
              </svg>
            ) : null}
          </span>
          <span
            className={dieRolling ? 'corner-die__cube corner-die__cube--rolling' : 'corner-die__cube'}
            style={{
              ['--die-rx' as string]: orientation.rx,
              ['--die-ry' as string]: orientation.ry,
              ['--die-rz' as string]: orientation.rz,
            }}
          >
            {DIE_VALUES.map((face) => (
              <span key={face} className={`die-face die-face--${face}`}>
                {DIE_PIP_LAYOUTS[face].map(([row, column], index) => (
                  <span
                    key={`${face}-${index}`}
                    className="die-pip"
                    style={{
                      ['--pip-row' as string]: row,
                      ['--pip-column' as string]: column,
                    }}
                  />
                ))}
              </span>
            ))}
          </span>
        </button>
      </div>

      {tokenPlacements.map((placement) => {
        const movable = legalMoveIds.has(placement.token.id)
        const display = stackDisplayForToken(placement.stackCount, placement.stackIndex, movable)
        const left = placement.baseLeft + ((display.anchorPercent - 50) / 100) * tileWidthPct
        const className = [
          'radial-token',
          'board-token-piece',
          movable ? 'radial-token--movable board-token-piece--movable' : '',
          placement.finished ? 'radial-token--finished' : '',
        ]
          .filter(Boolean)
          .join(' ')
        // Base keeps tokens above the SVG board; vertical position decides overlap order.
        const zIndex =
          (movable ? 90 : placement.finished ? 55 : 40) +
          Math.round(placement.top) +
          placement.stackIndex
        return (
          <button
            key={placement.token.id}
            type="button"
            className={className}
            style={{
              left: `${left}%`,
              top: `${placement.top}%`,
              zIndex,
              ['--token-paint' as string]: placement.paintHex,
              ['--token-scale' as string]: String(display.scale),
            }}
            disabled={!movable}
            onClick={() => onSelectToken(placement.token.id)}
            aria-label={`${placement.color} token ${placement.token.index + 1}`}
          >
            <LudoToken
              color={placement.color}
              paintHex={placement.paintHex}
              shape="pin"
              variant="classic"
              movable={movable}
            />
          </button>
        )
      })}

      {hoppingToken ? (
        <div className="board-hop-layer radial-hop-layer" aria-hidden="true">
          <div
            ref={hoppingTokenRef}
            className="board-hopping-token"
            style={{
              left: `${hoppingToken.path[0]?.left ?? 50}%`,
              top: `${hoppingToken.path[0]?.top ?? 50}%`,
            }}
          >
            <LudoToken
              color={hoppingToken.color}
              paintHex={hoppingToken.paintHex}
              shape="pin"
              variant="classic"
            />
          </div>
        </div>
      ) : null}

      {returningToken ? (
        <div className="board-hop-layer radial-hop-layer" aria-hidden="true">
          <div
            ref={returningTokenRef}
            className="board-hopping-token board-returning-token"
            style={{
              left: `${returningToken.path[0]?.left ?? 50}%`,
              top: `${returningToken.path[0]?.top ?? 50}%`,
            }}
          >
            <LudoToken
              color={returningToken.color}
              paintHex={returningToken.paintHex}
              shape="pin"
              variant="classic"
            />
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}

/** @deprecated use RadialBoard */
export const HexBoard = RadialBoard
