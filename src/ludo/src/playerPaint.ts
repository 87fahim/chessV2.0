import type { PlayerColor } from './types'

export const DEFAULT_PAINT_BY_SEAT: Record<PlayerColor, string> = {
  red: '#ef2424',
  green: '#1f9d55',
  yellow: '#d4a017',
  blue: '#2d7ae8',
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
