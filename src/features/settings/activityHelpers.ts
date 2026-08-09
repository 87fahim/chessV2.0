export type StatKey =
  | 'gamesPlayed'
  | 'wins'
  | 'losses'
  | 'draws'
  | 'onlineGamesPlayed'
  | 'practiceSessions'
  | 'analysisRequests';

export interface HistoryGameRecord {
  _id: string;
  mode: string;
  result: string;
  terminationReason?: string;
  difficulty?: string;
  timeControl?: { initialMs: number; incrementMs: number };
  moves: Array<{ ply: number; san: string; from: string; to: string; fenAfter: string }>;
  whitePlayer: { userId?: string; name: string };
  blackPlayer: { userId?: string; name: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ActivityRecord {
  _id?: string;
  activityType: string;
  feature: string;
  gameId?: string;
  puzzleId?: string;
  fen?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface StatCardConfig {
  key: StatKey;
  label: string;
  value: number;
  description: string;
  source: 'history' | 'activity';
}

export function toActivityRecord(activity: Record<string, unknown>): ActivityRecord {
  const metadata = activity.metadata;

  return {
    _id: typeof activity._id === 'string' ? activity._id : undefined,
    activityType: typeof activity.activityType === 'string' ? activity.activityType : 'activity',
    feature: typeof activity.feature === 'string' ? activity.feature : 'system',
    gameId: typeof activity.gameId === 'string' ? activity.gameId : undefined,
    puzzleId: typeof activity.puzzleId === 'string' ? activity.puzzleId : undefined,
    fen: typeof activity.fen === 'string' ? activity.fen : undefined,
    metadata:
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : undefined,
    createdAt: typeof activity.createdAt === 'string' ? activity.createdAt : undefined,
  };
}

export function startCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatDetailValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'Structured data';
    }
  }
  return String(value);
}

export function formatTimeControlLabel(timeControl?: { initialMs: number; incrementMs: number }): string {
  if (!timeControl) {
    return 'Unlimited';
  }

  const baseMinutes = Math.round(timeControl.initialMs / 60000);
  const incrementSeconds = Math.round(timeControl.incrementMs / 1000);
  return incrementSeconds > 0 ? `${baseMinutes}+${incrementSeconds}` : `${baseMinutes} min`;
}

function isUserWhite(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return game.whitePlayer.userId === userId || (!!username && game.whitePlayer.name === username);
}

function isUserBlack(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return game.blackPlayer.userId === userId || (!!username && game.blackPlayer.name === username);
}

export function isPersonalWin(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return (
    (game.result === '1-0' && isUserWhite(game, userId, username)) ||
    (game.result === '0-1' && isUserBlack(game, userId, username))
  );
}

export function isPersonalLoss(game: HistoryGameRecord, userId?: string, username?: string): boolean {
  return (
    (game.result === '1-0' && isUserBlack(game, userId, username)) ||
    (game.result === '0-1' && isUserWhite(game, userId, username))
  );
}

export function getGameOutcomeLabel(game: HistoryGameRecord, userId?: string, username?: string): string {
  if (game.result === '1/2-1/2') {
    return 'Draw';
  }
  if (isPersonalWin(game, userId, username)) {
    return 'Win';
  }
  if (isPersonalLoss(game, userId, username)) {
    return 'Loss';
  }
  return startCase(game.result);
}

export function getGameOutcomeColor(
  game: HistoryGameRecord,
  userId?: string,
  username?: string,
): 'success' | 'error' | 'default' {
  if (game.result === '1/2-1/2') {
    return 'default';
  }
  return isPersonalWin(game, userId, username) ? 'success' : 'error';
}

export function getActivityTitle(activity: ActivityRecord): string {
  switch (activity.activityType) {
    case 'analysis_request':
      return 'Analysis requested';
    case 'fen_saved':
      return 'Position saved';
    case 'friend_invite':
      return 'Friend request sent';
    case 'game_completed':
      return 'Game completed';
    case 'game_saved':
      return 'Game saved';
    case 'login':
      return 'Signed in';
    case 'matchmaking_join':
      return 'Joined matchmaking';
    case 'practice_session':
      return 'Practice session';
    case 'puzzle_attempt':
      return 'Puzzle attempt';
    default:
      return startCase(activity.activityType || 'activity');
  }
}

export function getActivitySummary(activity: ActivityRecord): string {
  const metadata = activity.metadata ?? {};

  switch (activity.activityType) {
    case 'analysis_request':
      return [
        metadata.difficulty ? `Difficulty ${formatDetailValue(metadata.difficulty)}` : null,
        metadata.searchMode ? `Mode ${formatDetailValue(metadata.searchMode)}` : null,
        metadata.searchDepth ? `Depth ${formatDetailValue(metadata.searchDepth)}` : null,
        metadata.moveTimeMs ? `${Math.round(Number(metadata.moveTimeMs) / 1000)}s` : null,
      ].filter(Boolean).join(' • ') || 'Engine analysis requested for a position.';
    case 'fen_saved':
      return [
        metadata.name ? `Saved as ${formatDetailValue(metadata.name)}` : null,
        metadata.source ? `Source ${startCase(String(metadata.source))}` : null,
      ].filter(Boolean).join(' • ') || 'Saved a board position for later.';
    case 'friend_invite':
      return metadata.targetUserId ? `Target user ${formatDetailValue(metadata.targetUserId)}` : 'Sent a friend request.';
    case 'game_completed':
      return [
        metadata.mode ? startCase(String(metadata.mode)) : 'Game',
        metadata.result ? `Result ${formatDetailValue(metadata.result)}` : null,
        metadata.terminationReason ? startCase(String(metadata.terminationReason)) : null,
      ].filter(Boolean).join(' • ');
    case 'game_saved':
      return 'Saved an in-progress game.';
    case 'login':
      return 'Authenticated successfully.';
    case 'matchmaking_join':
      return 'Entered the live matchmaking queue.';
    case 'practice_session':
      return 'Opened a free practice board session.';
    case 'puzzle_attempt':
      return `Solved: ${formatDetailValue(metadata.solved)}`;
    default:
      return startCase(activity.feature || 'system');
  }
}

export function getActivityDetailRows(activity: ActivityRecord): Array<{ label: string; value: string }> {
  const metadata = activity.metadata ?? {};
  const rows = [
    { label: 'Activity', value: getActivityTitle(activity) },
    { label: 'Area', value: startCase(activity.feature || 'system') },
    {
      label: 'Time',
      value: activity.createdAt ? new Date(activity.createdAt).toLocaleString() : 'Not available',
    },
  ];

  if (activity.gameId) {
    rows.push({ label: 'Game ID', value: activity.gameId });
  }
  if (activity.puzzleId) {
    rows.push({ label: 'Puzzle ID', value: activity.puzzleId });
  }

  for (const [key, value] of Object.entries(metadata)) {
    rows.push({ label: startCase(key), value: formatDetailValue(value) });
  }

  return rows;
}
