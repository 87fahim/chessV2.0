import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
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

// The app runs behind a single reverse proxy in staging/production; trusting
// it makes req.ip resolve to the real client so per-IP rate limits work.
app.set('trust proxy', 1);

// Global middleware
app.use(helmet());
app.disable('x-powered-by');
app.use(cors(corsOptions));
app.use(requestContextMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', async (_req, res) => {
  let databaseOk = false;

  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.admin().ping();
      databaseOk = true;
    } catch {
      databaseOk = false;
    }
  }

  const statusCode = databaseOk ? 200 : 503;
  // Keep the public health payload minimal to avoid leaking deployment metadata.
  res.status(statusCode).json({
    status: databaseOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: { ok: databaseOk },
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
