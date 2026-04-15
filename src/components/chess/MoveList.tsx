import React from 'react';
import { Box, Paper, Typography, List, ListItem, ListItemText } from '@mui/material';

interface MoveListProps {
  moves: string[];
}

const MoveList: React.FC<MoveListProps> = ({ moves }) => {
  // Group moves into pairs (white + black)
  const movePairs: { number: number; white: string; black?: string }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  return (
    <Paper
      elevation={2}
      sx={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="subtitle2" sx={{ p: 1.5, bgcolor: 'grey.100', fontWeight: 700, fontSize: { xs: '0.95rem', lg: '1.22rem' } }}>
        Moves
      </Typography>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1 }}>
        {movePairs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center', fontSize: { xs: '0.92rem', lg: '1.05rem' } }}>
            No moves yet
          </Typography>
        ) : (
          <List dense disablePadding>
            {movePairs.map((pair) => (
              <ListItem key={pair.number} disablePadding sx={{ py: 0.25 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', gap: 1, fontFamily: 'monospace', fontSize: { xs: '0.85rem', lg: '1rem' } }}>
                      <Box sx={{ width: 24, color: 'text.secondary', textAlign: 'right' }}>
                        {pair.number}.
                      </Box>
                      <Box sx={{ width: 60 }}>{pair.white}</Box>
                      <Box sx={{ width: 60 }}>{pair.black || ''}</Box>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
};

export default MoveList;
