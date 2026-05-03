import { env } from '../config/env.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function normalizeMeta(meta: unknown): Record<string, unknown> {
  if (meta === undefined) {
    return {};
  }

  if (meta instanceof Error) {
    return {
      errorName: meta.name,
      errorMessage: meta.message,
      stack: meta.stack,
    };
  }

  if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>;
  }

  return { meta };
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const fields = normalizeMeta(meta);

  if (level === 'debug' && env.NODE_ENV === 'production') return;

  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (env.NODE_ENV === 'production') {
    logFn(JSON.stringify({
      timestamp,
      level,
      environment: env.APP_ENV,
      message,
      ...fields,
    }));
    return;
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (Object.keys(fields).length > 0) {
    logFn(`${prefix} ${message}`, fields);
    return;
  }

  logFn(`${prefix} ${message}`);
}

export const logger = {
  info: (msg: string, meta?: unknown) => log('info', msg, meta),
  warn: (msg: string, meta?: unknown) => log('warn', msg, meta),
  error: (msg: string, meta?: unknown) => log('error', msg, meta),
  debug: (msg: string, meta?: unknown) => log('debug', msg, meta),
};
