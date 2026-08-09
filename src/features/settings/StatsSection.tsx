import React from 'react';
import { Box, Divider, Paper, Typography } from '@mui/material';
import type { StatCardConfig } from './activityHelpers';

interface StatsSectionProps {
  statCards: StatCardConfig[];
  onOpenStat: (card: StatCardConfig) => void;
}

const StatsSection: React.FC<StatsSectionProps> = ({ statCards, onOpenStat }) => (
  <Paper elevation={2} sx={{ p: { xs: 0.85, sm: 1 }, mb: { xs: 1.5, sm: 2 } }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 600 }} gutterBottom>
      Stats
    </Typography>
    <Divider sx={{ mb: 2 }} />
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
        gap: { xs: 0.5, sm: 0.65 },
        alignItems: 'start',
      }}
    >
      {statCards.map((card) => (
        <Box
          key={card.key}
          component="button"
          type="button"
          onClick={() => onOpenStat(card)}
          sx={{
            all: 'unset',
            display: 'block',
            width: '100%',
            cursor: 'pointer',
            alignSelf: 'start',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 0.55, sm: 0.7 },
              transition: 'transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 2,
                borderColor: 'primary.main',
              },
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.6rem', sm: '0.66rem' },
                display: 'block',
                lineHeight: 1.05,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {card.label}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                lineHeight: 1,
                fontWeight: 700,
                mt: 0.1,
                mb: 0,
                fontSize: { xs: '1rem', sm: '1.1rem' },
              }}
            >
              {card.value}
            </Typography>
          </Paper>
        </Box>
      ))}
    </Box>
  </Paper>
);

export default StatsSection;
