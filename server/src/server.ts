import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env, validateEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { initializeSocketIO, shutdownSocketIO } from './sockets/index.js';
import { initializeStockfish, shutdownStockfish } from './services/stockfishService.js';
import { logger } from './utils/logger.js';
import app from './app.js';

async function main(): Promise<void> {
  // Validate environment
  validateEnv();

  // Connect to MongoDB Atlas
  await connectDB();

  // Start Stockfish engine
  await initializeStockfish();

  // Create HTTP server
  const server = http.createServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(server, {
    cors: {
      origin: env.CLIENT_URL,
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
