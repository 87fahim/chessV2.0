import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserStats extends Document {
  userId: Types.ObjectId;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  onlineGamesPlayed: number;
  engineGamesPlayed: number;
  practiceGamesPlayed: number;
  puzzleSolved: number;
  puzzleAttempted: number;
  practiceSessions: number;
  analysisRequests: number;
  timeoutCount: number;
  disconnectCount: number;
  invitesSent: number;
  invitesAccepted: number;
  invitesDeclined: number;
  whiteGamesPlayed: number;
  blackGamesPlayed: number;
  updatedAt: Date;
}

const userStatsSchema = new Schema<IUserStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    onlineGamesPlayed: { type: Number, default: 0, min: 0 },
    engineGamesPlayed: { type: Number, default: 0, min: 0 },
    practiceGamesPlayed: { type: Number, default: 0, min: 0 },
    puzzleSolved: { type: Number, default: 0, min: 0 },
    puzzleAttempted: { type: Number, default: 0, min: 0 },
    practiceSessions: { type: Number, default: 0, min: 0 },
    analysisRequests: { type: Number, default: 0, min: 0 },
    timeoutCount: { type: Number, default: 0, min: 0 },
    disconnectCount: { type: Number, default: 0, min: 0 },
    invitesSent: { type: Number, default: 0, min: 0 },
    invitesAccepted: { type: Number, default: 0, min: 0 },
    invitesDeclined: { type: Number, default: 0, min: 0 },
    whiteGamesPlayed: { type: Number, default: 0, min: 0 },
    blackGamesPlayed: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

export const UserStats = mongoose.model<IUserStats>('UserStats', userStatsSchema);
