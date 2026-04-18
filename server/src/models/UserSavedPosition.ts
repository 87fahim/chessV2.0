import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserSavedPosition extends Document {
  userId: Types.ObjectId;
  name: string;
  fen: string;
  notes?: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSavedPositionSchema = new Schema<IUserSavedPosition>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    fen: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    source: {
      type: String,
      default: 'analysis',
      enum: ['analysis', 'practice', 'game', 'other'],
    },
  },
  {
    timestamps: true,
  }
);

userSavedPositionSchema.index({ userId: 1, updatedAt: -1 });

export const UserSavedPosition = mongoose.model<IUserSavedPosition>('UserSavedPosition', userSavedPositionSchema);
