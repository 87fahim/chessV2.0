import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  applyLocalMove,
  applyLocalRoll,
  clearGameLocal,
  createLocalGame,
  forceEndGame,
  forceFinishPlayer,
  loadGameLocal,
  repairStuckTurn,
  saveGameLocal,
  setPlayerPaintHex,
  setPlayerName,
  withdrawPlayer,
} from './localGameEngine'
import {
  getGameSoundVolume,
  playCaptureHitSound,
  playCaptureHomeSound,
  playCaptureTravelSound,
  playDiceRollSound,
  playExtraTurnSound,
  playGameEndSound,
  playGameStartSound,
  playHopSound,
  playPlayerWinSound,
  playTokenFinishSound,
  playTurnPassSound,
  playYardExitSound,
  setGameSoundVolume,
  unlockGameSounds,
} from './gameSounds'
import { BOARD_CELLS, FINISH_PROGRESS, HOME_SLOT_POSITIONS, HOME_YARDS, getTokenCoord, type ClassicPlayerColor } from './boardLayout'
import {
  buildRadialBoardLayout,
  buildRadialCaptureReturnPercentPath,
  buildRadialMovePercentPath,
} from './boardLayoutRadial'
import { getBoardRules, isRadialPlayerCount } from './boardRules'
import { COLOR_STACK_ORDER, stackAnchorPercents, stackDisplayForToken, stackTokenScale } from './boardStacking'
import {
  DIE_ORIENTATIONS,
  DIE_PIP_LAYOUTS,
  DIE_ROLL_ANIMATION_MS,
  DIE_VALUES,
  asDieValue,
  rollDieLocally,
  safeStatCount,
  type DieValue,
} from './dieConfig'
import { averageProgressScore } from './progressScore'
import { LudoToken } from './LudoToken'
import { RadialBoard } from './RadialBoard'
import { animateTokenHops, animateTokenSlide, buildCaptureReturnPercentPath, buildMovePercentPath, type BoardPercent } from './tokenMotion'
import type { GameState, PlayerColor, PlayerCount, TokenState } from './types'
import { resolvePlayerPaintHex, buildSeatPaintMap, seatPaintCssVars } from './playerPaint'
import {
  LudoBoardSurface,
  LudoLoadingPanel,
  LudoMatchLayout,
  LudoNewGameDialog,
  LudoPageShell,
  LudoRestartDialog,
  LudoSessionHeader,
  LudoSetupPanel,
  LudoWithdrawPlayerDialog,
} from './LudoMatchChrome'
import './App.css'
import './radialBoard.css'

type SetupCount = PlayerCount
type SetupStep = 'count' | 'names'

const COLORS_BY_PLAYER_COUNT: Record<SetupCount, PlayerColor[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'red', 'green'],
  4: ['blue', 'red', 'green', 'yellow'],
  5: ['blue', 'orange', 'green', 'red', 'yellow'],
  6: ['blue', 'orange', 'green', 'red', 'yellow', 'purple'],
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6']

const HOME_YARD_ORDER: ClassicPlayerColor[] = ['red', 'green', 'blue', 'yellow']

type BoardCornerId = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const BOARD_CORNERS: ReadonlyArray<{ id: BoardCornerId; label: string; color: PlayerColor }> = [
  { id: 'top-left', label: 'top left', color: 'red' },
  { id: 'top-right', label: 'top right', color: 'green' },
  { id: 'bottom-left', label: 'bottom left', color: 'blue' },
  { id: 'bottom-right', label: 'bottom right', color: 'yellow' },
]

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function CornerDie({
  value,
  rolling,
  disabled,
  corner,
  color,
  profileName,
  highlighted,
  turnActive,
  capturesMade,
  timesCaptured,
  progressScore,
  onRoll,
}: {
  value: DieValue
  rolling: boolean
  disabled: boolean
  corner: BoardCornerId
  color: PlayerColor
  profileName: string
  highlighted: boolean
  turnActive: boolean
  capturesMade: number
  timesCaptured: number
  progressScore: number
  onRoll: () => void
}) {
  const orientation = DIE_ORIENTATIONS[value]
  const shadowClassName = rolling
    ? 'corner-die__ground-shadow corner-die__ground-shadow--rolling'
    : 'corner-die__ground-shadow'
  const plateClassName = turnActive
    ? `corner-die__plate corner-die__plate--turn-active corner-die__plate--${color}`
    : 'corner-die__plate'

  return (
    <div className={`corner-die-slot corner-die-slot--${corner}`}>
      <div
        className={
          !profileName
            ? `corner-die-profile corner-die-profile--empty corner-die-profile--${color}`
            : highlighted
              ? `corner-die-profile corner-die-profile--active corner-die-profile--${color}`
              : `corner-die-profile corner-die-profile--${color}`
        }
        title={profileName || undefined}
        aria-label={profileName || undefined}
        aria-hidden={profileName ? undefined : true}
      >
        <span className="corner-die-profile__name">{profileName || ''}</span>
      </div>

      <div className="corner-die-main">
        <button
          type="button"
          className="corner-die"
          aria-label={`Roll ${corner} die for ${profileName}. Current value ${value}`}
          onClick={onRoll}
          disabled={disabled}
        >
          <span className={plateClassName} aria-hidden="true">
            <span className={shadowClassName} />
            {turnActive ? (
              <svg className="corner-die__plate-ring" viewBox="0 0 100 100" focusable="false">
                <rect
                  className="corner-die__plate-ring-path"
                  x="3"
                  y="3"
                  width="94"
                  height="94"
                  rx="14"
                  ry="14"
                  pathLength={100}
                />
              </svg>
            ) : null}
          </span>
          <span
            className={rolling ? 'corner-die__cube corner-die__cube--rolling' : 'corner-die__cube'}
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

        <div
          className="corner-die-stats"
          aria-label={`${profileName} stats: captured ${capturesMade}, lost ${timesCaptured}, score ${progressScore}%`}
        >
          <span title="Pieces captured">Captured {capturesMade}</span>
          <span title="Pieces lost">Lost {timesCaptured}</span>
          <span title="Average progress (exact-finish, home-yard, and behind-threat adjusted)">
            Score {progressScore}%
          </span>
        </div>
      </div>
    </div>
  )
}

function toCssGrid(row: number, column: number): { gridRow: number; gridColumn: number } {
  return {
    gridRow: row + 1,
    gridColumn: column + 1,
  }
}

function HomeEntryArrow({ direction, color }: { direction: 'up' | 'down' | 'left' | 'right'; color: PlayerColor }) {
  return (
    <svg className={`home-entry-arrow home-entry-arrow--${color} home-entry-arrow--${direction}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <polygon points="50,10 82,42 66,42 66,90 34,90 34,42 18,42" />
    </svg>
  )
}

function FinishPlaceIcon({ place }: { place: number }) {
  if (place === 1) {
    return (
      <svg className="home-yard-finish__glyph" viewBox="0 0 64 64" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 20l8 6 8-14 8 14 8-6v22H12V20zm4 26h32v6H16v-6z"
        />
        <circle cx="20" cy="18" r="3.5" fill="currentColor" />
        <circle cx="32" cy="10" r="3.5" fill="currentColor" />
        <circle cx="44" cy="18" r="3.5" fill="currentColor" />
      </svg>
    )
  }

  if (place === 2) {
    return (
      <svg className="home-yard-finish__glyph" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
        <path fill="currentColor" d="M24 8h16l-4 10h-8L24 8zm-2 36h20v12H22V44z" />
        <text x="32" y="33" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">
          2
        </text>
      </svg>
    )
  }

  if (place === 3) {
    return (
      <svg className="home-yard-finish__glyph" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="28" r="16" fill="none" stroke="currentColor" strokeWidth="4" />
        <path fill="currentColor" d="M24 8h16l-4 10h-8L24 8zm-2 36h20v12H22V44z" />
        <text x="32" y="33" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">
          3
        </text>
      </svg>
    )
  }

  return (
    <svg className="home-yard-finish__glyph" viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 8l3.5 10.5H46l-8.5 6.5 3.5 11L32 29l-9 7 3.5-11L18 18.5h10.5L32 8z"
      />
      <text x="32" y="52" textAnchor="middle" fill="currentColor" fontSize="14" fontWeight="700">
        {place}
      </text>
    </svg>
  )
}

function finishPlaceTitle(place: number): string {
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

function EndGameCelebration({
  standings,
  onRestart,
  onClose,
}: {
  standings: Array<{ id: string; name: string; color: PlayerColor; place: number; isLoser: boolean }>
  onRestart: () => void
  onClose: () => void
}) {
  return (
    <div className="end-game" role="dialog" aria-modal="true" aria-labelledby="end-game-title">
      <div className="end-game__veil" />
      <div className="end-game__spark end-game__spark--a" aria-hidden="true" />
      <div className="end-game__spark end-game__spark--b" aria-hidden="true" />
      <div className="end-game__spark end-game__spark--c" aria-hidden="true" />

      <div className="end-game__card">
        <div className="end-game__ribbon" aria-hidden="true">
          <span />
        </div>
        <p className="end-game__eyebrow">Match Complete</p>
        <h2 id="end-game-title" className="end-game__title">
          Final Standings
        </h2>

        <ol className="end-game__list">
          {standings.map((entry, index) => (
            <li
              key={entry.id}
              className={
                entry.isLoser
                  ? `end-game__row end-game__row--loser end-game__row--${entry.color}`
                  : `end-game__row end-game__row--place-${entry.place} end-game__row--${entry.color}`
              }
              style={{ ['--end-game-delay' as string]: `${180 + index * 140}ms` }}
            >
              <span className="end-game__rank" aria-hidden="true">
                {entry.isLoser ? (
                  <span className="end-game__rank-text">—</span>
                ) : (
                  <span className="end-game__rank-text">#{entry.place}</span>
                )}
              </span>
              <span className={`end-game__swatch end-game__swatch--${entry.color}`} aria-hidden="true" />
              <div className="end-game__meta">
                <span className="end-game__name">{entry.name}</span>
                <span className="end-game__role">
                  {entry.isLoser ? 'Loser' : finishPlaceTitle(entry.place)}
                </span>
              </div>
              <span className="end-game__badge" aria-hidden="true">
                {entry.place === 1 ? '♛' : entry.isLoser ? '◆' : '●'}
              </span>
            </li>
          ))}
        </ol>

        <div className="end-game__actions">
          <button type="button" className="end-game__btn end-game__btn--primary" onClick={onRestart}>
            Restart
          </button>
          <button type="button" className="end-game__btn end-game__btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function HomeYardFinishBanner({
  color,
  name,
  place,
}: {
  color: ClassicPlayerColor
  name: string
  place: number
}) {
  const yard = HOME_YARDS[color]

  return (
    <div
      className={`home-yard-finish home-yard-finish--${color} home-yard-finish--place-${place}`}
      style={{
        gridRow: `${yard.rowStart + 1} / ${yard.rowStart + yard.rowSpan + 1}`,
        gridColumn: `${yard.columnStart + 1} / ${yard.columnStart + yard.columnSpan + 1}`,
      }}
      role="status"
      aria-label={`${name} finished in place ${place}`}
    >
      <div className="home-yard-finish__panel">
        <div className="home-yard-finish__icon" aria-hidden="true">
          <FinishPlaceIcon place={place} />
        </div>
        <p className="home-yard-finish__name" title={name}>
          {name}
        </p>
        <p className="home-yard-finish__place">#{place}</p>
        <p className="home-yard-finish__title">{finishPlaceTitle(place)}</p>
      </div>
    </div>
  )
}

function HomeYardOverlay({ color, active }: { color: ClassicPlayerColor; active: boolean }) {
  const yard = HOME_YARDS[color]

  return (
    <div
      className={
        active
          ? `home-yard home-yard--${color} home-yard--turn-active`
          : `home-yard home-yard--${color}`
      }
      style={{
        gridRow: `${yard.rowStart + 1} / ${yard.rowStart + yard.rowSpan + 1}`,
        gridColumn: `${yard.columnStart + 1} / ${yard.columnStart + yard.columnSpan + 1}`,
      }}
      aria-hidden="true"
    >
      <div className="home-yard__inner">
        {HOME_SLOT_POSITIONS.map((slot, index) => (
          <span
            key={`${color}-slot-${index}`}
            className={`home-yard__slot home-yard__slot--${index + 1}`}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          />
        ))}
      </div>
    </div>
  )
}

function HomeYardTokens({
  color,
  paintHex,
  tokens,
  legalMoves,
  disabled,
  hiddenTokenId,
  onSelect,
}: {
  color: ClassicPlayerColor
  paintHex: string
  tokens: TokenState[]
  legalMoves: string[]
  disabled: boolean
  hiddenTokenId: string | null
  onSelect: (tokenId: string) => void
}) {
  const yard = HOME_YARDS[color]

  return (
    <div
      className={`home-yard-tokens home-yard-tokens--${color}`}
      style={{
        gridRow: `${yard.rowStart + 1} / ${yard.rowStart + yard.rowSpan + 1}`,
        gridColumn: `${yard.columnStart + 1} / ${yard.columnStart + yard.columnSpan + 1}`,
      }}
    >
      <div className="home-yard-tokens__inner">
        {tokens
          .filter((token) => token.progress === -1 && token.id !== hiddenTokenId)
          .slice()
          .sort((a, b) => {
            const slotA = HOME_SLOT_POSITIONS[a.index % HOME_SLOT_POSITIONS.length]
            const slotB = HOME_SLOT_POSITIONS[b.index % HOME_SLOT_POSITIONS.length]
            return slotA.y - slotB.y || slotA.x - slotB.x
          })
          .map((token) => {
            const slot = HOME_SLOT_POSITIONS[token.index % HOME_SLOT_POSITIONS.length]
            const canMoveToken = !disabled && legalMoves.includes(token.id)

            return (
              <button
                key={`${color}-token-${token.id}`}
                type="button"
                className={
                  canMoveToken ? 'home-yard__token home-yard__token--movable' : 'home-yard__token'
                }
                style={{
                  left: `${slot.x}%`,
                  top: `${slot.y}%`,
                  // Lower slots (higher y) paint above upper ones when pins overlap.
                  zIndex: Math.round(slot.y),
                }}
                aria-label={`Move ${color} piece to start`}
                disabled={!canMoveToken}
                onClick={() => onSelect(token.id)}
              >
                <LudoToken
                  color={color}
                  paintHex={paintHex}
                  shape="pin"
                  variant="classic"
                  movable={canMoveToken}
                />
              </button>
            )
          })}
      </div>
    </div>
  )
}

function CenterFinish() {
  return (
    <svg className="center-finish" viewBox="0 0 100 100" aria-hidden="true">
      <polygon points="0,0 100,0 50,50" fill="var(--seat-green, #179949)" />
      <polygon points="100,0 100,100 50,50" fill="var(--seat-yellow, #e6bb00)" />
      <polygon points="0,100 100,100 50,50" fill="var(--seat-blue, #2d7ae8)" />
      <polygon points="0,0 0,100 50,50" fill="var(--seat-red, #ef2424)" />
    </svg>
  )
}

function App() {
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dieRolling, setDieRolling] = useState(false)
  const [rollingCorner, setRollingCorner] = useState<BoardCornerId | null>(null)
  const [dieFaces, setDieFaces] = useState<Record<PlayerColor, DieValue>>({
    red: 1,
    green: 1,
    yellow: 1,
    blue: 1,
    orange: 1,
    purple: 1,
  })
  const [error, setError] = useState<string | null>(null)
  const [setupStep, setSetupStep] = useState<SetupStep>('count')
  const [nameErrors, setNameErrors] = useState<string[]>([])
  const [hoppingToken, setHoppingToken] = useState<{
    tokenId: string
    color: PlayerColor
    paintHex: string
    path: BoardPercent[]
  } | null>(null)
  const [returningToken, setReturningToken] = useState<{
    tokenId: string
    color: PlayerColor
    paintHex: string
    path: BoardPercent[]
  } | null>(null)

  const [playerCount, setPlayerCount] = useState<SetupCount>(2)
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES)
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [endGameOpen, setEndGameOpen] = useState(false)
  const [newGameOpen, setNewGameOpen] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)
  const [withdrawPlayerId, setWithdrawPlayerId] = useState<string | null>(null)
  const [newGameCount, setNewGameCount] = useState<SetupCount>(4)
  const [autoRollByPlayerId, setAutoRollByPlayerId] = useState<Record<string, boolean>>({})
  const [autoPlayByPlayerId, setAutoPlayByPlayerId] = useState<Record<string, boolean>>({})
  const [soundVolume, setSoundVolume] = useState(() => getGameSoundVolume())
  const hoppingTokenRef = useRef<HTMLDivElement | null>(null)
  const returningTokenRef = useRef<HTMLDivElement | null>(null)
  const hopAbortRef = useRef<AbortController | null>(null)
  const gameRef = useRef<GameState | null>(null)
  const endSoundPlayedForRef = useRef<string | null>(null)
  const autoMovedKeyRef = useRef<string | null>(null)
  const autoRollKeyRef = useRef<string | null>(null)
  const handleMoveRef = useRef<(tokenId: string) => Promise<void>>(async () => {})
  const handleRollRef = useRef<() => Promise<GameState | null>>(async () => null)
  gameRef.current = game

  const motionHiddenTokenId = returningToken?.tokenId ?? hoppingToken?.tokenId ?? null

  useEffect(() => {
    setGame(loadGameLocal())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!game || loading) {
      return
    }
    const repaired = repairStuckTurn(game)
    if (repaired) {
      setBusy(false)
      setDieRolling(false)
      setHoppingToken(null)
      setReturningToken(null)
      setGame(repaired)
    }
  }, [game, loading])

  useEffect(() => {
    if (loading) {
      return
    }
    if (game) {
      saveGameLocal(game)
    } else {
      clearGameLocal()
    }
  }, [game, loading])

  useEffect(() => {
    if (
      game?.status === 'COMPLETED' &&
      (game.finishOrder?.length ?? 0) >= Math.max(1, game.players.length - 1)
    ) {
      setEndGameOpen(true)
      if (endSoundPlayedForRef.current !== game.gameId) {
        endSoundPlayedForRef.current = game.gameId
        unlockGameSounds()
        playGameEndSound()
      }
    }
  }, [game?.status, game?.finishOrder, game?.players.length, game?.gameId])

  useEffect(() => {
    return () => {
      hopAbortRef.current?.abort()
    }
  }, [])

  const currentPlayer = useMemo(() => {
    if (!game) {
      return null
    }

    return game.players[game.currentPlayerIndex] ?? null
  }, [game])

  const finishedCounts = useMemo(() => {
    const counts: Record<PlayerColor, number> = {
      red: 0,
      green: 0,
      yellow: 0,
      blue: 0,
      orange: 0,
      purple: 0,
    }

    if (!game) {
      return counts
    }

    const rules = getBoardRules(
      game.playerCount,
      game.players.map((player) => player.color),
    )

    for (const player of game.players) {
      counts[player.color] = player.tokens.filter((token) => token.progress >= rules.finishProgress).length
    }

    return counts
  }, [game])

  const radialSeatColorsKey = game?.players.map((player) => player.color).join(',') ?? ''
  const radialLayout = useMemo(() => {
    if (!game || !isRadialPlayerCount(game.playerCount)) {
      return null
    }
    return buildRadialBoardLayout(game.players.map((player) => player.color))
    // Geometry depends on seat colors / count, not turn or token motion.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- radialSeatColorsKey tracks color order
  }, [game?.playerCount, radialSeatColorsKey])

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

  const boardFinishProgress = useMemo(() => {
    if (!game) {
      return FINISH_PROGRESS
    }
    return getBoardRules(
      game.playerCount,
      game.players.map((player) => player.color),
    ).finishProgress
  }, [game])

  const boardTokenPlacements = useMemo(() => {
    if (!game) {
      return []
    }

    type RawPlacement = {
      playerColor: PlayerColor
      paintHex: string
      playerId: string
      token: TokenState
      row: number
      column: number
    }

    const raw: RawPlacement[] = []
    for (const player of game.players) {
      if (player.withdrawn) {
        continue
      }
      for (const token of player.tokens) {
        if (
          token.progress === -1 ||
          token.id === hoppingToken?.tokenId ||
          token.id === returningToken?.tokenId
        ) {
          continue
        }
        const coord = getTokenCoord(player.color, token)
        if (!coord) {
          continue
        }
        raw.push({
          playerColor: player.color,
          paintHex: resolvePlayerPaintHex(player),
          playerId: player.id,
          token,
          row: coord[0],
          column: coord[1],
        })
      }
    }

    const byCell = new Map<string, RawPlacement[]>()
    for (const item of raw) {
      const key = `${item.row}:${item.column}`
      const group = byCell.get(key)
      if (group) {
        group.push(item)
      } else {
        byCell.set(key, [item])
      }
    }

    const placements: Array<{
      playerColor: PlayerColor
      paintHex: string
      playerId: string
      token: TokenState
      row: number
      column: number
      stackIndex: number
      stackCount: number
      anchorPercent: number
      scale: number
    }> = []

    for (const group of byCell.values()) {
      group.sort((a, b) => {
        const colorDelta =
          COLOR_STACK_ORDER.indexOf(a.playerColor) - COLOR_STACK_ORDER.indexOf(b.playerColor)
        if (colorDelta !== 0) {
          return colorDelta
        }
        return a.token.index - b.token.index
      })

      const stackCount = group.length
      const anchors = stackAnchorPercents(stackCount)
      const scale = stackTokenScale(stackCount)

      group.forEach((item, stackIndex) => {
        placements.push({
          ...item,
          stackIndex,
          stackCount,
          anchorPercent: anchors[stackIndex] ?? 50,
          scale,
        })
      })
    }

    // Lower rows paint above upper rows when tall pins overlap across cells.
    placements.sort((a, b) => a.row - b.row || a.column - b.column || a.stackIndex - b.stackIndex)

    return placements
  }, [game, hoppingToken?.tokenId, returningToken?.tokenId])

  useEffect(() => {
    if (!game || dieRolling) {
      return
    }

    const face = asDieValue(game.pendingRoll)
    if (!face) {
      return
    }

    const owner = game.players.find((player) => player.id === game.currentPlayerId)
    if (!owner) {
      return
    }

    setDieFaces((previous) => {
      if (previous[owner.color] === face) {
        return previous
      }
      return { ...previous, [owner.color]: face }
    })
  }, [game, dieRolling])

  const finishPlaceByPlayerId = useMemo(() => {
    const places = new Map<string, number>()
    if (!game?.finishOrder) {
      return places
    }
    game.finishOrder.forEach((playerId, index) => {
      places.set(playerId, index + 1)
    })
    return places
  }, [game])

  const currentPlayerFinished =
    currentPlayer !== null &&
    (Boolean(currentPlayer.withdrawn) || finishPlaceByPlayerId.has(currentPlayer.id))

  const seatPaintStyle = useMemo(
    () => (game ? seatPaintCssVars(buildSeatPaintMap(game.players)) : undefined),
    [game],
  )

  const canRoll =
    game !== null &&
    !busy &&
    !dieRolling &&
    game.pendingRoll === null &&
    game.status !== 'COMPLETED' &&
    !currentPlayerFinished
  const canMove =
    game !== null &&
    !busy &&
    hoppingToken === null &&
    returningToken === null &&
    game.pendingRoll !== null &&
    game.legalMoves.length > 0 &&
    game.status !== 'COMPLETED' &&
    !currentPlayerFinished

  function validateSetupNames(selectedCount: SetupCount): string[] {
    const errors: string[] = []
    const seen = new Set<string>()
    for (let index = 0; index < selectedCount; index += 1) {
      const value = (names[index] ?? '').trim()
      const length = Array.from(value).length

      if (length < 1 || length > 24) {
        errors[index] = 'Name must be 1-24 characters.'
        continue
      }

      const key = value.toLocaleLowerCase()
      if (seen.has(key)) {
        errors[index] = 'Name must be unique.'
        continue
      }

      seen.add(key)
    }

    return errors
  }

  function handlePlayerCountChange(nextCount: SetupCount): void {
    setPlayerCount(nextCount)
    setError(null)
    setNameErrors([])
  }

  function handleContinueToNames(): void {
    setSetupStep('names')
    setError(null)
    setNameErrors([])
  }

  function handleBackToCount(): void {
    setSetupStep('count')
    setError(null)
    setNameErrors([])
  }

  function handleCreateGame(): void {
    const validationErrors = validateSetupNames(playerCount)
    if (validationErrors.some(Boolean)) {
      setNameErrors(validationErrors)
      setError('Please fix invalid player names before continuing.')
      return
    }

    setNameErrors([])
    setError(null)
    unlockGameSounds()
    const created = createLocalGame(playerCount, names.slice(0, playerCount))
    setGame(created)
    playGameStartSound()
  }

  function setPlayerDieFace(color: PlayerColor, face: DieValue | null | undefined): void {
    const nextFace = asDieValue(face)
    if (!nextFace) {
      return
    }
    setDieFaces((previous) => ({ ...previous, [color]: nextFace }))
  }

  async function performPlayerRoll(rolledByColor: PlayerColor, cornerId?: BoardCornerId): Promise<GameState> {
    const activeGame = gameRef.current
    if (!activeGame) {
      throw new Error('No active game.')
    }

    unlockGameSounds()
    const roll = rollDieLocally()
    const corner = cornerId ?? BOARD_CORNERS.find((entry) => entry.color === rolledByColor)?.id
    const updated = applyLocalRoll(activeGame, roll)

    setError(null)
    if (corner) {
      setRollingCorner(corner)
    }
    setDieRolling(true)
    playDiceRollSound()
    // Apply roll immediately so tokens are selectable during the spin (avoids "dead clicks" on a 6).
    setGame(updated)

    try {
      await wait(DIE_ROLL_ANIMATION_MS)
      setPlayerDieFace(rolledByColor, roll)
      if (updated.pendingRoll === null) {
        playTurnPassSound()
      }
      return updated
    } finally {
      setDieRolling(false)
      setRollingCorner(null)
    }
  }

  async function handleRoll(): Promise<GameState | null> {
    if (!game || !canRoll || !currentPlayer || dieRolling) {
      return null
    }

    try {
      return await performPlayerRoll(currentPlayer.color)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to roll dice.'
      setError(message)
      return null
    }
  }

  async function handleCornerDieRoll(corner: BoardCornerId): Promise<void> {
    if (!game || !canRoll || dieRolling) {
      return
    }

    const cornerColor = BOARD_CORNERS.find((entry) => entry.id === corner)?.color
    if (!cornerColor || currentPlayer?.color !== cornerColor) {
      return
    }

    const cornerPlayer = game.players.find((entry) => entry.color === cornerColor)
    if (!cornerPlayer || finishPlaceByPlayerId.has(cornerPlayer.id)) {
      return
    }

    try {
      await performPlayerRoll(cornerColor, corner)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to roll dice.'
      setError(message)
    }
  }

  async function handleMove(tokenId: string): Promise<void> {
    if (!game || !canMove || !game.legalMoves.includes(tokenId)) {
      return
    }

    const movingPlayer = game.players[game.currentPlayerIndex]
    const movingToken = movingPlayer?.tokens.find((token) => token.id === tokenId)
    if (!movingPlayer || !movingToken || game.pendingRoll === null) {
      return
    }

    // If the player clicked during the die spin, stop the spin UI right away.
    if (dieRolling) {
      setDieRolling(false)
      setRollingCorner(null)
      setPlayerDieFace(movingPlayer.color, asDieValue(game.pendingRoll))
    }

    const roll = game.pendingRoll
    const fromProgress = movingToken.progress
    const toProgress = fromProgress === -1 ? 0 : fromProgress + roll
    const path =
      radialLayout != null
        ? buildRadialMovePercentPath(
            radialLayout,
            movingPlayer.color,
            fromProgress,
            toProgress,
            movingToken.index,
          )
        : buildMovePercentPath(
            movingPlayer.color,
            fromProgress,
            toProgress,
            movingToken.index,
          )
    const motionAnchorY = 90

    const snapshot = game
    hopAbortRef.current?.abort()
    const hopAbort = new AbortController()
    hopAbortRef.current = hopAbort

    flushSync(() => {
      setError(null)
      setBusy(true)
      setReturningToken(null)
      if (path.length >= 2) {
        setHoppingToken({
          tokenId,
          color: movingPlayer.color,
          paintHex: resolvePlayerPaintHex(movingPlayer),
          path,
        })
      }
    })

    try {
      unlockGameSounds()
      if (fromProgress === -1) {
        playYardExitSound()
      }

      // flushSync commits DOM, but the hopping node ref can lag one frame.
      let hopElement = hoppingTokenRef.current
      if (!hopElement && path.length >= 2) {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve())
        })
        hopElement = hoppingTokenRef.current
      }

      if (hopElement && path.length >= 2 && !hopAbort.signal.aborted) {
        await animateTokenHops(hopElement, path, {
          signal: hopAbort.signal,
          anchorYPercent: motionAnchorY,
          onHopStart: (hopIndex) => {
            playHopSound(hopIndex)
          },
        })
      }

      if (hopAbort.signal.aborted) {
        setHoppingToken(null)
        setReturningToken(null)
        setBusy(false)
        return
      }

      const updated = applyLocalMove(snapshot, tokenId)
      const capturedIds = updated.lastMove?.capturedTokenIds ?? []
      const movedToFinish = (updated.lastMove?.to ?? -1) >= boardFinishProgress
      const placeIndex = updated.finishOrder?.indexOf(movingPlayer.id) ?? -1
      const newlyFinished =
        placeIndex >= 0 && !(snapshot.finishOrder ?? []).includes(movingPlayer.id)

      if (newlyFinished) {
        playPlayerWinSound(placeIndex + 1)
      } else if (movedToFinish) {
        playTokenFinishSound()
      }

      for (const capturedId of capturedIds) {
        if (hopAbort.signal.aborted) {
          break
        }

        let capturedColor: PlayerColor | null = null
        let capturedPaintHex = '#2d7ae8'
        let capturedProgress = -1
        let capturedIndex = 0
        for (const player of snapshot.players) {
          const token = player.tokens.find((entry) => entry.id === capturedId)
          if (token) {
            capturedColor = player.color
            capturedPaintHex = resolvePlayerPaintHex(player)
            capturedProgress = token.progress
            capturedIndex = token.index
            break
          }
        }

        if (!capturedColor || capturedProgress < 0) {
          continue
        }

        const returnPath =
          radialLayout != null
            ? buildRadialCaptureReturnPercentPath(
                radialLayout,
                capturedColor,
                capturedProgress,
                capturedIndex,
              )
            : buildCaptureReturnPercentPath(
                capturedColor,
                capturedProgress,
                capturedIndex,
              )

        if (returnPath.length < 2) {
          continue
        }

        playCaptureHitSound()

        flushSync(() => {
          setReturningToken({
            tokenId: capturedId,
            color: capturedColor,
            paintHex: capturedPaintHex,
            path: returnPath,
          })
        })

        const returnElement = returningTokenRef.current
        if (returnElement && !hopAbort.signal.aborted) {
          await animateTokenSlide(returnElement, returnPath, {
            signal: hopAbort.signal,
            anchorYPercent: motionAnchorY,
            onStart: (durationMs) => {
              playCaptureTravelSound(durationMs / 1000)
            },
            onComplete: () => {
              playCaptureHomeSound()
            },
          })
        }
      }

      if (hopAbort.signal.aborted) {
        setHoppingToken(null)
        setReturningToken(null)
        setBusy(false)
        return
      }

      if (
        updated.status !== 'COMPLETED' &&
        updated.currentPlayerId === movingPlayer.id &&
        !newlyFinished
      ) {
        playExtraTurnSound()
      }

      flushSync(() => {
        setHoppingToken(null)
        setReturningToken(null)
        setGame(updated)
        setBusy(false)
      })
    } catch (requestError) {
      hopAbort.abort()
      const message = requestError instanceof Error ? requestError.message : 'Failed to move token.'
      setHoppingToken(null)
      setReturningToken(null)
      setGame(snapshot)
      setBusy(false)
      setError(message)
    } finally {
      setHoppingToken(null)
      setReturningToken(null)
      if (hopAbortRef.current === hopAbort) {
        hopAbortRef.current = null
      }
    }
  }

  handleMoveRef.current = handleMove

  // Auto-move: single legal move always; auto-play also picks a random move.
  useEffect(() => {
    if (!game || loading || busy || dieRolling) {
      return
    }
    if (hoppingToken || returningToken) {
      return
    }
    if (game.status === 'COMPLETED' || game.pendingRoll === null) {
      return
    }
    if (game.legalMoves.length === 0) {
      return
    }

    const mover = game.players[game.currentPlayerIndex]
    if (!mover || mover.withdrawn) {
      return
    }
    const isAutoPlay = Boolean(autoPlayByPlayerId[mover.id])
    if (game.legalMoves.length !== 1 && !isAutoPlay) {
      return
    }

    const moveKey = `${game.gameId}:${game.revision}`
    if (autoMovedKeyRef.current === moveKey) {
      return
    }

    autoMovedKeyRef.current = moveKey
    const soleMove = game.legalMoves.length === 1 ? game.legalMoves[0] : null
    const moveChoices = game.legalMoves

    const timer = window.setTimeout(
      () => {
        const tokenId =
          soleMove ?? moveChoices[Math.floor(Math.random() * moveChoices.length)]
        if (!tokenId) {
          return
        }
        void handleMoveRef.current(tokenId)
      },
      isAutoPlay ? 420 : 0,
    )

    return () => window.clearTimeout(timer)
  }, [game, loading, busy, dieRolling, hoppingToken, returningToken, autoPlayByPlayerId])

  handleRollRef.current = handleRoll

  // Auto-roll (die only) or auto-play (roll + move) — both roll when it's time.
  useEffect(() => {
    if (!game || loading || !canRoll || dieRolling || busy) {
      return
    }
    if (hoppingToken || returningToken) {
      return
    }
    if (!currentPlayer || currentPlayer.withdrawn) {
      return
    }
    const shouldAutoRoll =
      Boolean(autoRollByPlayerId[currentPlayer.id]) || Boolean(autoPlayByPlayerId[currentPlayer.id])
    if (!shouldAutoRoll) {
      return
    }

    const rollKey = `${game.gameId}:${game.revision}:${currentPlayer.id}`
    if (autoRollKeyRef.current === rollKey) {
      return
    }

    const timer = window.setTimeout(() => {
      autoRollKeyRef.current = rollKey
      void handleRollRef.current()
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    game,
    loading,
    canRoll,
    dieRolling,
    busy,
    hoppingToken,
    returningToken,
    currentPlayer,
    autoRollByPlayerId,
    autoPlayByPlayerId,
  ])

  function handleToggleAutoRoll(playerId: string, enabled: boolean): void {
    setAutoRollByPlayerId((prev) => ({ ...prev, [playerId]: enabled }))
  }

  function handleToggleAutoPlay(playerId: string, enabled: boolean): void {
    setAutoPlayByPlayerId((prev) => ({ ...prev, [playerId]: enabled }))
  }

  function handleWithdrawPlayerRequest(playerId: string): void {
    setWithdrawPlayerId(playerId)
  }

  function handleConfirmWithdrawPlayer(): void {
    if (!game || !withdrawPlayerId) {
      return
    }

    try {
      hopAbortRef.current?.abort()
      hopAbortRef.current = null
      setHoppingToken(null)
      setReturningToken(null)
      setBusy(false)
      const next = withdrawPlayer(game, withdrawPlayerId)
      setGame(next)
      saveGameLocal(next)
      setAutoRollByPlayerId((prev) => {
        const updated = { ...prev }
        delete updated[withdrawPlayerId]
        return updated
      })
      setAutoPlayByPlayerId((prev) => {
        const updated = { ...prev }
        delete updated[withdrawPlayerId]
        return updated
      })
      setWithdrawPlayerId(null)
      setError(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to remove player.'
      setError(message)
      setWithdrawPlayerId(null)
    }
  }

  function handleForceFinishPlayer(playerId: string): void {
    if (!game) {
      return
    }

    try {
      hopAbortRef.current?.abort()
      hopAbortRef.current = null
      setHoppingToken(null)
      setReturningToken(null)
      setBusy(false)
      setDieRolling(false)
      const next = forceFinishPlayer(game, playerId)
      setGame(next)
      saveGameLocal(next)
      unlockGameSounds()
      playPlayerWinSound()
      setError(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to force finish.'
      setError(message)
    }
  }

  function handleForceEndGame(): void {
    if (!game) {
      return
    }

    try {
      hopAbortRef.current?.abort()
      hopAbortRef.current = null
      setHoppingToken(null)
      setReturningToken(null)
      setBusy(false)
      setDieRolling(false)
      const next = forceEndGame(game)
      setGame(next)
      saveGameLocal(next)
      unlockGameSounds()
      setError(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to force end game.'
      setError(message)
    }
  }

  function handleChangePlayerPaint(playerId: string, paintHex: string): void {
    if (!game) {
      return
    }

    try {
      const next = setPlayerPaintHex(game, playerId, paintHex)
      setGame(next)
      saveGameLocal(next)
      setError(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to change color.'
      setError(message)
    }
  }

  function handleChangePlayerName(playerId: string, name: string): void {
    if (!game) {
      return
    }

    try {
      const next = setPlayerName(game, playerId, name)
      setGame(next)
      saveGameLocal(next)
      setError(null)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to change name.'
      setError(message)
    }
  }

  const endGameStandings = useMemo(() => {
    if (!game?.finishOrder?.length) {
      return []
    }
    const lastIndex = game.finishOrder.length - 1
    return game.finishOrder.map((playerId, index) => {
      const player = game.players.find((entry) => entry.id === playerId)
      const place = index + 1
      const isLoser = index === lastIndex && game.status === 'COMPLETED'
      return {
        id: playerId,
        name: player?.name ?? 'Player',
        color: player?.color ?? 'blue',
        place,
        isLoser,
      }
    })
  }, [game])

  function clearMatchMotionState(): void {
    hopAbortRef.current?.abort()
    hopAbortRef.current = null
    setHoppingToken(null)
    setReturningToken(null)
    setBusy(false)
    setDieRolling(false)
    setRollingCorner(null)
    setMenuOpen(false)
    setEndGameOpen(false)
    setAutoRollByPlayerId({})
    setAutoPlayByPlayerId({})
    endSoundPlayedForRef.current = null
    autoRollKeyRef.current = null
    autoMovedKeyRef.current = null
    setError(null)
    setNameErrors([])
  }

  function startMatch(count: SetupCount, playerNames: string[]): void {
    clearMatchMotionState()
    unlockGameSounds()
    const nextNames = [...DEFAULT_NAMES]
    for (let index = 0; index < count; index += 1) {
      nextNames[index] = playerNames[index]?.trim() || DEFAULT_NAMES[index]
    }
    setPlayerCount(count)
    setNames(nextNames)
    setSetupStep('count')
    const created = createLocalGame(count, nextNames.slice(0, count))
    setGame(created)
    playGameStartSound()
    setNewGameOpen(false)
    setRestartOpen(false)
  }

  function handleOpenNewGame(): void {
    setNewGameCount((game?.playerCount as SetupCount | undefined) ?? playerCount)
    setNewGameOpen(true)
  }

  function handleConfirmNewGame(): void {
    startMatch(newGameCount, DEFAULT_NAMES.slice(0, newGameCount))
  }

  function handleConfirmRestart(): void {
    if (!game) {
      return
    }
    startMatch(
      game.playerCount as SetupCount,
      game.players.map((player) => player.name),
    )
  }

  function updateName(index: number, nextValue: string): void {
    setError(null)
    setNameErrors((prev) => {
      if (!prev[index]) {
        return prev
      }

      const next = [...prev]
      next[index] = ''
      return next
    })
    setNames((prev) => {
      const updated = [...prev]
      updated[index] = nextValue
      return updated
    })
  }

  return (
    <LudoPageShell playing={Boolean(game)} seatPaintStyle={seatPaintStyle}>
      <LudoSessionHeader
        showNewSession={Boolean(game)}
        onNewSession={handleOpenNewGame}
      />

      {loading ? <LudoLoadingPanel /> : null}

      {!loading && !game ? (
        <LudoSetupPanel
          setupStep={setupStep}
          playerCount={playerCount}
          names={names}
          nameErrors={nameErrors}
          editingNameIndex={editingNameIndex}
          error={error}
          colorsForCount={COLORS_BY_PLAYER_COUNT[playerCount]}
          onPlayerCountChange={handlePlayerCountChange}
          onContinueToNames={handleContinueToNames}
          onBackToCount={handleBackToCount}
          onCreateGame={handleCreateGame}
          onUpdateName={updateName}
          onStartEditName={setEditingNameIndex}
          onStopEditName={() => setEditingNameIndex(null)}
        />
      ) : null}

      {!loading && game ? (
        <LudoMatchLayout
          game={game}
          currentPlayerName={currentPlayer?.name ?? '-'}
          canRoll={canRoll}
          soundVolume={soundVolume}
          finishPlaceByPlayerId={finishPlaceByPlayerId}
          finishedCounts={finishedCounts}
          error={error}
          menuOpen={menuOpen}
          autoRollByPlayerId={autoRollByPlayerId}
          autoPlayByPlayerId={autoPlayByPlayerId}
          onMenuOpen={() => setMenuOpen(true)}
          onMenuClose={() => setMenuOpen(false)}
          onRoll={() => void handleRoll()}
          onSoundVolumeChange={(next) => {
            unlockGameSounds()
            setSoundVolume(next)
            setGameSoundVolume(next)
          }}
          onRestart={() => setRestartOpen(true)}
          onNewGame={handleOpenNewGame}
          onToggleAutoRoll={handleToggleAutoRoll}
          onToggleAutoPlay={handleToggleAutoPlay}
          onWithdrawPlayer={handleWithdrawPlayerRequest}
          onForceFinishPlayer={handleForceFinishPlayer}
          onForceEndGame={handleForceEndGame}
          onChangePlayerPaint={handleChangePlayerPaint}
          onChangePlayerName={handleChangePlayerName}
          board={
          <LudoBoardSurface seatPaintStyle={seatPaintStyle} animPaused={pageHidden}>
              {isRadialPlayerCount(game.playerCount) ? (
                <RadialBoard
                  game={game}
                  currentPlayerId={currentPlayer?.id ?? null}
                  dieValue={currentPlayer ? dieFaces[currentPlayer.color] : 1}
                  dieRolling={dieRolling}
                  canRoll={canRoll}
                  legalMoveIds={new Set(canMove ? game.legalMoves : [])}
                  hoppingToken={hoppingToken}
                  returningToken={returningToken}
                  hoppingTokenRef={hoppingTokenRef}
                  returningTokenRef={returningTokenRef}
                  finishPlaceByPlayerId={finishPlaceByPlayerId}
                  onRoll={() => void handleRoll()}
                  onSelectToken={(tokenId) => void handleMove(tokenId)}
                />
              ) : (
                <>
              {BOARD_CORNERS.map((corner) => (
                (() => {
                  const cornerPlayerIndex = game.players.findIndex((entry) => entry.color === corner.color)
                  const cornerPlayer = cornerPlayerIndex >= 0 ? game.players[cornerPlayerIndex] : null
                  const isCurrentCorner = cornerPlayer?.id === currentPlayer?.id
                  const cornerFinished = cornerPlayer
                    ? finishPlaceByPlayerId.has(cornerPlayer.id)
                    : false
                  const profileName = cornerPlayer
                    ? cornerPlayer.name.trim() || `Player ${cornerPlayerIndex + 1}`
                    : ''
                  const capturesMade = safeStatCount(cornerPlayer?.capturesMade)
                  const timesCaptured = safeStatCount(cornerPlayer?.timesCaptured)
                  const progressScore = cornerPlayer
                    ? averageProgressScore(cornerPlayer, game.players, game.playerCount)
                    : 0

                  return (
                    <CornerDie
                      key={corner.id}
                      value={dieFaces[corner.color]}
                      rolling={dieRolling && rollingCorner === corner.id}
                      disabled={!canRoll || dieRolling || !isCurrentCorner || cornerFinished}
                      corner={corner.id}
                      color={corner.color}
                      profileName={profileName}
                      highlighted={isCurrentCorner && !cornerFinished}
                      turnActive={
                        isCurrentCorner &&
                        !cornerFinished &&
                        game.pendingRoll === null &&
                        !dieRolling &&
                        game.status !== 'COMPLETED'
                      }
                      capturesMade={capturesMade}
                      timesCaptured={timesCaptured}
                      progressScore={progressScore}
                      onRoll={() => void handleCornerDieRoll(corner.id)}
                    />
                  )
                })()
              ))}

              <div className="board-grid">
                {BOARD_CELLS.map((cell) => {
                  const cellClassName = ['cell', `cell--${cell.type}`]

                  if (cell.color && cell.marker !== 'home-entry') {
                    cellClassName.push(`cell--${cell.color}`)
                  }

                  return (
                    <div
                      key={cell.id}
                      className={cellClassName.join(' ')}
                      style={toCssGrid(cell.row, cell.column)}
                      aria-label={cell.ariaLabel}
                    >
                      {cell.marker === 'star' ? (
                        <span className="safe-star" aria-hidden="true">
                          <svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
                            <polygon points="50,6 61,35 92,35 67,53 76,84 50,66 24,84 33,53 8,35 39,35" />
                          </svg>
                        </span>
                      ) : null}
                      {cell.marker === 'home-entry' && cell.direction ? (
                        <span className="home-entry-marker" aria-hidden="true">
                          {cell.color ? <HomeEntryArrow direction={cell.direction} color={cell.color} /> : null}
                        </span>
                      ) : null}
                    </div>
                  )
                })}
                {HOME_YARD_ORDER.map((color) => {
                  const yardPlayer = game.players.find((entry) => entry.color === color)
                  const finishPlace = yardPlayer ? finishPlaceByPlayerId.get(yardPlayer.id) : undefined
                  return (
                    <HomeYardOverlay
                      key={color}
                      color={color}
                      active={
                        !finishPlace &&
                        currentPlayer?.color === color &&
                        game.pendingRoll === null &&
                        !dieRolling &&
                        game.status !== 'COMPLETED'
                      }
                    />
                  )
                })}
                <CenterFinish />
                <div className="board-token-layer">
                  {boardTokenPlacements.map((placement) => {
                    const isActivePlayer = currentPlayer?.id === placement.playerId
                    const tokenCanMove =
                      canMove && isActivePlayer && game.legalMoves.includes(placement.token.id)
                    const display = stackDisplayForToken(
                      placement.stackCount,
                      placement.stackIndex,
                      tokenCanMove,
                    )

                    return (
                      <button
                        key={placement.token.id}
                        type="button"
                        className={
                          tokenCanMove
                            ? 'board-token-piece board-token-piece--movable'
                            : 'board-token-piece'
                        }
                        style={{
                          gridRow: placement.row + 1,
                          gridColumn: placement.column + 1,
                          // Lower board rows (and later stack peers) paint above upper tokens.
                          // Selectable tokens rise above the rest of the stack while choosing.
                          zIndex: 100 + placement.row * 20 + placement.stackIndex + (tokenCanMove ? 40 : 0),
                          ['--token-scale' as string]: String(display.scale),
                          ['--stack-anchor' as string]: `${display.anchorPercent}%`,
                        }}
                        aria-label={`Move ${placement.playerColor} piece`}
                        disabled={!tokenCanMove}
                        onClick={() => void handleMove(placement.token.id)}
                      >
                        <LudoToken
                          color={placement.playerColor}
                          paintHex={placement.paintHex}
                          shape="pin"
                          variant="classic"
                          movable={tokenCanMove}
                        />
                      </button>
                    )
                  })}
                </div>
                {HOME_YARD_ORDER.map((color) => {
                  const player = game.players.find((entry) => entry.color === color)
                  const isActivePlayer = currentPlayer?.color === color
                  const finishPlace = player ? finishPlaceByPlayerId.get(player.id) : undefined
                  if (player?.withdrawn) {
                    return null
                  }
                  if (finishPlace && game.status !== 'COMPLETED') {
                    return (
                      <HomeYardFinishBanner
                        key={`${color}-finish`}
                        color={color}
                        name={player?.name ?? color}
                        place={finishPlace}
                      />
                    )
                  }
                  return (
                    <HomeYardTokens
                      key={`${color}-tokens`}
                      color={color}
                      paintHex={
                        player ? resolvePlayerPaintHex(player) : resolvePlayerPaintHex({ color })
                      }
                      tokens={player?.tokens ?? []}
                      legalMoves={isActivePlayer ? game.legalMoves : []}
                      disabled={!canMove || !isActivePlayer}
                      hiddenTokenId={motionHiddenTokenId}
                      onSelect={(tokenId) => void handleMove(tokenId)}
                    />
                  )
                })}
                {hoppingToken ? (
                  <div className="board-hop-layer" aria-hidden="true">
                    <div
                      ref={hoppingTokenRef}
                      className="board-hopping-token"
                      style={{
                        left: `${hoppingToken.path[0].left}%`,
                        top: `${hoppingToken.path[0].top}%`,
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
                  <div className="board-hop-layer" aria-hidden="true">
                    <div
                      ref={returningTokenRef}
                      className="board-hopping-token board-returning-token"
                      style={{
                        left: `${returningToken.path[0].left}%`,
                        top: `${returningToken.path[0].top}%`,
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
                </>
              )}
          </LudoBoardSurface>
          }
        />
      ) : null}

      {game && endGameOpen && game.status === 'COMPLETED' && endGameStandings.length > 0 ? (
        <EndGameCelebration
          standings={endGameStandings}
          onRestart={() => setRestartOpen(true)}
          onClose={() => setEndGameOpen(false)}
        />
      ) : null}

      <LudoNewGameDialog
        open={newGameOpen}
        playerCount={newGameCount}
        onPlayerCountChange={setNewGameCount}
        onClose={() => setNewGameOpen(false)}
        onConfirm={handleConfirmNewGame}
      />

      <LudoRestartDialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onConfirm={handleConfirmRestart}
      />

      <LudoWithdrawPlayerDialog
        open={Boolean(withdrawPlayerId)}
        playerName={
          game?.players.find((player) => player.id === withdrawPlayerId)?.name?.trim() || 'this player'
        }
        onClose={() => setWithdrawPlayerId(null)}
        onConfirm={handleConfirmWithdrawPlayer}
      />
    </LudoPageShell>
  )
}

export default App
