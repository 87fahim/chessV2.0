import { useId, type ReactNode } from 'react'

export type TokenColor = 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple'
export type TokenShape = 'pin' | 'pawn' | 'dome' | 'meeple' | 'gem'
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

const TOKEN_BODY = '#f4f6fa'
const TOKEN_BORDER = '#2a3038'

function bodyStroke(width: number) {
  return {
    fill: TOKEN_BODY,
    stroke: TOKEN_BORDER,
    strokeWidth: width,
    strokeLinejoin: 'round' as const,
  }
}

function PinShape({ palette, variant, softShadowId }: { palette: Palette; variant: TokenVariant; softShadowId: string }) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'
  // Artwork spans ~64px of the 100 viewBox; scale so the body is 90% of tile width.
  const artScale = 90 / 64
  const strokeBody = 3.2 / artScale
  const strokeAccent = 1.8 / artScale

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
        {...bodyStroke(strokeBody)}
      />
      <circle cx="50" cy="36" r="16" fill={palette.main} stroke={palette.dark} strokeWidth={strokeAccent} />
      {!isFlat ? (
        <ellipse
          cx="44"
          cy="30"
          rx="6"
          ry="4.5"
          fill="#ffffff"
          opacity={isGlass ? 0.72 : 0.42}
          transform="rotate(-26 44 30)"
        />
      ) : null}
    </g>
  )
}

function PawnShape({
  palette,
  variant,
  softShadowId,
}: {
  palette: Palette
  variant: TokenVariant
  softShadowId: string
}) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'
  // 20% smaller than the pin-matched size (64 / 0.8).
  const artWidth = 80
  const stroke = (3.2 * artWidth) / 90
  const accent = (1.8 * artWidth) / 90

  return (
    <ArtScale artWidth={artWidth}>
      <GroundShadow softShadowId={isFlat ? undefined : softShadowId} rx={24} />
      <path
        className="ludo-token__body"
        d="M50 8 C32 8 18 22 18 38 C18 50 26 60 36 66 L36 74 C36 80 42 86 50 86 C58 86 64 80 64 74 L64 66 C74 60 82 50 82 38 C82 22 68 8 50 8 Z"
        {...bodyStroke(stroke)}
      />
      <path
        d="M24 74 H76 L84 90 C86 94 82 96 76 96 H24 C18 96 14 94 16 90 Z"
        {...bodyStroke(stroke)}
      />
      <circle cx="50" cy="36" r="16" fill={palette.main} stroke={palette.dark} strokeWidth={accent} />
      {!isFlat ? (
        <ellipse cx="44" cy="30" rx="6" ry="4.5" fill="#ffffff" opacity={isGlass ? 0.7 : 0.42} />
      ) : null}
    </ArtScale>
  )
}

/**
 * Scales artwork about the foot at (50, 90) so every shape carries the same
 * visual weight as PinShape, which sizes its 64px-wide body to 90px.
 */
function ArtScale({ artWidth, children }: { artWidth: number; children: ReactNode }) {
  const scale = 90 / artWidth
  return <g transform={`translate(50 90) scale(${scale}) translate(-50 -90)`}>{children}</g>
}

/** Ground contact for standing shapes, matching PinShape so tiles line up. */
function GroundShadow({ softShadowId, rx = 26 }: { softShadowId?: string; rx?: number }) {
  return (
    <ellipse
      className="token-shadow"
      cx="50"
      cy="90"
      rx={rx}
      ry="10"
      fill="#1f2430"
      opacity={0.38}
      filter={softShadowId ? `url(#${softShadowId})` : undefined}
    />
  )
}

function DomeShape({
  palette,
  variant,
  softShadowId,
}: {
  palette: Palette
  variant: TokenVariant
  softShadowId: string
}) {
  const isFlat = variant === 'flat'
  const isGlass = variant === 'glass'
  const artWidth = 58
  const stroke = (3.2 * artWidth) / 90
  const accent = (1.8 * artWidth) / 90
  // Taller umbrella so the color badge sits fully inside the cap.
  const silhouette = `M24 64
    A26 26 0 0 1 76 64
    L56 67
    L55 82
    L66 92
    C68 95 64 96 60 96
    H40
    C36 96 32 95 34 92
    L45 82
    L44 67
    Z`

  return (
    <ArtScale artWidth={artWidth}>
      <GroundShadow softShadowId={isFlat ? undefined : softShadowId} rx={16} />
      <path className="ludo-token__body" d={silhouette} {...bodyStroke(stroke)} />
      <path d="M40 92 H60 L55 82 H45 Z" fill={TOKEN_BORDER} opacity={0.08} />
      <path
        d="M38 58 A12 12 0 0 1 62 58 Z"
        fill={palette.main}
        stroke={palette.dark}
        strokeWidth={accent}
        strokeLinejoin="round"
      />
      {!isFlat ? (
        <ellipse
          cx="46"
          cy="52"
          rx="4"
          ry="2.6"
          fill="#ffffff"
          opacity={isGlass ? 0.7 : 0.4}
          transform="rotate(-28 46 52)"
        />
      ) : null}
    </ArtScale>
  )
}

function MeepleShape({
  palette,
  variant,
  softShadowId,
}: {
  palette: Palette
  variant: TokenVariant
  softShadowId: string
}) {
  const isFlat = variant === 'flat'
  const artWidth = 66
  const stroke = (3.2 * artWidth) / 90
  // One closed silhouette (head, arms, legs) so strokes never cross the body.
  const silhouette = `M38 44 C28 46 20 50 17 53 C14 56 16 61 21 61 C26 61 32 59 37 57
     L31 88 C30 92 33 95 37 95 H44 C47 95 49 93 49 90 L50 80 L51 90
     C51 93 53 95 56 95 H63 C67 95 70 92 69 88 L63 57
     C68 59 74 61 79 61 C84 61 86 56 83 53 C80 50 72 46 62 44
     C66 40 66 24 50 24 C34 24 34 40 38 44 Z`

  return (
    <ArtScale artWidth={artWidth}>
      <GroundShadow softShadowId={isFlat ? undefined : softShadowId} rx={19} />
      <g transform="translate(0 -5)">
        <path className="ludo-token__body" d={silhouette} {...bodyStroke(stroke)} />
        <circle cx="50" cy="32" r="7" fill={palette.main} stroke={palette.dark} strokeWidth={(1.8 * artWidth) / 90} />
        {!isFlat ? (
          <ellipse cx="47" cy="29" rx="3" ry="2" fill="#ffffff" opacity={0.45} transform="rotate(-25 47 29)" />
        ) : null}
      </g>
    </ArtScale>
  )
}

function GemShape({
  palette,
  variant,
  softShadowId,
}: {
  palette: Palette
  variant: TokenVariant
  softShadowId: string
}) {
  const isFlat = variant === 'flat'
  const artWidth = 60
  const stroke = (3.2 * artWidth) / 90
  const silhouette = '50,12 80,44 50,90 20,44'

  return (
    <ArtScale artWidth={artWidth}>
      <GroundShadow softShadowId={isFlat ? undefined : softShadowId} rx={15} />
      <polygon className="ludo-token__body" points={silhouette} {...bodyStroke(stroke)} />
      <polygon points="50,12 68,38 32,38" fill="#ffffff" opacity={0.35} />
      <polygon points="80,44 68,38 50,90" fill={TOKEN_BORDER} opacity={0.1} />
      <polygon
        points="50,38 62,48 50,72 38,48"
        fill={palette.main}
        stroke={palette.dark}
        strokeWidth={(1.6 * artWidth) / 90}
        strokeLinejoin="round"
      />
    </ArtScale>
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
        {shape === 'pawn' ? <PawnShape palette={palette} variant={variant} softShadowId={softShadowId} /> : null}
        {shape === 'dome' ? <DomeShape palette={palette} variant={variant} softShadowId={softShadowId} /> : null}
        {shape === 'meeple' ? (
          <MeepleShape palette={palette} variant={variant} softShadowId={softShadowId} />
        ) : null}
        {shape === 'gem' ? <GemShape palette={palette} variant={variant} softShadowId={softShadowId} /> : null}
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
