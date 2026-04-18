import api from './api';

export interface UserProfileData {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  country?: string;
  timezone?: string;
  language: string;
  searchableByUsername: boolean;
  searchableByFriendCode: boolean;
  searchableByEmail: boolean;
  onlineVisibility: 'everyone' | 'friends_only' | 'nobody';
  profileVisibility: 'public' | 'friends_only' | 'private';
  identityDisplayMode: 'username' | 'display_name' | 'both';
  friendCode: string;
}

export interface UserStatsData {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  onlineGamesPlayed: number;
  engineGamesPlayed: number;
  practiceGamesPlayed: number;
  puzzleSolved: number;
  puzzleAttempted: number;
  practiceSessions: number;
  analysisRequests: number;
  timeoutCount: number;
  disconnectCount: number;
}

export interface UserSocialData {
  friendRequestPolicy: 'everyone' | 'friends_of_friends' | 'nobody';
  directChallengePolicy: 'everyone' | 'friends_only' | 'nobody';
  showOnlineStatus: boolean;
  profileVisibility: 'public' | 'friends_only' | 'private';
  gameHistoryVisibility: 'public' | 'friends_only' | 'private';
  friends: Array<{ _id: string; username: string; email: string }>;
  blockedUsers: Array<{ _id: string; username: string; email: string }>;
  incomingFriendRequests: Array<{ _id: string; username: string; email: string }>;
  outgoingFriendRequests: Array<{ _id: string; username: string; email: string }>;
}

export interface UserSummaryData {
  account: {
    status: string;
    role: string;
    emailVerified: boolean;
    lastLoginAt?: string;
  };
  profile: UserProfileData;
  settings: Record<string, unknown>;
  social: UserSocialData;
  stats: UserStatsData;
}

export interface SavedPositionData {
  _id: string;
  name: string;
  fen: string;
  notes?: string;
  source: 'analysis' | 'practice' | 'game' | 'other';
  updatedAt: string;
}

export interface UserSearchResult {
  userId: string;
  username: string;
  displayName: string;
  friendCode: string;
}

export const userApi = {
  getSummary: () => api.get('/user/summary'),
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: Partial<UserProfileData>) => api.put('/user/profile', data),
  getStats: () => api.get('/user/stats'),
  getSocial: () => api.get('/user/social'),
  updateSocial: (data: Partial<UserSocialData>) => api.put('/user/social', data),
  sendFriendRequest: (targetUserId: string) => api.post('/user/social/friends/request', { targetUserId }),
  acceptFriendRequest: (userId: string) => api.post(`/user/social/friends/${userId}/accept`),
  declineFriendRequest: (userId: string) => api.post(`/user/social/friends/${userId}/decline`),
  blockUser: (userId: string) => api.post(`/user/social/block/${userId}`),
  unblockUser: (userId: string) => api.delete(`/user/social/block/${userId}`),
  recordActivity: (data: Record<string, unknown>) => api.post('/user/activity', data),
  getRecentActivity: (limit = 30) => api.get(`/user/activity/recent?limit=${limit}`),
  getSavedPositions: () => api.get('/user/positions'),
  savePosition: (data: { name: string; fen: string; notes?: string; source?: 'analysis' | 'practice' | 'game' | 'other' }) => api.post('/user/positions', data),
  deleteSavedPosition: (positionId: string) => api.delete(`/user/positions/${positionId}`),
  searchUsers: (query: string) => api.get('/user/search', { params: { q: query } }),
};
