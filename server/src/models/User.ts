import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin'],
    },
  },
  {
    timestamps: true,
  }
);

// Never return passwordHash in JSON
userSchema.set('toJSON', {
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
} as object);

export const User = mongoose.model<IUser>('User', userSchema);
