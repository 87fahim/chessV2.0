import { UserSettings, IUserSettings } from '../models/UserSettings.js';
import { createError } from '../middleware/errorMiddleware.js';

export interface SettingsUpdate {
  boardTheme?: string;
  pieceTheme?: string;
  soundEnabled?: boolean;
  animationEnabled?: boolean;
  showCoordinates?: boolean;
  preferredColor?: string;
  defaultDifficulty?: string;
  defaultTimeControl?: string;
  boardFlipped?: boolean;
  language?: string;
}

export async function getSettings(userId: string): Promise<IUserSettings> {
  let settings = await UserSettings.findOne({ userId });

  if (!settings) {
    // Create default settings if they don't exist
    settings = await UserSettings.create({ userId });
  }

  return settings;
}

export async function updateSettings(userId: string, update: SettingsUpdate): Promise<IUserSettings> {
  const settings = await UserSettings.findOneAndUpdate(
    { userId },
    { $set: update },
    { new: true, upsert: true, runValidators: true }
  );

  if (!settings) {
    throw createError(500, 'Failed to update settings');
  }

  return settings;
}
