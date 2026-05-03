import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  boardTheme: string;
  moveColorTheme: string;
  pieceTheme: string;
  boardOrientation: string;
  soundEnabled: boolean;
  moveSoundEnabled: boolean;
  captureSoundEnabled: boolean;
  checkSoundEnabled: boolean;
  puzzleFeedbackSoundEnabled: boolean;
  animationEnabled: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  highlightCheck: boolean;
  appearanceMode: string;
  showNotationPanel: boolean;
  showEvaluationPanel: boolean;
  largerBoardDisplay: boolean;
  highContrast: boolean;
  simplifiedIndicators: boolean;
  preferredColor: string;
  preferredGameType: string;
  defaultDifficulty: string;
  autoPromotion: boolean;
  moveConfirmation: boolean;
  moveInputMethod: string;
  practiceFreeMove: boolean;
  practiceHintsEnabled: boolean;
  practiceUnlimitedUndo: boolean;
  analysisEngineStrength: string;
  analysisDefaultDepth: number;
  analysisShowBestLine: boolean;
  defaultTimeControl: string;
  boardFlipped: boolean;
  language: string;
  inviteNotifications: boolean;
  matchNotifications: boolean;
  puzzleReminders: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  friendRequestPolicy: string;
  directChallengePolicy: string;
  gameHistoryVisibility: string;
  profileVisibility: string;
  onlinePresenceVisibility: string;
  spectatorPolicy: string;
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
      default: 'wood2',
    },
    moveColorTheme: {
      type: String,
      default: 'classic',
    },
    pieceTheme: {
      type: String,
      default: 'default',
    },
    boardOrientation: {
      type: String,
      default: 'auto',
      enum: ['white_bottom', 'black_bottom', 'auto'],
    },
    soundEnabled: {
      type: Boolean,
      default: true,
    },
    moveSoundEnabled: {
      type: Boolean,
      default: true,
    },
    captureSoundEnabled: {
      type: Boolean,
      default: true,
    },
    checkSoundEnabled: {
      type: Boolean,
      default: true,
    },
    puzzleFeedbackSoundEnabled: {
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
    showLegalMoves: {
      type: Boolean,
      default: true,
    },
    highlightLastMove: {
      type: Boolean,
      default: true,
    },
    highlightCheck: {
      type: Boolean,
      default: true,
    },
    appearanceMode: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'system'],
    },
    showNotationPanel: {
      type: Boolean,
      default: true,
    },
    showEvaluationPanel: {
      type: Boolean,
      default: true,
    },
    largerBoardDisplay: {
      type: Boolean,
      default: false,
    },
    highContrast: {
      type: Boolean,
      default: false,
    },
    simplifiedIndicators: {
      type: Boolean,
      default: false,
    },
    preferredColor: {
      type: String,
      default: 'random',
      enum: ['white', 'black', 'random'],
    },
    preferredGameType: {
      type: String,
      default: 'casual',
      enum: ['casual', 'rated', 'friend_match'],
    },
    defaultDifficulty: {
      type: String,
      default: 'medium',
      enum: ['easy', 'medium', 'hard'],
    },
    autoPromotion: {
      type: Boolean,
      default: false,
    },
    moveConfirmation: {
      type: Boolean,
      default: false,
    },
    moveInputMethod: {
      type: String,
      default: 'drag_and_drop',
      enum: ['drag_and_drop', 'tap_to_move'],
    },
    practiceFreeMove: {
      type: Boolean,
      default: true,
    },
    practiceHintsEnabled: {
      type: Boolean,
      default: true,
    },
    practiceUnlimitedUndo: {
      type: Boolean,
      default: true,
    },
    analysisEngineStrength: {
      type: String,
      default: 'medium',
      enum: ['easy', 'medium', 'hard'],
    },
    analysisDefaultDepth: {
      type: Number,
      default: 12,
      min: 1,
      max: 30,
    },
    analysisShowBestLine: {
      type: Boolean,
      default: true,
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
    inviteNotifications: {
      type: Boolean,
      default: true,
    },
    matchNotifications: {
      type: Boolean,
      default: true,
    },
    puzzleReminders: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
    pushNotifications: {
      type: Boolean,
      default: false,
    },
    friendRequestPolicy: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_of_friends', 'nobody'],
    },
    directChallengePolicy: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_only', 'nobody'],
    },
    gameHistoryVisibility: {
      type: String,
      default: 'friends_only',
      enum: ['public', 'friends_only', 'private'],
    },
    profileVisibility: {
      type: String,
      default: 'public',
      enum: ['public', 'friends_only', 'private'],
    },
    onlinePresenceVisibility: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_only', 'nobody'],
    },
    spectatorPolicy: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_only', 'nobody'],
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);
