export const THEME_TILE_SIZE = 44;
export const THEME_TILE_GAP = 3;
export const THEME_SECTION_PADDING = 6;
export const THEME_MAX_ROWS = 4;
export const LIVE_PREVIEW_SIZE = 168;

export function getThemeGridMetrics(visibleColumns: number, itemCount: number) {
  const requiredRows = Math.max(1, Math.ceil(itemCount / visibleColumns));
  const visibleRows = Math.min(requiredRows, THEME_MAX_ROWS);
  const contentWidth = visibleColumns * THEME_TILE_SIZE + (visibleColumns - 1) * THEME_TILE_GAP;
  const sectionWidth = contentWidth + THEME_SECTION_PADDING * 2;
  const contentHeight = visibleRows * THEME_TILE_SIZE + Math.max(0, visibleRows - 1) * THEME_TILE_GAP;
  const sectionHeight = contentHeight + THEME_SECTION_PADDING * 2;

  return {
    requiredRows,
    contentWidth,
    sectionWidth,
    sectionHeight,
  };
}
