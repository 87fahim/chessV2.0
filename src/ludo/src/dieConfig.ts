export type DieValue = 1 | 2 | 3 | 4 | 5 | 6

export const DIE_ROLL_ANIMATION_MS = 620

export const DIE_VALUES: DieValue[] = [1, 2, 3, 4, 5, 6]

/** Cube face layout: 1=top, 6=bottom, 2=front, 5=back, 3=right, 4=left. */
export const DIE_ORIENTATIONS: Record<DieValue, { rx: string; ry: string; rz: string }> = {
  1: { rx: '-90deg', ry: '0deg', rz: '0deg' },
  2: { rx: '0deg', ry: '0deg', rz: '0deg' },
  3: { rx: '0deg', ry: '-90deg', rz: '0deg' },
  4: { rx: '0deg', ry: '90deg', rz: '0deg' },
  5: { rx: '0deg', ry: '180deg', rz: '0deg' },
  6: { rx: '90deg', ry: '0deg', rz: '0deg' },
}

export const DIE_PIP_LAYOUTS: Record<DieValue, Array<[number, number]>> = {
  1: [[2, 2]],
  2: [
    [1, 1],
    [3, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
  4: [
    [1, 1],
    [1, 3],
    [3, 1],
    [3, 3],
  ],
  5: [
    [1, 1],
    [1, 3],
    [2, 2],
    [3, 1],
    [3, 3],
  ],
  6: [
    [1, 1],
    [2, 1],
    [3, 1],
    [1, 3],
    [2, 3],
    [3, 3],
  ],
}

export function asDieValue(value: number | null | undefined): DieValue | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    return value
  }
  return null
}

export function rollDieLocally(): DieValue {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint32Array(1)
    cryptoApi.getRandomValues(bytes)
    return (1 + (bytes[0] % 6)) as DieValue
  }
  return (1 + Math.floor(Math.random() * 6)) as DieValue
}

export function safeStatCount(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}
