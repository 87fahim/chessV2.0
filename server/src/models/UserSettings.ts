import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  boardTheme: string;
  pieceTheme: string;
  soundEnabled: boolean;
  animationEnabled: boolean;
  showCoordinates: boolean;
  preferredColor: string;
  defaultDifficulty: string;
  defaultTimeControl: string;
  boardFlipped: boolean;
  language: string;
  updatedAt: Date;
}

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    boardTheme: {
      type: String,
      default: 'default',
    },
    pieceTheme: {
      type: String,
      default: 'default',
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    animationEnabled: {
      type: Boolean,
      default: true,
    },
    showCoordinates: {
      type: Boolean,
      default: true,
    },
    preferredColor: {
      type: String,
      default: 'random',
      enum: ['white', 'black', 'random'],
    },
    defaultDifficulty: {
      type: String,
      default: 'medium',
      enum: ['easy', 'medium', 'hard'],
    },
    defaultTimeControl: {
      type: String,
      default: '10+0',
    },
    boardFlipped: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      default: 'en',
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);
