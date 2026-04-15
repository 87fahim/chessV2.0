import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMatchmakingQueue extends Document {
  userId: Types.ObjectId;
  username: string;
  rating: number;
  preferredColor: string;
  rated: boolean;
  timeControl: {
    initialMs: number;
    incrementMs: number;
  };
  joinedAt: Date;
}

const matchmakingQueueSchema = new Schema<IMatchmakingQueue>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 1200,
  },
  preferredColor: {
    type: String,
    default: 'random',
    enum: ['white', 'black', 'random'],
  },
  rated: {
    type: Boolean,
    default: false,
  },
  timeControl: {
    initialMs: { type: Number, required: true },
    incrementMs: { type: Number, required: true, default: 0 },
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

export const MatchmakingQueue = mongoose.model<IMatchmakingQueue>(
  'MatchmakingQueue',
  matchmakingQueueSchema
);
