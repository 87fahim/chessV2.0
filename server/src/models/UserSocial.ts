import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserSocial extends Document {
  userId: Types.ObjectId;
  friends: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];
  incomingFriendRequests: Types.ObjectId[];
  outgoingFriendRequests: Types.ObjectId[];
  friendRequestPolicy: string;
  directChallengePolicy: string;
  showOnlineStatus: boolean;
  profileVisibility: string;
  gameHistoryVisibility: string;
  createdAt: Date;
  updatedAt: Date;
}

const objectIdArray = [{ type: Schema.Types.ObjectId, ref: 'User' }];

const userSocialSchema = new Schema<IUserSocial>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    friends: {
      type: objectIdArray,
      default: [],
    },
    blockedUsers: {
      type: objectIdArray,
      default: [],
    },
    incomingFriendRequests: {
      type: objectIdArray,
      default: [],
    },
    outgoingFriendRequests: {
      type: objectIdArray,
      default: [],
    },
    friendRequestPolicy: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_of_friends', 'nobody'],
    },
    directChallengePolicy: {
      type: String,
      default: 'everyone',
      enum: ['everyone', 'friends_only', 'nobody'],
    },
    showOnlineStatus: {
      type: Boolean,
      default: true,
    },
    profileVisibility: {
      type: String,
      default: 'public',
      enum: ['public', 'friends_only', 'private'],
    },
    gameHistoryVisibility: {
      type: String,
      default: 'friends_only',
      enum: ['public', 'friends_only', 'private'],
    },
  },
  {
    timestamps: true,
  }
);

export const UserSocial = mongoose.model<IUserSocial>('UserSocial', userSocialSchema);
