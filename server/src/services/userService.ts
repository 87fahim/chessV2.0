import { Types } from 'mongoose';
import { User } from '../models/User.js';
import { UserProfile, IUserProfile } from '../models/UserProfile.js';
import { UserSettings, IUserSettings } from '../models/UserSettings.js';
import { UserStats, IUserStats } from '../models/UserStats.js';
import { UserSocial, IUserSocial } from '../models/UserSocial.js';
import { UserActivity, IUserActivity } from '../models/UserActivity.js';
import { UserSavedPosition, IUserSavedPosition } from '../models/UserSavedPosition.js';
import { Game } from '../models/Game.js';
import { createError } from '../middleware/errorMiddleware.js';

export interface ProfileUpdateInput {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language?: string;
  searchableByUsername?: boolean;
  searchableByFriendCode?: boolean;
  searchableByEmail?: boolean;
  onlineVisibility?: 'everyone' | 'friends_only' | 'nobody';
  profileVisibility?: 'public' | 'friends_only' | 'private';
  identityDisplayMode?: 'username' | 'display_name' | 'both';
}

export interface SocialUpdateInput {
  friendRequestPolicy?: 'everyone' | 'friends_of_friends' | 'nobody';
  directChallengePolicy?: 'everyone' | 'friends_only' | 'nobody';
  showOnlineStatus?: boolean;
  profileVisibility?: 'public' | 'friends_only' | 'private';
  gameHistoryVisibility?: 'public' | 'friends_only' | 'private';
}

export interface ActivityInput {
  activityType:
    | 'login'
    | 'game_completed'
    | 'game_saved'
    | 'matchmaking_join'
    | 'friend_invite'
    | 'practice_session'
    | 'puzzle_attempt'
    | 'analysis_request'
    | 'fen_saved';
  feature: 'auth' | 'game' | 'matchmaking' | 'social' | 'practice' | 'puzzle' | 'analysis';
  gameId?: string;
  puzzleId?: string;
  fen?: string;
  metadata?: Record<string, unknown>;
}

export interface SavePositionInput {
  name: string;
  fen: string;
  notes?: string;
  source?: 'analysis' | 'practice' | 'game' | 'other';
}

function randomFriendCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 8; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

async function generateUniqueFriendCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = randomFriendCode();
    const exists = await UserProfile.exists({ friendCode: code });
    if (!exists) {
      return code;
    }
  }
  throw createError(500, 'Unable to generate unique friend code');
}

export async function ensureUserDomainRecords(userId: string, username: string): Promise<void> {
  const friendCode = await generateUniqueFriendCode();

  await Promise.all([
    UserProfile.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          displayName: username,
          language: 'en',
          friendCode,
        },
      },
      { upsert: true, new: true }
    ),
    UserSettings.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true, new: true }
    ),
    UserStats.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true, new: true }
    ),
    UserSocial.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
        },
      },
      { upsert: true, new: true }
    ),
  ]);
}

export async function getUserProfile(userId: string): Promise<IUserProfile> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }

  await ensureUserDomainRecords(userId, user.username);

  const profile = await UserProfile.findOne({ userId });
  if (!profile) {
    throw createError(500, 'Failed to load user profile');
  }

  return profile;
}

export async function updateUserProfile(userId: string, update: ProfileUpdateInput): Promise<IUserProfile> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }

  const profile = await UserProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...update,
      },
      $setOnInsert: {
        userId,
        displayName: user.username,
        friendCode: await generateUniqueFriendCode(),
      },
    },
    { upsert: true, new: true, runValidators: true }
  );

  if (!profile) {
    throw createError(500, 'Failed to update user profile');
  }

  return profile;
}

export async function getUserSocial(userId: string): Promise<IUserSocial> {
  let social = await UserSocial.findOne({ userId })
    .populate('friends', 'username email')
    .populate('blockedUsers', 'username email')
    .populate('incomingFriendRequests', 'username email')
    .populate('outgoingFriendRequests', 'username email');

  if (!social) {
    social = await UserSocial.create({ userId });
    social = await UserSocial.findOne({ userId })
      .populate('friends', 'username email')
      .populate('blockedUsers', 'username email')
      .populate('incomingFriendRequests', 'username email')
      .populate('outgoingFriendRequests', 'username email');
  }

  if (!social) {
    throw createError(500, 'Failed to load social settings');
  }

  return social;
}

export async function updateUserSocial(userId: string, update: SocialUpdateInput): Promise<IUserSocial> {
  const social = await UserSocial.findOneAndUpdate(
    { userId },
    { $set: update },
    { upsert: true, new: true, runValidators: true }
  )
    .populate('friends', 'username email')
    .populate('blockedUsers', 'username email')
    .populate('incomingFriendRequests', 'username email')
    .populate('outgoingFriendRequests', 'username email');

  if (!social) {
    throw createError(500, 'Failed to update social settings');
  }

  return social;
}

export async function sendFriendRequest(userId: string, targetUserId: string): Promise<void> {
  if (userId === targetUserId) {
    throw createError(400, 'Cannot send friend request to yourself');
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw createError(404, 'Target user not found');
  }

  await Promise.all([
    UserSocial.updateOne(
      { userId },
      {
        $addToSet: { outgoingFriendRequests: targetUserId },
      },
      { upsert: true }
    ),
    UserSocial.updateOne(
      { userId: targetUserId },
      {
        $addToSet: { incomingFriendRequests: userId },
      },
      { upsert: true }
    ),
    UserStats.updateOne({ userId }, { $inc: { invitesSent: 1 } }, { upsert: true }),
  ]);

  await recordActivity(userId, {
    activityType: 'friend_invite',
    feature: 'social',
    metadata: { targetUserId },
  });
}

export async function acceptFriendRequest(userId: string, requesterUserId: string): Promise<void> {
  const [userObjectId, requesterObjectId] = [new Types.ObjectId(userId), new Types.ObjectId(requesterUserId)];

  await Promise.all([
    UserSocial.updateOne(
      { userId },
      {
        $pull: { incomingFriendRequests: requesterObjectId },
        $addToSet: { friends: requesterObjectId },
      },
      { upsert: true }
    ),
    UserSocial.updateOne(
      { userId: requesterUserId },
      {
        $pull: { outgoingFriendRequests: userObjectId },
        $addToSet: { friends: userObjectId },
      },
      { upsert: true }
    ),
    UserStats.updateOne({ userId: requesterUserId }, { $inc: { invitesAccepted: 1 } }, { upsert: true }),
  ]);
}

export async function declineFriendRequest(userId: string, requesterUserId: string): Promise<void> {
  const [userObjectId, requesterObjectId] = [new Types.ObjectId(userId), new Types.ObjectId(requesterUserId)];

  await Promise.all([
    UserSocial.updateOne(
      { userId },
      {
        $pull: { incomingFriendRequests: requesterObjectId },
      },
      { upsert: true }
    ),
    UserSocial.updateOne(
      { userId: requesterUserId },
      {
        $pull: { outgoingFriendRequests: userObjectId },
      },
      { upsert: true }
    ),
    UserStats.updateOne({ userId: requesterUserId }, { $inc: { invitesDeclined: 1 } }, { upsert: true }),
  ]);
}

export async function blockUser(userId: string, targetUserId: string): Promise<void> {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw createError(404, 'Target user not found');
  }

  const targetObjectId = new Types.ObjectId(targetUserId);

  await UserSocial.updateOne(
    { userId },
    {
      $addToSet: { blockedUsers: targetObjectId },
      $pull: {
        friends: targetObjectId,
        incomingFriendRequests: targetObjectId,
        outgoingFriendRequests: targetObjectId,
      },
    },
    { upsert: true }
  );
}

export async function unblockUser(userId: string, targetUserId: string): Promise<void> {
  await UserSocial.updateOne(
    { userId },
    {
      $pull: { blockedUsers: new Types.ObjectId(targetUserId) },
    },
    { upsert: true }
  );
}

export async function recordActivity(userId: string, input: ActivityInput): Promise<IUserActivity> {
  const activity = await UserActivity.create({
    userId,
    activityType: input.activityType,
    feature: input.feature,
    gameId: input.gameId,
    puzzleId: input.puzzleId,
    fen: input.fen,
    metadata: input.metadata,
  });

  if (input.activityType === 'analysis_request') {
    await UserStats.updateOne({ userId }, { $inc: { analysisRequests: 1 } }, { upsert: true });
  }
  if (input.activityType === 'practice_session') {
    await UserStats.updateOne({ userId }, { $inc: { practiceSessions: 1 } }, { upsert: true });
  }
  if (input.activityType === 'puzzle_attempt') {
    const solved = Boolean(input.metadata?.solved);
    await UserStats.updateOne(
      { userId },
      {
        $inc: {
          puzzleAttempted: 1,
          puzzleSolved: solved ? 1 : 0,
        },
      },
      { upsert: true }
    );
  }

  return activity;
}

export async function getRecentActivity(userId: string, limit = 30): Promise<IUserActivity[]> {
  return UserActivity.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(limit, 100));
}

export async function savePosition(userId: string, input: SavePositionInput): Promise<IUserSavedPosition> {
  const position = await UserSavedPosition.create({
    userId,
    name: input.name,
    fen: input.fen,
    notes: input.notes,
    source: input.source || 'analysis',
  });

  await recordActivity(userId, {
    activityType: 'fen_saved',
    feature: input.source === 'practice' ? 'practice' : 'analysis',
    fen: input.fen,
    metadata: {
      name: input.name,
      source: input.source || 'analysis',
    },
  });

  return position;
}

export async function getSavedPositions(userId: string): Promise<IUserSavedPosition[]> {
  return UserSavedPosition.find({ userId }).sort({ updatedAt: -1 }).limit(100);
}

export async function deleteSavedPosition(userId: string, positionId: string): Promise<void> {
  const deleted = await UserSavedPosition.findOneAndDelete({ _id: positionId, userId });
  if (!deleted) {
    throw createError(404, 'Saved position not found');
  }
}

export async function searchUsers(query: string, currentUserId: string): Promise<Array<{
  userId: string;
  username: string;
  displayName: string;
  friendCode: string;
}>> {
  const normalized = query.trim();
  if (!normalized) {
    return [];
  }

  const [profilesByProfileQuery, usersByUsername] = await Promise.all([
    UserProfile.find({
      userId: { $ne: currentUserId },
      $or: [
        { friendCode: normalized.toUpperCase(), searchableByFriendCode: true },
        { displayName: { $regex: normalized, $options: 'i' } },
      ],
    }).limit(20),
    User.find({
      _id: { $ne: currentUserId },
      username: { $regex: normalized, $options: 'i' },
    }).select('username').limit(20),
  ]);

  const usernameMatchedIds = usersByUsername.map((user) => user._id);
  const profilesByUsername = usernameMatchedIds.length
    ? await UserProfile.find({
        userId: { $in: usernameMatchedIds },
        searchableByUsername: true,
      })
    : [];

  const combinedProfiles = [...profilesByProfileQuery, ...profilesByUsername];
  const uniqueProfiles = new Map(combinedProfiles.map((profile) => [profile.userId.toString(), profile]));
  const userIds = Array.from(uniqueProfiles.keys());
  const users = await User.find({ _id: { $in: userIds } }).select('username');
  const byUserId = new Map(users.map((user) => [user._id.toString(), user.username]));

  return Array.from(uniqueProfiles.values()).map((profile) => ({
    userId: profile.userId.toString(),
    username: byUserId.get(profile.userId.toString()) || profile.displayName,
    displayName: profile.displayName,
    friendCode: profile.friendCode,
  }));
}

export async function refreshUserStatsFromGames(userId: string): Promise<IUserStats> {
  const games = await Game.find({
    status: { $in: ['completed', 'abandoned'] },
    $or: [{ 'whitePlayer.userId': userId }, { 'blackPlayer.userId': userId }],
  }).select('mode result terminationReason whitePlayer blackPlayer');

  let gamesPlayed = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let onlineGamesPlayed = 0;
  let engineGamesPlayed = 0;
  let practiceGamesPlayed = 0;
  let timeoutCount = 0;
  let disconnectCount = 0;
  let whiteGamesPlayed = 0;
  let blackGamesPlayed = 0;

  for (const game of games) {
    gamesPlayed += 1;

    const isWhite = game.whitePlayer.userId?.toString() === userId;
    const isBlack = game.blackPlayer.userId?.toString() === userId;

    if (isWhite) {
      whiteGamesPlayed += 1;
    }
    if (isBlack) {
      blackGamesPlayed += 1;
    }

    if (game.mode === 'online') {
      onlineGamesPlayed += 1;
    }
    if (game.mode === 'computer') {
      engineGamesPlayed += 1;
    }
    if (game.mode === 'analysis') {
      practiceGamesPlayed += 1;
    }

    if (game.terminationReason === 'timeout') {
      timeoutCount += 1;
    }
    if (game.terminationReason === 'abandonment') {
      disconnectCount += 1;
    }

    if (game.result === '1/2-1/2') {
      draws += 1;
    } else if (game.result === '1-0' && isWhite) {
      wins += 1;
    } else if (game.result === '0-1' && isBlack) {
      wins += 1;
    } else if (game.result === '1-0' || game.result === '0-1') {
      losses += 1;
    }
  }

  const stats = await UserStats.findOneAndUpdate(
    { userId },
    {
      $set: {
        gamesPlayed,
        wins,
        losses,
        draws,
        onlineGamesPlayed,
        engineGamesPlayed,
        practiceGamesPlayed,
        timeoutCount,
        disconnectCount,
        whiteGamesPlayed,
        blackGamesPlayed,
      },
      $setOnInsert: {
        userId,
      },
    },
    { upsert: true, new: true }
  );

  if (!stats) {
    throw createError(500, 'Failed to refresh user stats');
  }

  return stats;
}

export async function getUserStats(userId: string): Promise<IUserStats> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }

  await ensureUserDomainRecords(userId, user.username);
  return refreshUserStatsFromGames(userId);
}

export async function getUserSummary(userId: string): Promise<{
  account: { status: string; role: string; emailVerified: boolean; lastLoginAt?: Date };
  profile: IUserProfile;
  settings: IUserSettings;
  social: IUserSocial;
  stats: IUserStats;
}> {
  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, 'User not found');
  }

  await ensureUserDomainRecords(userId, user.username);

  const [profile, settings, social, stats] = await Promise.all([
    getUserProfile(userId),
    UserSettings.findOne({ userId }),
    getUserSocial(userId),
    getUserStats(userId),
  ]);

  if (!settings) {
    throw createError(500, 'Failed to load user settings');
  }

  return {
    account: {
      status: user.status,
      role: user.role,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt,
    },
    profile,
    settings,
    social,
    stats,
  };
}
