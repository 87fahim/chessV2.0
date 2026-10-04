const STORAGE_KEY = 'chess.analysisBoardLayout';

export interface AnalysisBoardLayout {
  fen: string;
  flipped: boolean;
}

export function readAnalysisBoardLayout(): AnalysisBoardLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AnalysisBoardLayout>;
    if (typeof parsed.fen !== 'string' || parsed.fen.trim().length === 0) {
      return null;
    }
    return {
      fen: parsed.fen,
      flipped: parsed.flipped === true,
    };
  } catch {
    return null;
  }
}

export function writeAnalysisBoardLayout(layout: AnalysisBoardLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
