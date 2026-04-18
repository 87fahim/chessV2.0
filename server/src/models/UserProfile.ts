import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserProfile extends Document {
  userId: Types.ObjectId;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language: string;
  searchableByUsername: boolean;
  searchableByFriendCode: boolean;
  searchableByEmail: boolean;
  onlineVisibility: string;
  profileVisibility: string;
  identityDisplayMode: string;
  friendCode: string;
  createdAt: Date;
  updatedAt: Date;
}

const userProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 240,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    timezone: {
      type: String,
      trim: true,
      maxlength: 64,
    },
    language: {
      type: String,
      default: 'en',
      maxlength: 10,
    },
    searchableByUsername: {
      type: Boolean,
      default: true,
    },
    searchableByFriendCode: {
      type: Boolean,
      default: true,
    },
    searchableByEmail: {
      type: Boolean,
      default: false,
    },
    onlineVisibility: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_only', 'nobody'],
    },
    profileVisibility: {
      type: String,
      default: 'public',
      enum: ['public', 'friends_only', 'private'],
    },
    identityDisplayMode: {
      type: String,
      default: 'display_name',
      enum: ['username', 'display_name', 'both'],
    },
    friendCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 8,
      maxlength: 8,
    },
  },
  {
    timestamps: true,
  }
);

userProfileSchema.index({ displayName: 1 });
userProfileSchema.index({ friendCode: 1 }, { unique: true });

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', userProfileSchema);
