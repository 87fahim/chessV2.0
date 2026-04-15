import mongoose, { Schema, Document } from 'mongoose';

export interface IGuestSession extends Document {
  guestId: string;
  createdAt: Date;
  lastSeenAt: Date;
}

const guestSessionSchema = new Schema<IGuestSession>({
  guestId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
});

// Auto-expire guest sessions after 30 days of inactivity
guestSessionSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const GuestSession = mongoose.model<IGuestSession>('GuestSession', guestSessionSchema);
