import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type AppEnv = 'development' | 'staging' | 'production';

function resolveAppEnv(): AppEnv {
  const rawAppEnv = process.env.APP_ENV?.trim().toLowerCase();
  if (rawAppEnv === 'staging' || rawAppEnv === 'production' || rawAppEnv === 'development') {
    return rawAppEnv;
  }

  const rawNodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  if (rawNodeEnv === 'production') {
    return 'production';
  }

  return 'development';
}

const appEnv = resolveAppEnv();
const baseEnvPath = path.resolve(__dirname, '../../.env');
const modeEnvPath = path.resolve(__dirname, `../../.env.${appEnv}`);

dotenv.config({ path: baseEnvPath, override: appEnv === 'development' });

let envFile: dotenv.DotenvConfigOutput | undefined;
if (appEnv !== 'development') {
  envFile = dotenv.config({ path: modeEnvPath, override: true });
}

// Debug: log env file resolution for troubleshooting
console.log(`[env] APP_ENV=${appEnv}, baseEnv=${baseEnvPath}, modeEnv=${modeEnvPath}`);
if (envFile?.error) {
  console.warn(`[env] Failed to load ${modeEnvPath}: ${envFile.error.message}`);
} else if (envFile?.parsed) {
  console.log(`[env] Loaded ${modeEnvPath} (keys: ${Object.keys(envFile.parsed).join(', ')})`);
}

const defaultStockfishPath = process.platform === 'win32'
  ? 'C:/Program Files/stockfish/stockfish-windows-x86-64-avx2.exe'
  : '/usr/games/stockfish';

export const env = {
  APP_ENV: appEnv,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || '',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  STOCKFISH_PATH:
    envFile?.parsed?.STOCKFISH_PATH ||
    process.env.STOCKFISH_PATH ||
    defaultStockfishPath,
} as const;

export function validateEnv(): void {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
