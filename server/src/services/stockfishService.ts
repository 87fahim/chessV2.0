import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync } from 'fs';
import readline from 'readline';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface EngineAnalyzeOptions {
  difficulty?: 'easy' | 'medium' | 'hard';
  searchMode?: 'depth' | 'time';
  searchDepth?: number;
  moveTimeMs?: number;
}

export interface EngineAnalysisResult {
  bestMove: string;
  ponder?: string;
  evaluation?: string;
  pv?: string;
  depth: number;
}

interface LineWaiter {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

class StockfishService {
  private process: ChildProcessWithoutNullStreams | null = null;
  private outputReader: readline.Interface | null = null;
  private readyPromise: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private waiters: LineWaiter[] = [];
  private lineListeners = new Set<(line: string) => void>();

  async initialize(): Promise<void> {
    await this.ensureStarted();
    logger.info(`Stockfish engine ready: ${env.STOCKFISH_PATH}`);
  }

  async analyze(fen: string, options: EngineAnalyzeOptions = {}): Promise<EngineAnalysisResult> {
    return this.enqueue(async () => {
      await this.ensureStarted();

      const difficulty = options.difficulty || 'medium';
      const searchMode = options.searchMode || 'time';
      const searchDepth = Math.max(1, Math.min(options.searchDepth || 15, 60));
      const moveTimeMs = Math.max(50, Math.min(options.moveTimeMs || 1200, 120000));
      const skillLevel = this.getSkillLevel(difficulty);

      let latestDepth = 0;
      let latestEvaluation: string | undefined;
      let latestPv: string | undefined;

      const infoListener = (line: string) => {
        if (!line.startsWith('info ')) return;

        const depthMatch = line.match(/\bdepth\s+(\d+)/);
        if (depthMatch) {
          latestDepth = Number(depthMatch[1]);
        }

        const scoreMatch = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
        if (scoreMatch) {
          const scoreType = scoreMatch[1];
          const scoreValue = Number(scoreMatch[2]);
          latestEvaluation =
            scoreType === 'cp'
              ? `${scoreValue >= 0 ? '+' : ''}${(scoreValue / 100).toFixed(2)}`
              : `${scoreValue >= 0 ? '+' : '-'}M${Math.abs(scoreValue)}`;
        }

        const pvMatch = line.match(/\spv\s+(.+)$/);
        if (pvMatch) {
          latestPv = pvMatch[1].trim();
        }
      };

      this.lineListeners.add(infoListener);

      try {
        this.sendCommand(`setoption name Skill Level value ${skillLevel}`);
        this.sendCommand('ucinewgame');
        this.sendCommand('isready');
        await this.waitForLine((line) => line === 'readyok', 5000);

        this.sendCommand(`position fen ${fen}`);
        this.sendCommand(searchMode === 'depth' ? `go depth ${searchDepth}` : `go movetime ${moveTimeMs}`);

        // Depth-based searches can take very long at high depths; allow generous timeout
        const waitTimeout = searchMode === 'depth'
          ? Math.max(30000, searchDepth * 10000)   // ~10s per depth level, min 30s
          : moveTimeMs + 10000;                      // moveTime + 10s buffer
        const bestMoveLine = await this.waitForLine((line) => line.startsWith('bestmove '), waitTimeout);
        const bestMoveMatch = bestMoveLine.match(/^bestmove\s+(\S+)(?:\s+ponder\s+(\S+))?/);

        if (!bestMoveMatch) {
          throw new Error('Engine did not return a best move');
        }

        return {
          bestMove: bestMoveMatch[1],
          ponder: bestMoveMatch[2],
          evaluation: latestEvaluation,
          pv: latestPv,
          depth: latestDepth,
        };
      } finally {
        this.lineListeners.delete(infoListener);
      }
    });
  }

  /** Send UCI 'stop' to halt the current search immediately. Stockfish will output bestmove right away. */
  cancelCurrentAnalysis(): void {
    try {
      this.sendCommand('stop');
    } catch {
      // Engine not running — nothing to cancel
    }
  }

  async shutdown(): Promise<void> {
    this.rejectAllWaiters(new Error('Stockfish engine shutdown'));

    if (this.outputReader) {
      this.outputReader.close();
      this.outputReader = null;
    }

    if (this.process && !this.process.killed) {
      try {
        this.process.stdin.write('quit\n');
      } catch {
        // Ignore if stdin is already closed.
      }
      this.process.kill();
    }

    this.process = null;
    this.readyPromise = null;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const nextTask = this.queue.then(task, task);
    this.queue = nextTask.then(() => undefined, () => undefined);
    return nextTask;
  }

  private async ensureStarted(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
      return;
    }

    this.readyPromise = this.startProcess();
    try {
      await this.readyPromise;
    } catch (error) {
      this.readyPromise = null;
      throw error;
    }
  }

  private async startProcess(): Promise<void> {
    if (!existsSync(env.STOCKFISH_PATH)) {
      throw new Error(`Stockfish binary not found at ${env.STOCKFISH_PATH}`);
    }

    const process = spawn(env.STOCKFISH_PATH, [], {
      stdio: 'pipe',
      windowsHide: true,
    });

    this.process = process;
    this.outputReader = readline.createInterface({ input: process.stdout });
    this.outputReader.on('line', (line) => this.handleLine(line.trim()));

    process.stderr.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message) {
        logger.warn(`Stockfish stderr: ${message}`);
      }
    });

    process.on('error', (error) => {
      logger.error('Stockfish process error', error);
      this.rejectAllWaiters(error instanceof Error ? error : new Error('Stockfish process error'));
      this.process = null;
      this.readyPromise = null;
    });

    process.on('exit', (code, signal) => {
      logger.warn(`Stockfish process exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`);
      this.rejectAllWaiters(new Error('Stockfish process exited unexpectedly'));
      this.process = null;
      this.readyPromise = null;
    });

    this.sendCommand('uci');
    await this.waitForLine((line) => line === 'uciok', 5000);
    this.sendCommand('isready');
    await this.waitForLine((line) => line === 'readyok', 5000);
  }

  private sendCommand(command: string): void {
    if (!this.process || this.process.killed || !this.process.stdin.writable) {
      throw new Error('Stockfish engine is not running');
    }

    this.process.stdin.write(`${command}\n`);
  }

  private waitForLine(predicate: (line: string) => boolean, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiters = this.waiters.filter((waiter) => waiter !== lineWaiter);
        reject(new Error('Timed out waiting for Stockfish response'));
      }, timeoutMs);

      const lineWaiter: LineWaiter = {
        predicate,
        resolve: (line) => {
          clearTimeout(timeout);
          resolve(line);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      };

      this.waiters.push(lineWaiter);
    });
  }

  private handleLine(line: string): void {
    if (!line) return;

    for (const listener of this.lineListeners) {
      listener(line);
    }

    const matchedWaiters = this.waiters.filter((waiter) => waiter.predicate(line));
    if (matchedWaiters.length === 0) return;

    this.waiters = this.waiters.filter((waiter) => !matchedWaiters.includes(waiter));
    for (const waiter of matchedWaiters) {
      waiter.resolve(line);
    }
  }

  private rejectAllWaiters(error: Error): void {
    const waiters = this.waiters;
    this.waiters = [];
    for (const waiter of waiters) {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    }
  }

  private getSkillLevel(difficulty: 'easy' | 'medium' | 'hard'): number {
    if (difficulty === 'easy') return 4;
    if (difficulty === 'hard') return 18;
    return 10;
  }
}

const stockfishService = new StockfishService();

export async function initializeStockfish(): Promise<void> {
  await stockfishService.initialize();
}

export async function analyzePosition(fen: string, options: EngineAnalyzeOptions): Promise<EngineAnalysisResult> {
  return stockfishService.analyze(fen, options);
}

export async function shutdownStockfish(): Promise<void> {
  await stockfishService.shutdown();
}

export function cancelAnalysis(): void {
  stockfishService.cancelCurrentAnalysis();
}