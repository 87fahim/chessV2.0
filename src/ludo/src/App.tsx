import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  applyLocalMove,
  applyLocalRoll,
  clearGameLocal,
  createLocalGame,
  loadGameLocal,
  repairStuckTurn,
  saveGameLocal,
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
import { BOARD_CELLS, FINISH_PROGRESS, HOME_SLOT_POSITIONS, HOME_YARDS, getTokenCoord } from './boardLayout'
import { COLOR_STACK_ORDER, stackAnchorPercents, stackTokenScale } from './boardStacking'
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
import { animateTokenHops, animateTokenSlide, buildCaptureReturnPercentPath, buildMovePercentPath, type BoardPercent } from './tokenMotion'
import type { GameState, PlayerColor, TokenState } from './types'
import './App.css'

type SetupCount = 2 | 3 | 4
type SetupStep = 'count' | 'names'

const COLOR_CLASS_BY_COLOR: Record<PlayerColor, string> = {
  red: 'red',
  green: 'green',
  yellow: 'yellow',
  blue: 'blue',
}

const COLORS_BY_PLAYER_COUNT: Record<SetupCount, PlayerColor[]> = {
  2: ['blue', 'green'],
  3: ['blue', 'red', 'green'],
  4: ['blue', 'red', 'green', 'yellow'],
}

const DEFAULT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4']

const HOME_YARD_ORDER: PlayerColor[] = ['red', 'green', 'blue', 'yellow']

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
  shortLabel,
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
  shortLabel: string
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
      <div className="corner-die-player">
        <div
          className={
            highlighted
              ? `corner-die-profile corner-die-profile--active corner-die-profile--${color}`
              : `corner-die-profile corner-die-profile--${color}`
          }
          title={profileName}
          aria-label={profileName}
        >
          <span className="corner-die-profile__name">{shortLabel}</span>
        </div>
        <div
          className="corner-die-stats"
          aria-label={`${profileName} stats: captured ${capturesMade}, was captured ${timesCaptured}, progress ${progressScore}%`}
        >
          <span title="Pieces captured">C {capturesMade}</span>
          <span title="Pieces lost">L {timesCaptured}</span>
          <span title="Average progress (exact-finish, home-yard, and behind-threat adjusted)">
            S {progressScore}%
          </span>
        </div>
      </div>

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
  color: PlayerColor
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
        <p className="home-yard-finish__name">{name}</p>
        <p className="home-yard-finish__place">#{place}</p>
        <p className="home-yard-finish__title">{finishPlaceTitle(place)}</p>
      </div>
    </div>
  )
}

function HomeYardOverlay({ color, active }: { color: PlayerColor; active: boolean }) {
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
  tokens,
  legalMoves,
  disabled,
  hiddenTokenId,
  onSelect,
}: {
  color: PlayerColor
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
                }}
                aria-label={`Move ${color} piece to start`}
                disabled={!canMoveToken}
                onClick={() => onSelect(token.id)}
              >
                <LudoToken
                  color={color}
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
      <polygon points="0,0 100,0 50,50" fill="#179949" />
      <polygon points="100,0 100,100 50,50" fill="#e6bb00" />
      <polygon points="0,100 100,100 50,50" fill="#2d7ae8" />
      <polygon points="0,0 0,100 50,50" fill="#ef2424" />
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
  })
  const [error, setError] = useState<string | null>(null)
  const [setupStep, setSetupStep] = useState<SetupStep>('count')
  const [nameErrors, setNameErrors] = useState<string[]>([])
  const [hoppingToken, setHoppingToken] = useState<{
    tokenId: string
    color: PlayerColor
    path: BoardPercent[]
  } | null>(null)
  const [returningToken, setReturningToken] = useState<{
    tokenId: string
    color: PlayerColor
    path: BoardPercent[]
  } | null>(null)

  const [playerCount, setPlayerCount] = useState<SetupCount>(2)
  const [names, setNames] = useState<string[]>(DEFAULT_NAMES)
  const [editingNameIndex, setEditingNameIndex] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [endGameOpen, setEndGameOpen] = useState(false)
  const [soundVolume, setSoundVolume] = useState(() => getGameSoundVolume())
  const hoppingTokenRef = useRef<HTMLDivElement | null>(null)
  const returningTokenRef = useRef<HTMLDivElement | null>(null)
  const hopAbortRef = useRef<AbortController | null>(null)
  const gameRef = useRef<GameState | null>(null)
  const endSoundPlayedForRef = useRef<string | null>(null)
  const autoMovedKeyRef = useRef<string | null>(null)
  const handleMoveRef = useRef<(tokenId: string) => Promise<void>>(async () => {})
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
    }

    if (!game) {
      return counts
    }

    for (const player of game.players) {
      counts[player.color] = player.tokens.filter((token) => token.progress >= FINISH_PROGRESS).length
    }

    return counts
  }, [game])

  const boardTokenPlacements = useMemo(() => {
    if (!game) {
      return []
    }

    type RawPlacement = {
      playerColor: PlayerColor
      playerId: string
      token: TokenState
      row: number
      column: number
    }

    const raw: RawPlacement[] = []
    for (const player of game.players) {
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
    currentPlayer !== null && finishPlaceByPlayerId.has(currentPlayer.id)

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
    const path = buildMovePercentPath(
      movingPlayer.color,
      fromProgress,
      toProgress,
      movingToken.index,
    )

    const snapshot = game
    hopAbortRef.current?.abort()
    const hopAbort = new AbortController()
    hopAbortRef.current = hopAbort

    flushSync(() => {
      setError(null)
      setBusy(true)
      setReturningToken(null)
      if (path.length >= 2) {
        setHoppingToken({ tokenId, color: movingPlayer.color, path })
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
      const movedToFinish = (updated.lastMove?.to ?? -1) >= FINISH_PROGRESS
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
        let capturedProgress = -1
        let capturedIndex = 0
        for (const player of snapshot.players) {
          const token = player.tokens.find((entry) => entry.id === capturedId)
          if (token) {
            capturedColor = player.color
            capturedProgress = token.progress
            capturedIndex = token.index
            break
          }
        }

        if (!capturedColor || capturedProgress < 0) {
          continue
        }

        const returnPath = buildCaptureReturnPercentPath(
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
            path: returnPath,
          })
        })

        const returnElement = returningTokenRef.current
        if (returnElement && !hopAbort.signal.aborted) {
          await animateTokenSlide(returnElement, returnPath, {
            signal: hopAbort.signal,
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

  // Only one legal move — play it automatically (no token click needed).
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
    if (game.legalMoves.length !== 1) {
      return
    }

    const moveKey = `${game.gameId}:${game.revision}`
    if (autoMovedKeyRef.current === moveKey) {
      return
    }

    autoMovedKeyRef.current = moveKey
    const tokenId = game.legalMoves[0]
    void handleMoveRef.current(tokenId)
  }, [game, loading, busy, dieRolling, hoppingToken, returningToken])

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

  function handleResetSession(): void {
    hopAbortRef.current?.abort()
    hopAbortRef.current = null
    setHoppingToken(null)
    setReturningToken(null)
    setBusy(false)
    setMenuOpen(false)
    setEndGameOpen(false)
    endSoundPlayedForRef.current = null
    clearGameLocal()
    setGame(null)
    setError(null)
    setNameErrors([])
    setSetupStep('count')
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
    <main className={game ? 'app-shell app-shell--playing' : 'app-shell'}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ludo Online</p>
          <div className="title-group">
            {currentPlayer ? (
              <span
                className={`title-player-dot title-player-dot--${currentPlayer.color}`}
                aria-label={`Current player: ${currentPlayer.name}`}
              />
            ) : null}
            <h1>Production Session Board</h1>
          </div>
          <p className="subtitle">Backend-authoritative state, autosave on every accepted command</p>
          <div className="token-preview" aria-label="Token preview">
            <LudoToken color="red" variant="classic" size={32} />
            <LudoToken color="green" variant="flat" size={32} />
            <LudoToken color="blue" variant="glass" size={32} />
            <LudoToken color="yellow" variant="classic" selected size={32} />
          </div>
        </div>
        {game ? (
          <button type="button" className="ghost topbar__new-session" onClick={handleResetSession}>
            New Session
          </button>
        ) : null}
      </header>

      {loading ? (
        <section className="panel loading-panel">
          <div className="loading-dot" />
          <p>Checking for an active anonymous session...</p>
        </section>
      ) : null}

      {!loading && !game ? (
        <section className="panel setup-panel">
          <h2>Create New Game</h2>
          <p className="setup-copy">Set player count, edit names, then confirm.</p>

          {setupStep === 'count' ? (
            <>
              <h3>How many players?</h3>
              <div className="count-grid" role="radiogroup" aria-label="Player count">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={count === playerCount ? 'count-button active' : 'count-button'}
                    onClick={() => handlePlayerCountChange(count as SetupCount)}
                    aria-pressed={count === playerCount}
                  >
                    {count} Players
                  </button>
                ))}
              </div>
              <button type="button" className="primary" onClick={handleContinueToNames}>
                Continue
              </button>
            </>
          ) : (
            <>
              <h3>Player Names</h3>
              <p className="setup-copy">Double click a name to edit. Press Enter to save.</p>

              <div className="name-list">
                {names.slice(0, playerCount).map((name, index) => {
                  const color = COLORS_BY_PLAYER_COUNT[playerCount][index]
                  const isEditing = editingNameIndex === index
                  const colorClass = COLOR_CLASS_BY_COLOR[color]

                  return (
                    <div key={color} className={`name-row ${colorClass}`}>
                      <span className="badge">{color}</span>
                      <div className="name-editor-wrap">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={name}
                            onChange={(event) => updateName(index, event.target.value)}
                            onBlur={() => setEditingNameIndex(null)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === 'Escape') {
                                setEditingNameIndex(null)
                              }
                            }}
                            aria-label={`Edit name for player ${index + 1}`}
                          />
                        ) : (
                          <button
                            type="button"
                            className="name-button"
                            onDoubleClick={() => setEditingNameIndex(index)}
                            onClick={() => setEditingNameIndex(index)}
                          >
                            {name || `Player ${index + 1}`}
                          </button>
                        )}
                        {nameErrors[index] ? <p className="field-error">{nameErrors[index]}</p> : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="setup-actions">
                <button type="button" className="ghost" onClick={handleBackToCount}>
                  Back
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleCreateGame}
                >
                  OK, Start Game
                </button>
              </div>
            </>
          )}

          {error ? <p className="error">{error}</p> : null}
        </section>
      ) : null}

      {!loading && game ? (
        <section className="game-layout">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span className="menu-toggle__bar" />
            <span className="menu-toggle__bar" />
            <span className="menu-toggle__bar" />
          </button>

          {menuOpen ? (
            <button
              type="button"
              className="menu-backdrop"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
          ) : null}

          <aside className={menuOpen ? 'panel hud hud--open' : 'panel hud'} id="match-control-menu">
            <div className="hud__header">
              <h2>Match Control</h2>
              <button
                type="button"
                className="hud__close"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="meta">Session ID: {game.id.slice(0, 8)}</p>
            <p className="turn-text">
              Turn: <strong>{currentPlayer?.name ?? '-'}</strong>
            </p>
            <p className="turn-text">
              Dice: <strong>{game.pendingRoll ?? game.lastDiceRoll ?? '-'}</strong>
            </p>

            <button
              type="button"
              className="primary"
              onClick={() => void handleRoll()}
              disabled={!canRoll}
            >
              Roll Dice
            </button>

            <label className="sound-control">
              <span className="sound-control__label">Sound</span>
              <input
                type="range"
                className="sound-control__slider"
                min={0}
                max={100}
                step={1}
                value={Math.round(soundVolume * 100)}
                aria-label="Sound volume"
                onChange={(event) => {
                  unlockGameSounds()
                  const next = Number(event.target.value) / 100
                  setSoundVolume(next)
                  setGameSoundVolume(next)
                }}
              />
              <span className="sound-control__value">{Math.round(soundVolume * 100)}%</span>
            </label>

            <p className="message">{game.message}</p>

            {game.finishOrder?.length ? (
              <p className="winner">
                {game.status === 'COMPLETED' ? 'Final standings' : 'Finished'}:{' '}
                {game.finishOrder
                  .map((playerId, index) => {
                    const player = game.players.find((entry) => entry.id === playerId)
                    return player ? `#${index + 1} ${player.name}` : null
                  })
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}

            <h3>Progress</h3>
            <div className="score-list">
              {game.players.map((player) => {
                const colorClass = COLOR_CLASS_BY_COLOR[player.color]
                const place = finishPlaceByPlayerId.get(player.id)
                return (
                  <div key={player.id} className={`score-row ${colorClass}`}>
                    <span>{player.name}</span>
                    <span>
                      {place ? `#${place}` : `${finishedCounts[player.color]}/4 home`}
                    </span>
                  </div>
                )
              })}
            </div>

            <button type="button" className="ghost hud__new-session" onClick={handleResetSession}>
              New Session
            </button>

            {error ? <p className="error">{error}</p> : null}
          </aside>

          <section className="board-wrap" aria-label="Ludo board">
            <div className="board-frame">
              {BOARD_CORNERS.map((corner) => (
                (() => {
                  const cornerPlayerIndex = game.players.findIndex((entry) => entry.color === corner.color)
                  const cornerPlayer = cornerPlayerIndex >= 0 ? game.players[cornerPlayerIndex] : null
                  const isCurrentCorner = cornerPlayer?.id === currentPlayer?.id
                  const cornerFinished = cornerPlayer
                    ? finishPlaceByPlayerId.has(cornerPlayer.id)
                    : false
                  const profileName = cornerPlayer?.name ?? `${corner.color.toUpperCase()} Seat`
                  const shortLabel = cornerPlayer ? `P${cornerPlayerIndex + 1}` : '—'
                  const capturesMade = safeStatCount(cornerPlayer?.capturesMade)
                  const timesCaptured = safeStatCount(cornerPlayer?.timesCaptured)
                  const progressScore = cornerPlayer
                    ? averageProgressScore(cornerPlayer, game.players)
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
                      shortLabel={shortLabel}
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
                          zIndex: 100 + placement.row * 10 + placement.stackIndex,
                          ['--token-scale' as string]: String(placement.scale),
                          ['--stack-anchor' as string]: `${placement.anchorPercent}%`,
                        }}
                        aria-label={`Move ${placement.playerColor} piece`}
                        disabled={!tokenCanMove}
                        onClick={() => void handleMove(placement.token.id)}
                      >
                        <LudoToken
                          color={placement.playerColor}
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
                        shape="pin"
                        variant="classic"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </section>
      ) : null}

      {game && endGameOpen && game.status === 'COMPLETED' && endGameStandings.length > 0 ? (
        <EndGameCelebration
          standings={endGameStandings}
          onRestart={handleResetSession}
          onClose={() => setEndGameOpen(false)}
        />
      ) : null}
    </main>
  )
}

export default App
