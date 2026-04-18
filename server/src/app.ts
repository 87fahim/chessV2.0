import express from 'express';
import cors from 'cors';
import { corsOptions } from './config/cors.js';
import { errorMiddleware } from './middleware/errorMiddleware.js';
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

// Global middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
