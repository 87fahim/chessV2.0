export const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const TIME_CONTROLS = {
  BULLET_1: { initialMs: 60_000, incrementMs: 0, label: '1+0' },
  BULLET_2: { initialMs: 120_000, incrementMs: 1000, label: '2+1' },
  BLITZ_3: { initialMs: 180_000, incrementMs: 0, label: '3+0' },
  BLITZ_3_2: { initialMs: 180_000, incrementMs: 2000, label: '3+2' },
  BLITZ_5: { initialMs: 300_000, incrementMs: 0, label: '5+0' },
  BLITZ_5_3: { initialMs: 300_000, incrementMs: 3000, label: '5+3' },
  RAPID_10: { initialMs: 600_000, incrementMs: 0, label: '10+0' },
  RAPID_15_10: { initialMs: 900_000, incrementMs: 10_000, label: '15+10' },
  CLASSICAL_30: { initialMs: 1_800_000, incrementMs: 0, label: '30+0' },
} as const;
