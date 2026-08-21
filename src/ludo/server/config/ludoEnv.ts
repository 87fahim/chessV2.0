import dotenv from 'dotenv'

dotenv.config()

function parsePort(rawValue: string | undefined): number {
  const fallback = 8787
  if (!rawValue) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const ludoEnv = {
  port: parsePort(process.env.PORT),
  mongoUri: process.env.MONGODB_URI?.trim() || process.env.MONGO_URI?.trim() || '',
  mongoDbName: process.env.MONGODB_DB?.trim() || 'ludo',
} as const

export function validateLudoEnv(): void {
  if (!ludoEnv.mongoUri) {
    throw new Error('Missing required environment variable: MONGODB_URI (or MONGO_URI).')
  }
}
