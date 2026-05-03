import { type CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';
import { createError } from '../middleware/errorMiddleware.js';
import { env } from '../config/env.js';
import { durationToMs } from '../utils/duration.js';

const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.APP_ENV !== 'development',
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
};

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, refreshTokenCookieOptions);
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    ...refreshTokenCookieOptions,
    maxAge: undefined,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.registerUser(input);
  setRefreshTokenCookie(res, result.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: result.user.toJSON(),
      tokens: result.tokens,
    },
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.loginUser(input);
  setRefreshTokenCookie(res, result.refreshToken);

  res.json({
    success: true,
    data: {
      user: result.user.toJSON(),
      tokens: result.tokens,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
  if (refreshToken) {
    await authService.revokeRefreshToken(refreshToken);
  }

  clearRefreshTokenCookie(res);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserById(req.user!.userId);

  res.json({
    success: true,
    data: { user: user.toJSON() },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    throw createError(401, 'Refresh token is required');
  }

  try {
    const result = await authService.refreshTokens(refreshToken);
    setRefreshTokenCookie(res, result.refreshToken);

    res.json({
      success: true,
      data: { tokens: result.tokens },
    });
  } catch (error) {
    clearRefreshTokenCookie(res);
    throw error;
  }
});
