import api from './api';

export interface UserSettingsData {
  boardTheme?: string;
  pieceTheme?: string;
  boardOrientation?: 'white_bottom' | 'black_bottom' | 'auto';
  soundEnabled?: boolean;
  moveSoundEnabled?: boolean;
  captureSoundEnabled?: boolean;
  checkSoundEnabled?: boolean;
  puzzleFeedbackSoundEnabled?: boolean;
  animationEnabled?: boolean;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  highlightLastMove?: boolean;
  highlightCheck?: boolean;
  appearanceMode?: 'light' | 'dark' | 'system';
  showNotationPanel?: boolean;
  showEvaluationPanel?: boolean;
  largerBoardDisplay?: boolean;
  highContrast?: boolean;
  simplifiedIndicators?: boolean;
  preferredColor?: string;
  preferredGameType?: 'casual' | 'rated' | 'friend_match';
  defaultDifficulty?: string;
  autoPromotion?: boolean;
  moveConfirmation?: boolean;
  moveInputMethod?: 'drag_and_drop' | 'tap_to_move';
  practiceFreeMove?: boolean;
  practiceHintsEnabled?: boolean;
  practiceUnlimitedUndo?: boolean;
  analysisEngineStrength?: 'easy' | 'medium' | 'hard';
  analysisDefaultDepth?: number;
  analysisShowBestLine?: boolean;
  defaultTimeControl?: string;
  boardFlipped?: boolean;
  language?: string;
  inviteNotifications?: boolean;
  matchNotifications?: boolean;
  puzzleReminders?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  friendRequestPolicy?: 'everyone' | 'friends_of_friends' | 'nobody';
  directChallengePolicy?: 'everyone' | 'friends_only' | 'nobody';
  gameHistoryVisibility?: 'public' | 'friends_only' | 'private';
  profileVisibility?: 'public' | 'friends_only' | 'private';
  onlinePresenceVisibility?: 'everyone' | 'friends_only' | 'nobody';
  spectatorPolicy?: 'everyone' | 'friends_only' | 'nobody';
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: UserSettingsData) => api.put('/settings', data),
};
