import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/userService.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(30).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  bio: z.string().max(240).optional(),
  country: z.string().max(80).optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(10).optional(),
  searchableByUsername: z.boolean().optional(),
  searchableByFriendCode: z.boolean().optional(),
  searchableByEmail: z.boolean().optional(),
  onlineVisibility: z.enum(['everyone', 'friends_only', 'nobody']).optional(),
  profileVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
  identityDisplayMode: z.enum(['username', 'display_name', 'both']).optional(),
});

const updateSocialSchema = z.object({
  friendRequestPolicy: z.enum(['everyone', 'friends_of_friends', 'nobody']).optional(),
  directChallengePolicy: z.enum(['everyone', 'friends_only', 'nobody']).optional(),
  showOnlineStatus: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
  gameHistoryVisibility: z.enum(['public', 'friends_only', 'private']).optional(),
});

const friendRequestSchema = z.object({
  targetUserId: z.string().min(1),
});

const savePositionSchema = z.object({
  name: z.string().min(1).max(80),
  fen: z.string().min(1).max(200),
  notes: z.string().max(300).optional(),
  source: z.enum(['analysis', 'practice', 'game', 'other']).optional(),
});

const activitySchema = z.object({
  activityType: z.enum([
    'login',
    'game_completed',
    'game_saved',
    'matchmaking_join',
    'friend_invite',
    'practice_session',
    'puzzle_attempt',
    'analysis_request',
    'fen_saved',
  ]),
  feature: z.enum(['auth', 'game', 'matchmaking', 'social', 'practice', 'puzzle', 'analysis']),
  gameId: z.string().optional(),
  puzzleId: z.string().optional(),
  fen: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await userService.getUserSummary(req.user!.userId);
  res.json({ success: true, data: { summary } });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await userService.getUserProfile(req.user!.userId);
  res.json({ success: true, data: { profile } });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const update = updateProfileSchema.parse(req.body);
  const profile = await userService.updateUserProfile(req.user!.userId, update);
  res.json({ success: true, data: { profile } });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await userService.getUserStats(req.user!.userId);
  res.json({ success: true, data: { stats } });
});

export const getSocial = asyncHandler(async (req: Request, res: Response) => {
  const social = await userService.getUserSocial(req.user!.userId);
  res.json({ success: true, data: { social } });
});

export const updateSocial = asyncHandler(async (req: Request, res: Response) => {
  const update = updateSocialSchema.parse(req.body);
  const social = await userService.updateUserSocial(req.user!.userId, update);
  res.json({ success: true, data: { social } });
});

export const sendFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  const { targetUserId } = friendRequestSchema.parse(req.body);
  await userService.sendFriendRequest(req.user!.userId, targetUserId);
  res.status(201).json({ success: true, data: { message: 'Friend request sent' } });
});

export const acceptFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  await userService.acceptFriendRequest(req.user!.userId, req.params.userId as string);
  res.json({ success: true, data: { message: 'Friend request accepted' } });
});

export const declineFriendRequest = asyncHandler(async (req: Request, res: Response) => {
  await userService.declineFriendRequest(req.user!.userId, req.params.userId as string);
  res.json({ success: true, data: { message: 'Friend request declined' } });
});

export const blockUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.blockUser(req.user!.userId, req.params.userId as string);
  res.json({ success: true, data: { message: 'User blocked' } });
});

export const unblockUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.unblockUser(req.user!.userId, req.params.userId as string);
  res.json({ success: true, data: { message: 'User unblocked' } });
});

export const recordActivity = asyncHandler(async (req: Request, res: Response) => {
  const input = activitySchema.parse(req.body);
  const activity = await userService.recordActivity(req.user!.userId, input);
  res.status(201).json({ success: true, data: { activity } });
});

export const getRecentActivity = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
  const activities = await userService.getRecentActivity(req.user!.userId, limit);
  res.json({ success: true, data: { activities } });
});

export const getSavedPositions = asyncHandler(async (req: Request, res: Response) => {
  const positions = await userService.getSavedPositions(req.user!.userId);
  res.json({ success: true, data: { positions } });
});

export const savePosition = asyncHandler(async (req: Request, res: Response) => {
  const input = savePositionSchema.parse(req.body);
  const position = await userService.savePosition(req.user!.userId, input);
  res.status(201).json({ success: true, data: { position } });
});

export const deleteSavedPosition = asyncHandler(async (req: Request, res: Response) => {
  await userService.deleteSavedPosition(req.user!.userId, req.params.positionId as string);
  res.json({ success: true, data: { message: 'Saved position deleted' } });
});

export const searchUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  const results = await userService.searchUsers(query, req.user!.userId);
  res.json({ success: true, data: { results } });
});
