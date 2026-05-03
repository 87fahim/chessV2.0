import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { captureException } from '../monitoring/errorTracking.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorMiddleware(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const details = err.errors.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    logger.warn('Validation failed', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      details,
    });

    res.status(400).json({
      error: 'Validation failed',
      requestId: req.requestId,
      details,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  const logMeta = {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    userId: req.user?.userId,
    errorMessage: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    captureException(err, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      userId: req.user?.userId,
    });
    logger.error('Request failed', logMeta);
  } else {
    logger.warn('Request failed', logMeta);
  }

  res.status(statusCode).json({
    error: message,
    requestId: req.requestId,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(statusCode: number, message: string): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}
