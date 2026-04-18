import cors from 'cors';
import { env } from './env.js';

const devOriginPattern = /^http:\/\/localhost:\d+$/;

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, server-to-server)
    if (!origin) return callback(null, true);

    // In development, accept any localhost port (Vite may pick a free port)
    if (env.APP_ENV === 'development' && devOriginPattern.test(origin)) {
      return callback(null, true);
    }

    // Otherwise, match the configured CLIENT_URL exactly
    if (origin === env.CLIENT_URL) return callback(null, true);

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
