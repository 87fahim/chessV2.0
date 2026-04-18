import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  passwordChangedAt?: Date;
  failedLoginCount: number;
  authProvider: string;
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
      enum: ['user', 'admin', 'moderator'],
    },
    status: {
      type: String,
      default: 'active',
      enum: ['active', 'pending_verification', 'suspended', 'deactivated'],
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    failedLoginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    authProvider: {
      type: String,
      default: 'local',
      enum: ['local', 'google', 'apple', 'other'],
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

// Never return passwordHash in JSON
userSchema.set('toJSON', {
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
} as object);

export const User = mongoose.model<IUser>('User', userSchema);
