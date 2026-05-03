import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env, validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { captureException, flushErrorTracking, initializeErrorTracking } from './monitoring/errorTracking.js';
import { initializeSocketIO, shutdownSocketIO } from './sockets/index.js';
import { initializeStockfish, shutdownStockfish } from './services/stockfishService.js';
import { logger } from './utils/logger.js';
import app from './app.js';

async function initializeEngineServices(): Promise<void> {
  try {
    await initializeStockfish();
  } catch (error) {
    if (env.APP_ENV === 'development') {
      logger.warn('Stockfish is unavailable in development. Analysis endpoints will fail until STOCKFISH_PATH is fixed.');
      logger.warn(error instanceof Error ? error.message : 'Unknown Stockfish startup error');
      return;
    }

    throw error;
  }
}

async function main(): Promise<void> {
  // Validate environment
  validateEnv();
  initializeErrorTracking();

  // Connect to MongoDB Atlas
  await connectDB();

  // Start Stockfish engine
  await initializeEngineServices();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.APP_ENV === 'development'
        ? /^http:\/\/localhost:\d+$/
        : env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  initializeSocketIO(io);

  // Start listening
  server.listen(env.PORT, () => {
    logger.info(`🚀 Server running on port ${env.PORT}`);
    logger.info(`📡 Environment: ${env.NODE_ENV}`);
    logger.info(`🌐 Client URL: ${env.CLIENT_URL}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info('Shutting down gracefully', { signal });
    shutdownSocketIO();
    await shutdownStockfish();
    io.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await flushErrorTracking();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
  captureException(reason, { type: 'unhandledRejection' });
});

process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception', error);
  captureException(error, { type: 'uncaughtException' });
  await flushErrorTracking();
  process.exit(1);
});

main().catch(async (error) => {
  logger.error('Failed to start server', error);
  captureException(error, { type: 'startup' });
  await flushErrorTracking();
  process.exit(1);
});
