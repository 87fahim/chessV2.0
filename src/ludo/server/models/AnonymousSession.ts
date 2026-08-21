import mongoose, { Schema } from 'mongoose'

interface AnonymousSessionDocument {
  sessionHash: string
  gameId: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const anonymousSessionSchema = new Schema<AnonymousSessionDocument>(
  {
    sessionHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    gameId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    collection: 'anonymous_sessions',
    timestamps: true,
  },
)

export const AnonymousSession =
  mongoose.models.AnonymousSession ||
  mongoose.model<AnonymousSessionDocument>('AnonymousSession', anonymousSessionSchema)
