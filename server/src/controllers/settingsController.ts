import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as settingsService from '../services/settingsService.js';

const updateSettingsSchema = z.object({
  boardTheme: z.string().optional(),
  pieceTheme: z.string().optional(),
  soundEnabled: z.boolean().optional(),
  animationEnabled: z.boolean().optional(),
  showCoordinates: z.boolean().optional(),
  preferredColor: z.enum(['white', 'black', 'random']).optional(),
  defaultDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  defaultTimeControl: z.string().optional(),
  boardFlipped: z.boolean().optional(),
  language: z.string().max(10).optional(),
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.getSettings(req.user!.userId);

  res.json({ success: true, data: { settings } });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const update = updateSettingsSchema.parse(req.body);
  const settings = await settingsService.updateSettings(req.user!.userId, update);

  res.json({ success: true, data: { settings } });
});
