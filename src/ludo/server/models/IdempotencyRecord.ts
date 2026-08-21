import mongoose, { Schema } from 'mongoose'

interface IdempotencyRecordDocument {
  sessionHash: string
  scope: string
  key: string
  statusCode: number
  responseBody: unknown
  createdAt: Date
  updatedAt: Date
}

const idempotencyRecordSchema = new Schema<IdempotencyRecordDocument>(
  {
    sessionHash: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    scope: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    collection: 'idempotency_records',
    timestamps: true,
  },
)

idempotencyRecordSchema.index({ sessionHash: 1, scope: 1, key: 1 }, { unique: true })

export const IdempotencyRecord =
  mongoose.models.IdempotencyRecord ||
  mongoose.model<IdempotencyRecordDocument>('IdempotencyRecord', idempotencyRecordSchema)
