import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserActivity extends Document {
  userId: Types.ObjectId;
  activityType: string;
  feature: string;
  gameId?: Types.ObjectId;
  puzzleId?: string;
  fen?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const userActivitySchema = new Schema<IUserActivity>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      required: true,
      enum: [
        'login',
        'game_completed',
        'game_saved',
        'matchmaking_join',
        'friend_invite',
        'practice_session',
        'puzzle_attempt',
        'analysis_request',
        'fen_saved',
      ],
    },
    feature: {
      type: String,
      required: true,
      enum: ['auth', 'game', 'matchmaking', 'social', 'practice', 'puzzle', 'analysis'],
    },
    gameId: {
      type: Schema.Types.ObjectId,
      ref: 'Game',
    },
    puzzleId: {
      type: String,
    },
    fen: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userActivitySchema.index({ userId: 1, createdAt: -1 });
userActivitySchema.index({ userId: 1, activityType: 1 });

export const UserActivity = mongoose.model<IUserActivity>('UserActivity', userActivitySchema);
