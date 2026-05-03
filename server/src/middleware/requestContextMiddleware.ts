import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

function resolveRequestId(req: Request): string {
  const headerValue = req.headers['x-request-id'];

  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue) && headerValue[0]?.trim()) {
    return headerValue[0].trim();
  }

  return randomUUID();
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  const requestId = resolveRequestId(req);

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const requestMeta = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      userId: req.user?.userId || null,
      clientIp: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP request completed with server error', requestMeta);
      return;
    }

    if (durationMs >= env.SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn('Slow HTTP request', requestMeta);
      return;
    }

    logger.info('HTTP request completed', requestMeta);
  });

  next();
}