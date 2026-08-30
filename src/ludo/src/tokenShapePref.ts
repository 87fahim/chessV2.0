import { type TokenShape } from './LudoToken'

const STORAGE_KEY = 'ludo.tokenShape'
const DEFAULT_SHAPE: TokenShape = 'gem'

export const TOKEN_SHAPES: ReadonlyArray<{ value: TokenShape; label: string }> = [
  { value: 'pin', label: 'Pin (classic)' },
  { value: 'pawn', label: 'Pawn' },
  { value: 'dome', label: 'Dome' },
  { value: 'meeple', label: 'Meeple' },
  { value: 'gem', label: 'Gem' },
]

function isTokenShape(value: unknown): value is TokenShape {
  return TOKEN_SHAPES.some((option) => option.value === value)
}

export function getTokenShape(): TokenShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return isTokenShape(raw) ? raw : DEFAULT_SHAPE
  } catch {
    return DEFAULT_SHAPE
  }
}

export function setTokenShape(next: TokenShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Preference is cosmetic; ignore storage failures (private mode, quota).
  }
}
