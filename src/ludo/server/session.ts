import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME?.trim() || 'ludo_sid'
const SESSION_TTL_DAYS = Number.parseInt(process.env.SESSION_TTL_DAYS ?? '30', 10)

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {}
  }

  const cookies: Record<string, string> = {}
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.split('=')
    const name = rawName?.trim()
    if (!name) {
      continue
    }

    cookies[name] = decodeURIComponent(rawValue.join('=').trim())
  }

  return cookies
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function getSessionToken(request: Request): string | null {
  const cookies = parseCookies(request.headers.cookie)
  const token = cookies[SESSION_COOKIE_NAME]
  return token && token.length > 0 ? token : null
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function getSessionExpiresAt(now: Date = new Date()): Date {
  const ttl = Number.isFinite(SESSION_TTL_DAYS) && SESSION_TTL_DAYS > 0 ? SESSION_TTL_DAYS : 30
  const expiresAt = new Date(now)
  expiresAt.setUTCDate(expiresAt.getUTCDate() + ttl)
  return expiresAt
}

export function ensureSessionToken(request: Request, response: Response): string {
  const existing = getSessionToken(request)
  if (existing) {
    return existing
  }

  const token = createSessionToken()
  response.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: getSessionExpiresAt(),
  })

  return token
}
