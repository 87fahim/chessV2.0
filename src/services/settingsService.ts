import api from './api';

export interface UserSettingsData {
  boardTheme?: string;
  pieceTheme?: string;
  soundEnabled?: boolean;
  animationEnabled?: boolean;
  showCoordinates?: boolean;
  preferredColor?: string;
  defaultDifficulty?: string;
  defaultTimeControl?: string;
  boardFlipped?: boolean;
  language?: string;
}

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: UserSettingsData) => api.put('/settings', data),
};
