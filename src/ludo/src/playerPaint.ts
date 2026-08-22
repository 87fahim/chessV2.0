import type { CSSProperties } from 'react'
import type { PlayerColor } from './types'

export const SEAT_COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue', 'orange', 'purple']

/** Defaults match board CSS seat colors. */
export const DEFAULT_PAINT_BY_SEAT: Record<PlayerColor, string> = {
  red: '#ef2424',
  green: '#179949',
  yellow: '#e6bb00',
  blue: '#2d7ae8',
  orange: '#f07818',
  purple: '#8b4fcf',
}

/** Normalize #rgb / #rrggbb to lowercase #rrggbb, or null if invalid. */
export function normalizePaintHex(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const raw = value.trim()
  const short = /^#([0-9a-fA-F]{3})$/.exec(raw)
  if (short) {
    const [r, g, b] = short[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  const full = /^#([0-9a-fA-F]{6})$/.exec(raw)
  if (full) {
    return `#${full[1]}`.toLowerCase()
  }
  return null
}

export function resolvePlayerPaintHex(player: {
  color: PlayerColor
  paintHex?: string | null
}): string {
  return normalizePaintHex(player.paintHex) ?? DEFAULT_PAINT_BY_SEAT[player.color]
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizePaintHex(hex)
  if (!normalized) {
    return null
  }
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, '0')).join('')}`
}

function mixToward(
  hex: string,
  toward: { r: number; g: number; b: number },
  amount: number,
): string {
  const rgb = parseRgb(hex)
  if (!rgb) {
    return hex
  }
  const t = Math.max(0, Math.min(1, amount))
  return toHex(
    rgb.r + (toward.r - rgb.r) * t,
    rgb.g + (toward.g - rgb.g) * t,
    rgb.b + (toward.b - rgb.b) * t,
  )
}

export function darkenPaintHex(hex: string, amount = 0.28): string {
  return mixToward(hex, { r: 0, g: 0, b: 0 }, amount)
}

export function lightenPaintHex(hex: string, amount = 0.35): string {
  return mixToward(hex, { r: 255, g: 255, b: 255 }, amount)
}

export function buildSeatPaintMap(
  players: Array<{ color: PlayerColor; paintHex?: string | null }>,
): Record<PlayerColor, string> {
  const map: Record<PlayerColor, string> = { ...DEFAULT_PAINT_BY_SEAT }
  for (const player of players) {
    map[player.color] = resolvePlayerPaintHex(player)
  }
  return map
}

/** CSS custom properties consumed by App.css seat styling. */
export function seatPaintCssVars(seatPaint: Record<PlayerColor, string>): CSSProperties {
  const style: Record<string, string> = {}
  for (const color of SEAT_COLORS) {
    const main = seatPaint[color] ?? DEFAULT_PAINT_BY_SEAT[color]
    style[`--seat-${color}`] = main
    style[`--seat-${color}-dark`] = darkenPaintHex(main)
    style[`--seat-${color}-soft`] = lightenPaintHex(main)
  }
  return style as CSSProperties
}
