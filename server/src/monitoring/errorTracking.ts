import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let enabled = false;

function stringifyUnknown(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(stringifyUnknown(error));
}

export function initializeErrorTracking(): void {
  if (!env.SENTRY_DSN) {
    logger.info('Error tracking disabled: SENTRY_DSN is not set');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.APP_ENV,
    release: env.APP_RELEASE || undefined,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });

  enabled = true;
  logger.info('Error tracking enabled', {
    environment: env.APP_ENV,
    release: env.APP_RELEASE || null,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        if (value !== undefined) {
          scope.setExtra(key, value);
        }
      }
    }

    Sentry.captureException(normalizeError(error));
  });
}

export async function flushErrorTracking(timeoutMs = 2000): Promise<void> {
  if (!enabled) {
    return;
  }

  await Sentry.flush(timeoutMs);
}