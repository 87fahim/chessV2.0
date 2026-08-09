import React from 'react';
import { Box, Typography } from '@mui/material';
import Piece from '../../components/chess/Piece';
import { getBoardSquareBackground, getMoveColorTheme } from '../../lib/chess/boardTheme';
import type { PieceColor, PieceType } from '../../types/chess';

export const THEME_TILE_SIZE = 44;
const THEME_TILE_GAP = 3;
const THEME_SECTION_PADDING = 6;
const THEME_MAX_ROWS = 4;
const LIVE_PREVIEW_SIZE = 168;

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

function PreviewBoard({
  boardThemeId,
  moveColorThemeId,
  mode,
  size,
  showPieces,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
  size: number;
  showPieces: boolean;
}) {
  const moveTheme = getMoveColorTheme(moveColorThemeId);
  const ringInset = Math.max(2, Math.round(size * 0.04));
  const ringWidth = Math.max(3, Math.round(size * 0.045));

  const previewSquares = [
    {
      key: 'dark-top-left',
      isLight: false,
      overlayColor: mode === 'move' ? moveTheme.selectedDark : undefined,
      marker: null as 'dot' | 'ring' | null,
      piece: showPieces ? ({ type: 'b', color: 'b' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'light-top-right',
      isLight: true,
      overlayColor: mode === 'move' ? moveTheme.lastMoveLight : undefined,
      marker: null as 'dot' | 'ring' | null,
      piece: showPieces ? ({ type: 'p', color: 'b' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'light-bottom-left',
      isLight: true,
      overlayColor: undefined,
      marker: mode === 'move' ? ('dot' as const) : null,
      piece: showPieces ? ({ type: 'n', color: 'w' } as { type: PieceType; color: PieceColor }) : null,
    },
    {
      key: 'dark-bottom-right',
      isLight: false,
      overlayColor: mode === 'move' ? moveTheme.checkDark : undefined,
      marker: mode === 'move' ? ('ring' as const) : null,
      piece: showPieces ? ({ type: 'r', color: 'w' } as { type: PieceType; color: PieceColor }) : null,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        width: size,
        height: size,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      {previewSquares.map((previewSquare) => {
        const squareStyles = getBoardSquareBackground(
          boardThemeId,
          previewSquare.isLight,
          previewSquare.overlayColor,
        );

        return (
          <Box
            key={previewSquare.key}
            sx={{
              ...squareStyles,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {previewSquare.marker === 'dot' && (
              <Box
                sx={{
                  width: '34%',
                  height: '34%',
                  borderRadius: '50%',
                  backgroundColor: moveTheme.legalMoveDot,
                  position: 'absolute',
                  inset: 0,
                  margin: 'auto',
                }}
              />
            )}
            {previewSquare.marker === 'ring' && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: ringInset,
                  borderRadius: '50%',
                  border: `${ringWidth}px solid ${moveTheme.captureIndicator}`,
                  boxSizing: 'border-box',
                }}
              />
            )}
            {previewSquare.piece && (
              <Piece
                type={previewSquare.piece.type}
                color={previewSquare.piece.color}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function MiniBoardPreview({
  boardThemeId,
  moveColorThemeId,
  mode,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
}) {
  return <PreviewBoard boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode={mode} size={THEME_TILE_SIZE} showPieces={false} />;
}

export function LiveBoardPreview({
  boardThemeId,
  moveColorThemeId,
  mode,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
  mode: 'board' | 'move';
}) {
  return <PreviewBoard boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode={mode} size={LIVE_PREVIEW_SIZE} showPieces />;
}

export function BoardThemePreview({
  boardThemeId,
  moveColorThemeId,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
      <MiniBoardPreview boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode="board" />
    </Box>
  );
}

export function MoveColorThemePreview({
  boardThemeId,
  moveColorThemeId,
}: {
  boardThemeId: string;
  moveColorThemeId: string;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
      <MiniBoardPreview boardThemeId={boardThemeId} moveColorThemeId={moveColorThemeId} mode="move" />
    </Box>
  );
}

export function ThemeOptionCard({
  ariaLabel,
  selected,
  onClick,
  children,
}: {
  ariaLabel: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      sx={{
        all: 'unset',
        width: THEME_TILE_SIZE,
        height: THEME_TILE_SIZE,
        boxSizing: 'border-box',
        borderRadius: 1,
        border: selected ? '2px solid #1f6feb' : '1px solid rgba(0,0,0,0.14)',
        backgroundColor: selected ? 'rgba(31, 111, 235, 0.08)' : 'background.paper',
        boxShadow: selected ? '0 0 0 1px rgba(31, 111, 235, 0.18)' : '0 1px 4px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        '&:hover': {
          borderColor: '#1f6feb',
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: '2px solid #1f6feb',
          outlineOffset: 2,
        },
      }}
    >
      {children}
    </Box>
  );
}

export function ThemeGridSection({
  title,
  helperText,
  visibleColumns,
  itemCount,
  livePreview,
  children,
}: {
  title: string;
  helperText: string;
  visibleColumns: number;
  itemCount: number;
  livePreview: React.ReactNode;
  children: React.ReactNode;
}) {
  const metrics = getThemeGridMetrics(visibleColumns, itemCount);

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: '100%',
        flex: '1 1 320px',
      }}
    >
      {title && (
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
          {title}
        </Typography>
      )}
      {helperText && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
          {helperText}
        </Typography>
      )}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          gap: 1.5,
        }}
      >
        <ThemeGridViewport
          visibleColumns={visibleColumns}
          itemCount={itemCount}
          sectionWidth={metrics.sectionWidth}
          sectionHeight={metrics.sectionHeight}
          contentWidth={metrics.contentWidth}
        >
          {children}
        </ThemeGridViewport>

        <Box sx={{ flex: '0 0 auto', alignSelf: { xs: 'center', md: 'flex-start' } }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 0.75 }}>
            Live Preview
          </Typography>
          {livePreview}
        </Box>
      </Box>
    </Box>
  );
}

export function ThemeGridViewport({
  visibleColumns,
  itemCount,
  sectionWidth,
  sectionHeight,
  contentWidth,
  children,
}: {
  visibleColumns: number;
  itemCount: number;
  sectionWidth: number;
  sectionHeight: number;
  contentWidth: number;
  children: React.ReactNode;
}) {
  const requiredRows = Math.max(1, Math.ceil(itemCount / visibleColumns));

  return (
      <Box
        sx={{
          width: '100%',
          minWidth: 0,
          maxWidth: `${sectionWidth}px`,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: `${THEME_SECTION_PADDING}px`,
          minHeight: `${sectionHeight}px`,
          maxHeight: `${sectionHeight}px`,
          overflowX: 'hidden',
          overflowY: requiredRows > THEME_MAX_ROWS ? 'auto' : 'hidden',
          backgroundColor: 'rgba(0,0,0,0.015)',
          '&::-webkit-scrollbar': {
            width: 10,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0,0,0,0.22)',
            borderRadius: 999,
          },
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${visibleColumns}, ${THEME_TILE_SIZE}px)`,
            gridAutoRows: `${THEME_TILE_SIZE}px`,
            gap: `${THEME_TILE_GAP}px`,
            width: `${contentWidth}px`,
            alignContent: 'start',
          }}
        >
          {children}
        </Box>
      </Box>
  );
}
