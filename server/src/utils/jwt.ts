import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenId: string;
  familyId: string;
}

const ACCESS_SIGN_OPTIONS = {
  expiresIn: env.JWT_EXPIRES_IN,
  algorithm: 'HS256',
} as SignOptions;

const REFRESH_SIGN_OPTIONS = {
  expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  algorithm: 'HS256',
} as SignOptions;

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload as object, env.JWT_SECRET, ACCESS_SIGN_OPTIONS);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload as object, env.JWT_REFRESH_SECRET, REFRESH_SIGN_OPTIONS);
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}
