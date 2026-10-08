const SESSION_KEY = 'chess.sidebarExpanded';

export function readSessionSidebarExpanded(): boolean | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    // Ignore private-mode / blocked storage.
  }
  return null;
}

export function writeSessionSidebarExpanded(expanded: boolean): void {
  try {
    sessionStorage.setItem(SESSION_KEY, expanded ? '1' : '0');
  } catch {
    // Ignore quota / private-mode failures.
  }
}
