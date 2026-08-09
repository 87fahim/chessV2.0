import React from 'react';
import { Box, Divider, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
import {
  BOARD_COLOR_THEME_OPTIONS,
  BOARD_TEXTURE_OPTIONS,
  MOVE_COLOR_THEME_OPTIONS,
} from '../../lib/chess/boardTheme';
import type { UserSettingsData } from '../../services/settingsService';
import {
  BoardThemePreview,
  LiveBoardPreview,
  MoveColorThemePreview,
  ThemeGridSection,
  ThemeGridViewport,
  ThemeOptionCard,
} from './ThemePreview';
import { getThemeGridMetrics } from './themeGrid';

interface BoardAndUiSectionProps {
  settings: UserSettingsData;
  selectedBoardThemeId: string;
  selectedMoveColorThemeId: string;
  onChange: (key: string, value: unknown) => void;
}

const BoardAndUiSection: React.FC<BoardAndUiSectionProps> = ({
  settings,
  selectedBoardThemeId,
  selectedMoveColorThemeId,
  onChange,
}) => {
  const boardTextureMetrics = getThemeGridMetrics(6, BOARD_TEXTURE_OPTIONS.length);
  const boardColorMetrics = getThemeGridMetrics(6, BOARD_COLOR_THEME_OPTIONS.length);
  const boardSectionWidth = Math.max(boardTextureMetrics.sectionWidth, boardColorMetrics.sectionWidth);

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
        Board And UI
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          gap: 2,
          mb: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            minWidth: 0,
            maxWidth: '100%',
            flex: '1 1 320px',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
            Board Themes
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
            Choose a textured or solid-color board background.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'flex-start' },
              gap: 1.5,
            }}
          >
            <Box sx={{ width: '100%', maxWidth: `${boardSectionWidth}px`, minWidth: 0 }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
                Texture
              </Typography>
              <ThemeGridViewport
                visibleColumns={6}
                itemCount={BOARD_TEXTURE_OPTIONS.length}
                sectionWidth={boardTextureMetrics.sectionWidth}
                sectionHeight={boardTextureMetrics.sectionHeight}
                contentWidth={boardTextureMetrics.contentWidth}
              >
                {BOARD_TEXTURE_OPTIONS.map((option) => (
                  <ThemeOptionCard
                    key={option.id}
                    ariaLabel={option.label}
                    selected={option.id === selectedBoardThemeId}
                    onClick={() => onChange('boardTheme', option.id)}
                  >
                    <BoardThemePreview
                      boardThemeId={option.id}
                      moveColorThemeId={selectedMoveColorThemeId}
                    />
                  </ThemeOptionCard>
                ))}
              </ThemeGridViewport>

              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mt: 0.5, mb: 0.75 }}>
                Color
              </Typography>
              <ThemeGridViewport
                visibleColumns={6}
                itemCount={BOARD_COLOR_THEME_OPTIONS.length}
                sectionWidth={boardColorMetrics.sectionWidth}
                sectionHeight={boardColorMetrics.sectionHeight}
                contentWidth={boardColorMetrics.contentWidth}
              >
                {BOARD_COLOR_THEME_OPTIONS.map((option) => (
                  <ThemeOptionCard
                    key={option.id}
                    ariaLabel={option.label}
                    selected={option.id === selectedBoardThemeId}
                    onClick={() => onChange('boardTheme', option.id)}
                  >
                    <BoardThemePreview
                      boardThemeId={option.id}
                      moveColorThemeId={selectedMoveColorThemeId}
                    />
                  </ThemeOptionCard>
                ))}
              </ThemeGridViewport>
            </Box>

            <Box sx={{ flex: '0 0 auto', alignSelf: { xs: 'center', md: 'flex-start' } }}>
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
                Live Preview
              </Typography>
              <LiveBoardPreview
                boardThemeId={selectedBoardThemeId}
                moveColorThemeId={selectedMoveColorThemeId}
                mode="board"
              />
            </Box>
          </Box>
        </Box>

        <ThemeGridSection
          title="Move Color Themes"
          helperText="Choose colors for move highlights, legal moves, and premoves."
          visibleColumns={4}
          itemCount={MOVE_COLOR_THEME_OPTIONS.length}
          livePreview={
            <LiveBoardPreview
              boardThemeId={selectedBoardThemeId}
              moveColorThemeId={selectedMoveColorThemeId}
              mode="move"
            />
          }
        >
          {MOVE_COLOR_THEME_OPTIONS.map((option) => (
            <ThemeOptionCard
              key={option.id}
              ariaLabel={option.label}
              selected={option.id === selectedMoveColorThemeId}
              onClick={() => onChange('moveColorTheme', option.id)}
            >
              <MoveColorThemePreview
                boardThemeId={selectedBoardThemeId}
                moveColorThemeId={option.id}
              />
            </ThemeOptionCard>
          ))}
        </ThemeGridSection>
      </Box>

      <FormControlLabel control={<Switch checked={settings.showCoordinates ?? true} onChange={(e) => onChange('showCoordinates', e.target.checked)} />} label="Show Coordinates" />
      <FormControlLabel control={<Switch checked={settings.showLegalMoves ?? true} onChange={(e) => onChange('showLegalMoves', e.target.checked)} />} label="Show Legal Moves" />
      <FormControlLabel control={<Switch checked={settings.highlightLastMove ?? true} onChange={(e) => onChange('highlightLastMove', e.target.checked)} />} label="Highlight Last Move" />
      <FormControlLabel control={<Switch checked={settings.highlightCheck ?? true} onChange={(e) => onChange('highlightCheck', e.target.checked)} />} label="Highlight Check" />
      <FormControlLabel control={<Switch checked={settings.boardFlipped ?? false} onChange={(e) => onChange('boardFlipped', e.target.checked)} />} label="Flip Board By Default" />
    </Paper>
  );
};

export default BoardAndUiSection;
