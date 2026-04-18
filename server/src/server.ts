import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env, validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { initializeSocketIO, shutdownSocketIO } from './sockets/index.js';
import { initializeStockfish, shutdownStockfish } from './services/stockfishService.js';
import { backfillUserDomainRecords } from './services/userBackfillService.js';
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

  // Connect to MongoDB Atlas
  await connectDB();

  // Proactively create profile/settings/stats/social records for existing users
  await backfillUserDomainRecords();

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
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    shutdownSocketIO();
    await shutdownStockfish();
    io.close();
    server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
