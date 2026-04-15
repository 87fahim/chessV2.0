import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

const registerSchema = z.object({
  username: z.string().min(1),
  email: z.string().min(1),
  password: z.string().min(1),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.registerUser(input);

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

  res.json({
    success: true,
    data: {
      user: result.user.toJSON(),
      tokens: result.tokens,
    },
  });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // With JWT, logout is client-side (discard token).
  // For enhanced security, you could maintain a token blacklist.
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
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await authService.refreshTokens(refreshToken);

  res.json({
    success: true,
    data: { tokens },
  });
});
