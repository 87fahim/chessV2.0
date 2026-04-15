/**
 * Stockfish UCI engine service.
 * Backend-only: calls an API that runs the local Stockfish binary.
 */

import type { Difficulty } from '../../types/game';
import type { EngineSearchMode } from './boardEditorTypes';
import { ENGINE_CONFIG } from './engineConfig';

export interface AnalysisResult {
  bestMove: string;    // UCI format e.g. "e2e4"
  ponder?: string;
  evaluation?: string; // e.g. "+0.35" or "+M3"
  pv?: string;         // principal variation in UCI
  depth: number;
}

export interface AnalyzeOptions {
  difficulty: Difficulty;
  searchMode: EngineSearchMode;
  searchDepth: number;
  moveTimeMs: number;
}

class StockfishService {
  async init(): Promise<void> {
    // Backend mode requires no frontend worker initialization.
    return Promise.resolve();
  }

  private async analyzeViaBackend(fen: string, options: AnalyzeOptions): Promise<AnalysisResult> {
    const response = await fetch(ENGINE_CONFIG.backendAnalyzeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen,
        options,
        enginePath: ENGINE_CONFIG.localBinaryPath,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend engine endpoint failed: ${response.status}`);
    }

    const json = await response.json() as { data?: Partial<AnalysisResult> } | Partial<AnalysisResult>;
    const data = ('data' in json ? json.data : json) as Partial<AnalysisResult> | undefined;

    if (!data?.bestMove) {
      throw new Error('Backend engine returned no best move');
    }

    return {
      bestMove: data.bestMove,
      ponder: data.ponder,
      evaluation: data.evaluation,
      pv: data.pv,
      depth: data.depth ?? 0,
    };
  }

  async analyze(fen: string, options: AnalyzeOptions): Promise<AnalysisResult> {
    try {
      return await this.analyzeViaBackend(fen, options);
    } catch (backendError) {
      const reason = backendError instanceof Error ? backendError.message : 'Unknown backend failure';
      throw new Error(
        `Backend local engine is unavailable. Expected backend to run: ` +
        `${ENGINE_CONFIG.localBinaryPath}. Reason: ${reason}`,
      );
    }
  }

  destroy() {
    // No frontend worker resources to release in backend-only mode.
  }
}

let instance: StockfishService | null = null;

export function getStockfishService(): StockfishService {
  if (!instance) {
    instance = new StockfishService();
  }
  return instance;
}

export function parseUciMove(uci: string): { from: string; to: string; promotion?: string } {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}
