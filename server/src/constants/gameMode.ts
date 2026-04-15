export const GameMode = {
  LOCAL: 'local',
  COMPUTER: 'computer',
  ANALYSIS: 'analysis',
  ONLINE: 'online',
} as const;

export type GameModeType = (typeof GameMode)[keyof typeof GameMode];
