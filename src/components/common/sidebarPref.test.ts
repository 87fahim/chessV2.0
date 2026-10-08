import { afterEach, describe, expect, it } from 'vitest';
import { readSessionSidebarExpanded, writeSessionSidebarExpanded } from './sidebarPref';

describe('sidebarPref', () => {
  afterEach(() => {
    sessionStorage.removeItem('chess.sidebarExpanded');
  });

  it('returns null when the user has not chosen yet', () => {
    expect(readSessionSidebarExpanded()).toBeNull();
  });

  it('persists expand and collapse for the session', () => {
    writeSessionSidebarExpanded(true);
    expect(readSessionSidebarExpanded()).toBe(true);
    writeSessionSidebarExpanded(false);
    expect(readSessionSidebarExpanded()).toBe(false);
  });
});
