/**
 * Single source of truth for all chess board visual constants.
 * Import this in Square, ChessBoard, ReplayBoard, and EditableBoard to keep
 * the board appearance identical across every game mode.
 */
const boardTextureModules = import.meta.glob<{ default: string }>(
  '../../assets/squars/*-{dark,light}.png',
  { eager: true },
);

const BOARD_TEXTURE_METADATA = [
  { id: 'glass1', label: 'Glass 1' },
  { id: 'stone1', label: 'Stone 1' },
  { id: 'stone2', label: 'Stone 2' },
  { id: 'stone3', label: 'Stone 3' },
  { id: 'texture1', label: 'Texture 1' },
  { id: 'texture3', label: 'Texture 3' },
  { id: 'texture4', label: 'Texture 4' },
  { id: 'texture5', label: 'Texture 5' },
  { id: 'texture6', label: 'Texture 6' },
  { id: 'texture7', label: 'Texture 7' },
  { id: 'texture8', label: 'Texture 8' },
  { id: 'wood1', label: 'Wood 1' },
  { id: 'wood2', label: 'Wood 2' },
] as const;

const BOARD_COLOR_THEME_METADATA = [
  { id: 'color-green-ivory', label: 'Green Ivory', light: '#f5f2e9', dark: '#4f8762' },
  { id: 'color-forest', label: 'Forest', light: '#dce9cf', dark: '#56734c' },
  { id: 'color-sand', label: 'Sand', light: '#f1dfbf', dark: '#bf8f63' },
  { id: 'color-slate', label: 'Slate', light: '#d9dee8', dark: '#5f6d86' },
  { id: 'color-rose', label: 'Rose', light: '#f3d9de', dark: '#b56c7a' },
  { id: 'color-mint', label: 'Mint', light: '#d6efe2', dark: '#4d8d76' },
  { id: 'color-lavender', label: 'Lavender', light: '#e4dcf6', dark: '#7761b2' },
  { id: 'color-sunrise', label: 'Sunrise', light: '#f8dfc7', dark: '#d2844a' },
  { id: 'color-ice', label: 'Ice', light: '#dff2f6', dark: '#5f95a2' },
] as const;

const LEGACY_BOARD_THEME_ALIASES: Record<string, string> = {
  default: 'wood2',
  classic: 'wood2',
  wood: 'wood1',
  dark: 'stone2',
};

const boardTextureMap = Object.entries(boardTextureModules).reduce<Record<string, Partial<Record<'dark' | 'light', string>>>>(
  (acc, [path, mod]) => {
    const match = path.match(/\/([^/]+)-(dark|light)\.png$/);
    if (!match) {
      return acc;
    }

    const [, id, shade] = match;
    if (!acc[id]) {
      acc[id] = {};
    }
    acc[id][shade as 'dark' | 'light'] = mod.default;
    return acc;
  },
  {},
);

const boardColorThemeMap = BOARD_COLOR_THEME_METADATA.reduce<Record<string, { dark: string; light: string }>>(
  (acc, theme) => {
    acc[theme.id] = { dark: theme.dark, light: theme.light };
    return acc;
  },
  {},
);

const DEFAULT_BOARD_TEXTURE_ID = 'wood2';
const DEFAULT_MOVE_COLOR_THEME_ID = 'classic';

const MOVE_COLOR_THEME_METADATA = [
  { id: 'classic', label: 'Classic' },
  { id: 'emerald', label: 'Emerald' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'sunset', label: 'Sunset' },
] as const;

const MOVE_COLOR_THEMES = {
  classic: {
    lastMoveLight: 'rgba(206, 210, 107, 0.72)',
    lastMoveDark: 'rgba(169, 162, 56, 0.72)',
    checkLight: 'rgba(247, 165, 165, 0.76)',
    checkDark: 'rgba(224, 64, 64, 0.76)',
    selectedLight: 'rgba(130, 158, 224, 0.72)',
    selectedDark: 'rgba(93, 123, 196, 0.72)',
    premoveLight: 'rgba(170, 180, 208, 0.72)',
    premoveDark: 'rgba(123, 136, 168, 0.72)',
    dragOverLight: 'rgba(179, 212, 165, 0.74)',
    dragOverDark: 'rgba(106, 173, 85, 0.74)',
    highlightLight: 'rgba(172, 212, 107, 0.72)',
    highlightDark: 'rgba(135, 168, 67, 0.72)',
    legalMoveDot: 'rgba(0,0,0,0.18)',
    captureIndicator: 'rgba(0,0,0,0.18)',
  },
  emerald: {
    lastMoveLight: 'rgba(223, 210, 104, 0.76)',
    lastMoveDark: 'rgba(188, 158, 45, 0.78)',
    checkLight: 'rgba(255, 159, 159, 0.78)',
    checkDark: 'rgba(220, 66, 66, 0.8)',
    selectedLight: 'rgba(114, 214, 181, 0.7)',
    selectedDark: 'rgba(42, 162, 124, 0.74)',
    premoveLight: 'rgba(145, 197, 180, 0.7)',
    premoveDark: 'rgba(72, 135, 118, 0.74)',
    dragOverLight: 'rgba(164, 227, 124, 0.74)',
    dragOverDark: 'rgba(73, 163, 75, 0.78)',
    highlightLight: 'rgba(136, 225, 131, 0.72)',
    highlightDark: 'rgba(61, 161, 89, 0.76)',
    legalMoveDot: 'rgba(12, 82, 58, 0.28)',
    captureIndicator: 'rgba(12, 82, 58, 0.32)',
  },
  ocean: {
    lastMoveLight: 'rgba(241, 202, 108, 0.76)',
    lastMoveDark: 'rgba(205, 144, 51, 0.8)',
    checkLight: 'rgba(255, 166, 166, 0.78)',
    checkDark: 'rgba(210, 74, 74, 0.82)',
    selectedLight: 'rgba(134, 188, 255, 0.72)',
    selectedDark: 'rgba(63, 118, 218, 0.76)',
    premoveLight: 'rgba(148, 184, 218, 0.72)',
    premoveDark: 'rgba(85, 116, 160, 0.76)',
    dragOverLight: 'rgba(132, 214, 222, 0.72)',
    dragOverDark: 'rgba(46, 148, 160, 0.78)',
    highlightLight: 'rgba(137, 216, 255, 0.72)',
    highlightDark: 'rgba(55, 154, 202, 0.76)',
    legalMoveDot: 'rgba(18, 66, 120, 0.28)',
    captureIndicator: 'rgba(18, 66, 120, 0.34)',
  },
  ruby: {
    lastMoveLight: 'rgba(240, 188, 122, 0.76)',
    lastMoveDark: 'rgba(214, 122, 60, 0.8)',
    checkLight: 'rgba(255, 164, 176, 0.8)',
    checkDark: 'rgba(200, 44, 78, 0.84)',
    selectedLight: 'rgba(238, 150, 194, 0.72)',
    selectedDark: 'rgba(191, 72, 132, 0.78)',
    premoveLight: 'rgba(217, 164, 199, 0.72)',
    premoveDark: 'rgba(151, 88, 126, 0.76)',
    dragOverLight: 'rgba(255, 171, 136, 0.72)',
    dragOverDark: 'rgba(214, 102, 70, 0.78)',
    highlightLight: 'rgba(255, 160, 186, 0.72)',
    highlightDark: 'rgba(211, 79, 120, 0.78)',
    legalMoveDot: 'rgba(104, 18, 52, 0.26)',
    captureIndicator: 'rgba(104, 18, 52, 0.34)',
  },
  sunset: {
    lastMoveLight: 'rgba(250, 206, 107, 0.8)',
    lastMoveDark: 'rgba(229, 136, 48, 0.84)',
    checkLight: 'rgba(255, 173, 146, 0.8)',
    checkDark: 'rgba(222, 80, 54, 0.84)',
    selectedLight: 'rgba(177, 144, 255, 0.72)',
    selectedDark: 'rgba(113, 79, 210, 0.78)',
    premoveLight: 'rgba(196, 168, 237, 0.72)',
    premoveDark: 'rgba(130, 97, 176, 0.76)',
    dragOverLight: 'rgba(255, 177, 101, 0.72)',
    dragOverDark: 'rgba(225, 111, 36, 0.78)',
    highlightLight: 'rgba(255, 204, 118, 0.72)',
    highlightDark: 'rgba(202, 131, 48, 0.78)',
    legalMoveDot: 'rgba(88, 42, 9, 0.24)',
    captureIndicator: 'rgba(88, 42, 9, 0.32)',
  },
} as const;

export const BOARD_THEME = {
  // Base square colors
  light: '#ecd8b4',
  dark: '#ae7b4e',

  // Last-move highlight
  lastMoveLight: 'rgba(206, 210, 107, 0.72)',
  lastMoveDark: 'rgba(169, 162, 56, 0.72)',

  // King in check
  checkLight: 'rgba(247, 165, 165, 0.76)',
  checkDark: 'rgba(224, 64, 64, 0.76)',

  // Selected square
  selectedLight: 'rgba(130, 158, 224, 0.72)',
  selectedDark: 'rgba(93, 123, 196, 0.72)',

  // Premove squares
  premoveLight: 'rgba(170, 180, 208, 0.72)',
  premoveDark: 'rgba(123, 136, 168, 0.72)',

  // Drag-over / legal-move drop target
  dragOverLight: 'rgba(179, 212, 165, 0.74)',
  dragOverDark: 'rgba(106, 173, 85, 0.74)',

  // Analysis / best-move highlight (EditableBoard)
  highlightLight: 'rgba(172, 212, 107, 0.72)',
  highlightDark: 'rgba(135, 168, 67, 0.72)',

  // Coordinate labels
  labelOnLight: 'rgba(100,60,30,0.7)',
  labelOnDark: 'rgba(240,220,190,0.7)',

  // Board wrapper
  border: '2px solid #333',
  borderRadius: '4px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
} as const;

export const BOARD_TEXTURE_OPTIONS = BOARD_TEXTURE_METADATA.filter(({ id }) => {
  const texture = boardTextureMap[id];
  return Boolean(texture?.dark && texture?.light);
});

export const BOARD_COLOR_THEME_OPTIONS = BOARD_COLOR_THEME_METADATA.filter(({ id }) =>
  Boolean(boardColorThemeMap[id]),
);

export const BOARD_THEME_OPTIONS = [...BOARD_TEXTURE_OPTIONS, ...BOARD_COLOR_THEME_OPTIONS];

export const MOVE_COLOR_THEME_OPTIONS = MOVE_COLOR_THEME_METADATA.filter(({ id }) =>
  Boolean(MOVE_COLOR_THEMES[id]),
);

export function resolveBoardThemeId(boardTheme?: string): string {
  if (boardTheme) {
    const exact = boardTextureMap[boardTheme];
    if (exact?.dark && exact?.light) {
      return boardTheme;
    }

    const colorTheme = boardColorThemeMap[boardTheme];
    if (colorTheme?.dark && colorTheme?.light) {
      return boardTheme;
    }

    const aliasedTheme = LEGACY_BOARD_THEME_ALIASES[boardTheme];
    if (aliasedTheme) {
      const aliasTexture = boardTextureMap[aliasedTheme];
      if (aliasTexture?.dark && aliasTexture?.light) {
        return aliasedTheme;
      }

      const aliasColorTheme = boardColorThemeMap[aliasedTheme];
      if (aliasColorTheme?.dark && aliasColorTheme?.light) {
        return aliasedTheme;
      }
    }
  }

  const fallback = boardTextureMap[DEFAULT_BOARD_TEXTURE_ID];
  if (fallback?.dark && fallback?.light) {
    return DEFAULT_BOARD_TEXTURE_ID;
  }

  return BOARD_TEXTURE_OPTIONS[0]?.id ?? DEFAULT_BOARD_TEXTURE_ID;
}

export function getBoardSquareBackground(
  boardTheme: string | undefined,
  isLight: boolean,
  overlayColor?: string,
) {
  const themeId = resolveBoardThemeId(boardTheme);
  const texture = boardTextureMap[themeId]?.[isLight ? 'light' : 'dark'];
  const colorTheme = boardColorThemeMap[themeId];
  const baseColor = colorTheme
    ? colorTheme[isLight ? 'light' : 'dark']
    : isLight
      ? BOARD_THEME.light
      : BOARD_THEME.dark;

  return {
    backgroundColor: baseColor,
    backgroundImage: texture
      ? overlayColor
        ? `linear-gradient(${overlayColor}, ${overlayColor}), url("${texture}")`
        : `url("${texture}")`
      : overlayColor
        ? `linear-gradient(${overlayColor}, ${overlayColor})`
        : 'none',
    backgroundSize: texture ? 'cover' : undefined,
    backgroundPosition: texture ? 'center' : undefined,
    backgroundRepeat: texture ? 'no-repeat' : undefined,
  } as const;
}

export function resolveMoveColorThemeId(moveColorTheme?: string): string {
  if (moveColorTheme && moveColorTheme in MOVE_COLOR_THEMES) {
    return moveColorTheme;
  }

  return DEFAULT_MOVE_COLOR_THEME_ID;
}

export function getMoveColorTheme(moveColorTheme?: string) {
  return MOVE_COLOR_THEMES[
    resolveMoveColorThemeId(moveColorTheme) as keyof typeof MOVE_COLOR_THEMES
  ];
}
