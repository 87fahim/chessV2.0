import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { requestContextMiddleware } from './middleware/requestContextMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import matchmakingRoutes from './routes/matchmakingRoutes.js';
import guestRoutes from './routes/guestRoutes.js';
import engineRoutes from './routes/engineRoutes.js';
import userRoutes from './routes/userRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';

const app = express();
const mongoConnectionStates: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Global middleware
app.use(helmet());
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(requestContextMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  const startedAt = Date.now();
  const database = {
    state: mongoConnectionStates[mongoose.connection.readyState] || 'unknown',
    ok: false,
    pingMs: null as number | null,
    error: null as string | null,
  };

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      const pingStartedAt = Date.now();
      await mongoose.connection.db.admin().ping();
      database.ok = true;
      database.pingMs = Date.now() - pingStartedAt;
    } catch {
      database.error = 'ping_failed';
    }
  }

  const statusCode = database.ok ? 200 : 503;
  res.status(statusCode).json({
    status: database.ok ? 'ok' : 'degraded',
    environment: env.APP_ENV,
    release: env.APP_RELEASE || null,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startedAt,
    requestId: req.requestId || null,
    database,
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/engine', engineRoutes);
app.use('/api/user', userRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorMiddleware);

export default app;
