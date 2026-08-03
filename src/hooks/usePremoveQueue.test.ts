import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { usePremoveQueue } from './usePremoveQueue';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('usePremoveQueue', () => {
  it('queues premoves and exposes all highlighted squares', () => {
    const { result } = renderHook(() => usePremoveQueue());

    act(() => {
      result.current.addPremove('e2', 'e4');
      result.current.addPremove('g1', 'f3');
    });

    expect(result.current.queue).toEqual([
      { from: 'e2', to: 'e4', promotion: undefined },
      { from: 'g1', to: 'f3', promotion: undefined },
    ]);
    expect([...result.current.premoveSquares].sort()).toEqual(['e2', 'e4', 'f3', 'g1']);
  });

  it('dequeues the first premove when it is legal for the current position', () => {
    const { result } = renderHook(() => usePremoveQueue());

    act(() => {
      result.current.addPremove('e2', 'e4');
    });

    let processed = null;
    act(() => {
      processed = result.current.processNextPremove(START_FEN);
    });

    expect(processed).toEqual({ from: 'e2', to: 'e4', promotion: undefined });
    expect(result.current.queue).toEqual([]);
  });

  it('clears the full queue when the first premove is illegal', () => {
    const { result } = renderHook(() => usePremoveQueue());

    act(() => {
      result.current.addPremove('e2', 'e5');
      result.current.addPremove('g1', 'f3');
    });

    let processed = null;
    act(() => {
      processed = result.current.processNextPremove(START_FEN);
    });

    expect(processed).toBeNull();
    expect(result.current.queue).toEqual([]);
  });
});
