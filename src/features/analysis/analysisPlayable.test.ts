import { describe, expect, it } from 'vitest';
import { playablePositionError } from './analysisPlayable';

describe('playablePositionError', () => {
  it('allows a normal starting position', () => {
    expect(
      playablePositionError('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
    ).toBeNull();
  });

  it('allows the side in check to search for an escape', () => {
    expect(playablePositionError('4k3/8/8/8/4Q3/8/8/4K3 b - - 0 1')).toBeNull();
  });

  it('rejects White to move while Black is in check', () => {
    expect(playablePositionError('4k3/8/8/8/4Q3/8/8/4K3 w - - 0 1')).toBe(
      'Black is in check, so White cannot move',
    );
  });

  it('rejects White to move after Black is checkmated', () => {
    expect(
      playablePositionError('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 5'),
    ).toBe('Black is already checkmated, so White cannot move');
  });

  it('rejects the mated side when they have no legal move', () => {
    expect(
      playablePositionError('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4'),
    ).toBe('Black is checkmated and has no legal move');
  });

  it('rejects a stalemate because the side to move has no legal move', () => {
    expect(playablePositionError('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toBe(
      'Black has no legal move',
    );
  });
});
