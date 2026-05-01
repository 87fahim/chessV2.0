export interface UserSettingsData {
  boardTheme: string;
  moveColorTheme: string;
  pieceTheme: string;
  soundEnabled: boolean;
  animationEnabled: boolean;
  showCoordinates: boolean;
  preferredColor: 'white' | 'black' | 'random';
  defaultDifficulty: 'easy' | 'medium' | 'hard';
  defaultTimeControl: string;
  boardFlipped: boolean;
  language: string;
}

export type UpdateSettingsRequest = Partial<UserSettingsData>;
