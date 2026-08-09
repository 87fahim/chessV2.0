import type { Theme } from '@mui/material/styles';
import type { SystemStyleObject } from '@mui/system';

/** Shared responsive sizing for under-board Controls rows. */
export const controlBarRowSx: SystemStyleObject<Theme> = {
  display: 'flex',
  alignItems: 'center',
  gap: { xs: 0.5, lg: 1 },
  rowGap: { xs: 0.5, lg: 1 },
  flexWrap: 'wrap',
  width: '100%',
  overflowX: 'visible',
};

export const controlBarPaperSx: SystemStyleObject<Theme> = {
  p: { xs: 1.25, lg: 1.75 },
};

export const controlBarTitleSx: SystemStyleObject<Theme> = {
  fontWeight: 700,
  mb: { xs: 0.75, lg: 1 },
  fontSize: { xs: '0.95rem', lg: '1.2rem' },
  color: 'text.secondary',
};

export const controlIconButtonSx: SystemStyleObject<Theme> = {
  p: { xs: 0.45, lg: 0.9 },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1.5,
  bgcolor: 'background.paper',
  '&:hover': {
    bgcolor: 'action.hover',
    borderColor: 'text.secondary',
  },
};

export const controlIconSx: SystemStyleObject<Theme> = {
  fontSize: { xs: 18, lg: 26 },
};

export const controlOutlinedButtonSx: SystemStyleObject<Theme> = {
  minWidth: 0,
  px: { xs: 0.9, lg: 1.6 },
  py: { xs: 0.35, lg: 0.85 },
  minHeight: { xs: 30, lg: 42 },
  fontSize: { xs: '0.72rem', lg: '0.95rem' },
  fontWeight: 700,
  borderWidth: { xs: 1, lg: 1.5 },
  '& .MuiButton-startIcon': {
    mr: { xs: 0.4, lg: 0.75 },
    '& > *:nth-of-type(1)': {
      fontSize: { xs: 16, lg: 22 },
    },
  },
};

export const controlDividerSx: SystemStyleObject<Theme> = {
  mx: { xs: 0.25, lg: 0.75 },
  borderColor: 'divider',
};
