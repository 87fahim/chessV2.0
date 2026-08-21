import mongoose, { Schema } from 'mongoose'

interface UserDocument {
  name: string
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
  },
  {
    collection: 'user',
    timestamps: true,
  },
)

export const User = mongoose.models.User || mongoose.model<UserDocument>('User', userSchema)
