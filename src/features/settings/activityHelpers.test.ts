import { describe, expect, it } from 'vitest';
import {
  formatDetailValue,
  formatTimeControlLabel,
  getActivityDetailRows,
  getActivitySummary,
  getActivityTitle,
  getGameOutcomeColor,
  getGameOutcomeLabel,
  isPersonalLoss,
  isPersonalWin,
  startCase,
  toActivityRecord,
  type HistoryGameRecord,
} from './activityHelpers';

function makeGame(overrides: Partial<HistoryGameRecord> = {}): HistoryGameRecord {
  return {
    _id: 'g1',
    mode: 'online',
    result: '1-0',
    moves: [],
    whitePlayer: { userId: 'u1', name: 'Alice' },
    blackPlayer: { userId: 'u2', name: 'Bob' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T01:00:00Z',
    ...overrides,
  };
}

describe('startCase', () => {
  it('turns snake_case into Title Case', () => {
    expect(startCase('practice_session')).toBe('Practice Session');
    expect(startCase('login')).toBe('Login');
  });
});

describe('formatDetailValue', () => {
  it('handles empty values', () => {
    expect(formatDetailValue(null)).toBe('Not available');
    expect(formatDetailValue(undefined)).toBe('Not available');
    expect(formatDetailValue('')).toBe('Not available');
  });

  it('formats booleans, arrays, and objects', () => {
    expect(formatDetailValue(true)).toBe('Yes');
    expect(formatDetailValue(false)).toBe('No');
    expect(formatDetailValue([1, 'a'])).toBe('1, a');
    expect(formatDetailValue({ a: 1 })).toBe('{"a":1}');
    expect(formatDetailValue(42)).toBe('42');
  });
});

describe('formatTimeControlLabel', () => {
  it('shows Unlimited when missing', () => {
    expect(formatTimeControlLabel(undefined)).toBe('Unlimited');
  });

  it('formats base and increment', () => {
    expect(formatTimeControlLabel({ initialMs: 300000, incrementMs: 0 })).toBe('5 min');
    expect(formatTimeControlLabel({ initialMs: 180000, incrementMs: 2000 })).toBe('3+2');
  });
});

describe('personal game outcome', () => {
  it('detects wins and losses by userId', () => {
    const game = makeGame({ result: '1-0' });
    expect(isPersonalWin(game, 'u1')).toBe(true);
    expect(isPersonalLoss(game, 'u2')).toBe(true);
    expect(isPersonalWin(game, 'u2')).toBe(false);
  });

  it('falls back to username matching', () => {
    const game = makeGame({ result: '0-1', whitePlayer: { name: 'Alice' }, blackPlayer: { name: 'Bob' } });
    expect(isPersonalWin(game, undefined, 'Bob')).toBe(true);
    expect(isPersonalLoss(game, undefined, 'Alice')).toBe(true);
  });

  it('labels and colors outcomes', () => {
    expect(getGameOutcomeLabel(makeGame({ result: '1/2-1/2' }), 'u1')).toBe('Draw');
    expect(getGameOutcomeColor(makeGame({ result: '1/2-1/2' }), 'u1')).toBe('default');
    expect(getGameOutcomeLabel(makeGame({ result: '1-0' }), 'u1')).toBe('Win');
    expect(getGameOutcomeColor(makeGame({ result: '1-0' }), 'u1')).toBe('success');
    expect(getGameOutcomeLabel(makeGame({ result: '1-0' }), 'u2')).toBe('Loss');
    expect(getGameOutcomeColor(makeGame({ result: '1-0' }), 'u2')).toBe('error');
  });
});

describe('toActivityRecord', () => {
  it('extracts known fields and drops malformed ones', () => {
    const record = toActivityRecord({
      _id: 'a1',
      activityType: 'login',
      feature: 'auth',
      metadata: { ip: 'redacted' },
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(record).toEqual({
      _id: 'a1',
      activityType: 'login',
      feature: 'auth',
      gameId: undefined,
      puzzleId: undefined,
      fen: undefined,
      metadata: { ip: 'redacted' },
      createdAt: '2026-01-01T00:00:00Z',
    });
  });

  it('applies defaults for missing fields', () => {
    const record = toActivityRecord({});
    expect(record.activityType).toBe('activity');
    expect(record.feature).toBe('system');
    expect(record.metadata).toBeUndefined();
  });
});

describe('activity titles and summaries', () => {
  it('maps known activity types to titles', () => {
    expect(getActivityTitle({ activityType: 'login', feature: 'auth' })).toBe('Signed in');
    expect(getActivityTitle({ activityType: 'practice_session', feature: 'practice' })).toBe('Practice session');
    expect(getActivityTitle({ activityType: 'unknown_thing', feature: 'x' })).toBe('Unknown Thing');
  });

  it('builds analysis summaries from metadata', () => {
    const summary = getActivitySummary({
      activityType: 'analysis_request',
      feature: 'analysis',
      metadata: { difficulty: 'hard', searchDepth: 12 },
    });
    expect(summary).toBe('Difficulty hard • Depth 12');
  });

  it('falls back to a sentence when metadata is empty', () => {
    expect(getActivitySummary({ activityType: 'analysis_request', feature: 'analysis' }))
      .toBe('Engine analysis requested for a position.');
  });
});

describe('getActivityDetailRows', () => {
  it('includes base rows plus ids and metadata', () => {
    const rows = getActivityDetailRows({
      activityType: 'game_saved',
      feature: 'game',
      gameId: 'g42',
      metadata: { move_count: 30 },
      createdAt: '2026-01-01T00:00:00Z',
    });
    const labels = rows.map((r) => r.label);
    expect(labels).toEqual(['Activity', 'Area', 'Time', 'Game ID', 'Move Count']);
    expect(rows.find((r) => r.label === 'Game ID')?.value).toBe('g42');
    expect(rows.find((r) => r.label === 'Move Count')?.value).toBe('30');
  });
});
