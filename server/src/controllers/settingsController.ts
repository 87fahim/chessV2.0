import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as settingsService from '../services/settingsService.js';

const updateSettingsSchema = z.object({
  boardTheme: z.string().optional(),
  moveColorTheme: z.string().optional(),
  pieceTheme: z.string().optional(),
  boardOrientation: z.enum(['white_bottom', 'black_bottom', 'auto']).optional(),
  soundEnabled: z.boolean().optional(),
  moveSoundEnabled: z.boolean().optional(),
  captureSoundEnabled: z.boolean().optional(),
  checkSoundEnabled: z.boolean().optional(),
  puzzleFeedbackSoundEnabled: z.boolean().optional(),
  animationEnabled: z.boolean().optional(),
  showCoordinates: z.boolean().optional(),
  showLegalMoves: z.boolean().optional(),
  highlightLastMove: z.boolean().optional(),
  highlightCheck: z.boolean().optional(),
  appearanceMode: z.enum(['light', 'dark', 'system']).optional(),
  showNotationPanel: z.boolean().optional(),
  showEvaluationPanel: z.boolean().optional(),
  largerBoardDisplay: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  simplifiedIndicators: z.boolean().optional(),
  preferredColor: z.enum(['white', 'black', 'random']).optional(),
  preferredGameType: z.enum(['casual', 'rated', 'friend_match']).optional(),
  defaultDifficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  autoPromotion: z.boolean().optional(),
  moveConfirmation: z.boolean().optional(),
  moveInputMethod: z.enum(['drag_and_drop', 'tap_to_move']).optional(),
  practiceFreeMove: z.boolean().optional(),
  practiceHintsEnabled: z.boolean().optional(),
  practiceUnlimitedUndo: z.boolean().optional(),
  analysisEngineStrength: z.enum(['easy', 'medium', 'hard']).optional(),
  analysisDefaultDepth: z.number().min(1).max(30).optional(),
  analysisShowBestLine: z.boolean().optional(),
  defaultTimeControl: z.string().optional(),
  boardFlipped: z.boolean().optional(),
  language: z.string().max(10).optional(),
  inviteNotifications: z.boolean().optional(),
  matchNotifications: z.boolean().optional(),
  puzzleReminders: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  friendRequestPolicy: z.enum(['everyone', 'friends_of_friends', 'nobody']).optional(),
  directChallengePolicy: z.enum(['everyone', 'friends_only', 'nobody']).optional(),
  gameHistoryVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
  profileVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
  onlinePresenceVisibility: z.enum(['everyone', 'friends_only', 'nobody']).optional(),
  spectatorPolicy: z.enum(['everyone', 'friends_only', 'nobody']).optional(),
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
