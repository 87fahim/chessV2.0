import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine which .env file to load: .env.production, .env.staging, or .env
const nodeEnv = process.env.NODE_ENV || 'development';
const envSuffix = nodeEnv === 'development' ? '' : `.${nodeEnv}`;
const envPath = path.resolve(__dirname, `../../.env${envSuffix}`);
const envFile = dotenv.config({ path: envPath });

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  STOCKFISH_PATH:
    envFile.parsed?.STOCKFISH_PATH ||
    process.env.STOCKFISH_PATH ||
    'C:/Program Files/stockfish/stockfish-windows-x86-64-avx2.exe',
} as const;

export function validateEnv(): void {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
