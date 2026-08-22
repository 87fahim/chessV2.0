import { useId } from 'react'

export type TokenColor = 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple'
export type TokenShape = 'pin' | 'pawn' | 'disc'
export type TokenVariant = 'classic' | 'flat' | 'glass'

export interface LudoTokenProps {
  color: TokenColor
  /** Optional custom paint; when set, overrides the seat palette. */
  paintHex?: string
  shape?: TokenShape
  variant?: TokenVariant
  size?: number
  selected?: boolean
  movable?: boolean
  disabled?: boolean
  label?: string
  className?: string
}

type Palette = {
  main: string
  dark: string
  soft: string
  glow: string
  body: string
  edge: string
}

const TOKEN_PALETTES: Record<TokenColor, Palette> = {
  red: {
    main: '#ef2424',
    dark: '#9c1b1b',
    soft: '#ff8f8f',
    glow: 'rgba(239, 36, 36, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
  green: {
    main: '#179949',
    dark: '#0f6b34',
    soft: '#7ad69d',
    glow: 'rgba(23, 153, 73, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
  blue: {
    main: '#2d7ae8',
    dark: '#1d5db3',
    soft: '#8ebdff',
    glow: 'rgba(45, 122, 232, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
  yellow: {
    main: '#e6bb00',
    dark: '#b88600',
    soft: '#f5d762',
    glow: 'rgba(230, 187, 0, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
  orange: {
    main: '#f07818',
    dark: '#b8550c',
    soft: '#ffb36b',
    glow: 'rgba(240, 120, 24, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
  purple: {
    main: '#8b4fcf',
    dark: '#5f3294',
    soft: '#c49aef',
    glow: 'rgba(139, 79, 207, 0.55)',
    body: '#f5f7fb',
    edge: '#636d7e',
  },
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!match) {
    return null
  }
  const value = match[1]
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function mixRgb(
  rgb: { r: number; g: number; b: number },
  toward: { r: number; g: number; b: number },
  amount: number,
): string {
  const t = Math.max(0, Math.min(1, amount))
  const r = clampByte(rgb.r + (toward.r - rgb.r) * t)
  const g = clampByte(rgb.g + (toward.g - rgb.g) * t)
  const b = clampByte(rgb.b + (toward.b - rgb.b) * t)
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function paletteFromPaintHex(paintHex: string, fallback: Palette): Palette {
  const rgb = parseHexRgb(paintHex)
  if (!rgb) {
    return fallback
  }
  return {
    main: paintHex.toLowerCase(),
    dark: mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.35),
    soft: mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.4),
    glow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.55)`,
    body: fallback.body,
    edge: fallback.edge,
  }
}

function PinShape({ palette, variant, softShadowId }: { palette: Palette; variant: TokenVariant; softShadowId: string }) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'
  // Artwork spans ~64px of the 100 viewBox; scale so the body is 90% of tile width.
  const artScale = 90 / 64
  const strokeBody = (isFlat ? 2.5 : 3) / artScale
  const strokeFace = 2.5 / artScale
  const strokeInner = 2.2 / artScale

  return (
    <g transform={`translate(50 90) scale(${artScale}) translate(-50 -90)`}>
      <ellipse
        className="token-shadow"
        cx="50"
        cy="90"
        rx="28"
        ry="14"
        fill="#1f2430"
        opacity={0.42}
        filter={isFlat ? undefined : `url(#${softShadowId})`}
      />
      <path
        className="ludo-token__body"
        d="M50 7 C31 7 18 20 18 39 C18 57 33 73 50 90 C67 73 82 57 82 39 C82 20 69 7 50 7 Z"
        fill={isFlat ? palette.body : undefined}
        stroke={isFlat ? palette.edge : '#77808a'}
        strokeWidth={strokeBody}
        strokeLinejoin="round"
      />
      <circle
        className="ludo-token__face"
        cx="50"
        cy="38"
        r="25"
        fill={isFlat ? palette.body : '#f1f5f9'}
        stroke={isFlat ? palette.edge : '#77808a'}
        strokeWidth={strokeFace}
      />
      <circle cx="50" cy="38" r="18" fill={palette.main} stroke={palette.dark} strokeWidth={strokeInner} />
      {!isFlat ? (
        <ellipse
          cx="43"
          cy="30"
          rx="8"
          ry="6"
          fill="#ffffff"
          opacity={isGlass ? 0.72 : 0.42}
          transform="rotate(-26 43 30)"
        />
      ) : null}
      {isGlass ? (
        <path
          d="M50 13 C34 13 25 24 25 39 C25 48 30 57 38 67 C31 43 38 22 61 17 C58 14 54 13 50 13 Z"
          fill="#ffffff"
          opacity="0.22"
        />
      ) : null}
    </g>
  )
}

function PawnShape({ palette, variant }: { palette: Palette; variant: TokenVariant }) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'

  return (
    <>
      <path
        d="M50 10 C36 10 25 21 25 35 C25 45 31 53 39 58 L39 70 C39 76 44 81 50 81 C56 81 61 76 61 70 L61 58 C69 53 75 45 75 35 C75 21 64 10 50 10 Z"
        fill={isFlat ? palette.main : palette.body}
        stroke={isFlat ? palette.dark : '#77808a'}
        strokeWidth={isFlat ? 2.5 : 3}
      />
      <path
        d="M31 70 H69 L76 86 C78 90 74 94 69 94 H31 C26 94 22 90 24 86 Z"
        fill={palette.main}
        stroke={palette.dark}
        strokeWidth={isFlat ? 2.5 : 3}
        strokeLinejoin="round"
      />
      <circle cx="50" cy="35" r="16" fill={palette.main} stroke={palette.dark} strokeWidth="2.2" />
      {!isFlat ? (
        <ellipse
          cx="44"
          cy="28"
          rx="7"
          ry="5"
          fill="#ffffff"
          opacity={isGlass ? 0.7 : 0.42}
        />
      ) : null}
    </>
  )
}

function DiscShape({ palette, variant }: { palette: Palette; variant: TokenVariant }) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'

  return (
    <>
      <circle cx="50" cy="50" r="33" fill={isFlat ? palette.main : '#edf3ff'} stroke={isFlat ? palette.dark : '#77808a'} strokeWidth={isFlat ? 2.5 : 3} />
      <circle cx="50" cy="50" r="22" fill={palette.main} stroke={palette.dark} strokeWidth="2.2" />
      {!isFlat ? (
        <ellipse
          cx="42"
          cy="40"
          rx="10"
          ry="8"
          fill="#ffffff"
          opacity={isGlass ? 0.72 : 0.4}
          transform="rotate(-28 42 40)"
        />
      ) : null}
    </>
  )
}

export function LudoToken({
  color,
  paintHex,
  shape = 'pin',
  variant = 'classic',
  size,
  selected = false,
  movable = false,
  disabled = false,
  label,
  className,
}: LudoTokenProps) {
  const seatPalette = TOKEN_PALETTES[color]
  const palette = paintHex ? paletteFromPaintHex(paintHex, seatPalette) : seatPalette
  const isFlat = variant === 'flat'
  const shadowId = useId().replace(/:/g, '')
  const softShadowId = `${shadowId}-soft`
  const classes = [
    'ludo-token',
    `ludo-token--${shape}`,
    `ludo-token--${variant}`,
    selected ? 'ludo-token--selected' : '',
    movable ? 'ludo-token--movable' : '',
    disabled ? 'ludo-token--disabled' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      className={classes}
      width={size ?? '100%'}
      height={size ?? '100%'}
      viewBox="0 0 100 100"
      role="img"
      aria-label={label ?? `${color} ${shape} token`}
      style={{ ['--token-glow' as string]: palette.glow }}
    >
      {!isFlat ? (
        <defs>
          <filter id={shadowId} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={palette.dark} floodOpacity="0.35" />
          </filter>
          <filter id={softShadowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
      ) : null}
      <g filter={isFlat ? undefined : `url(#${shadowId})`}>
        {shape === 'pin' ? <PinShape palette={palette} variant={variant} softShadowId={softShadowId} /> : null}
        {shape === 'pawn' ? <PawnShape palette={palette} variant={variant} /> : null}
        {shape === 'disc' ? <DiscShape palette={palette} variant={variant} /> : null}
      </g>
      {selected ? (
        <circle
          className="ludo-token__selection-ring"
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeDasharray="7 5"
        />
      ) : null}
    </svg>
  )
}

export function TokenButton({
  pieceId,
  color,
  canMove,
  selected,
  onSelect,
}: {
  pieceId: string
  color: TokenColor
  canMove: boolean
  selected: boolean
  onSelect: (pieceId: string) => void
}) {
  return (
    <button
      type="button"
      className="token-button"
      disabled={!canMove}
      data-piece-id={pieceId}
      aria-label={`Select ${color} piece`}
      aria-pressed={selected}
      onClick={() => onSelect(pieceId)}
    >
      <LudoToken color={color} shape="pin" variant="classic" movable={canMove} selected={selected} size={54} />
    </button>
  )
}
