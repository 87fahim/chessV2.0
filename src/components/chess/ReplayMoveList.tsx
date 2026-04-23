import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface Move {
  ply: number;
  san: string;
  from: string;
  to: string;
}

interface ReplayMoveListProps {
  moves: Move[];
  /** 0-based index of the move currently shown (-1 = starting position) */
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

const ReplayMoveList: React.FC<ReplayMoveListProps> = ({ moves, currentMoveIndex, onMoveClick }) => {
  const activeRef = useRef<HTMLDivElement | null>(null);

  // Scroll active move into view whenever it changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentMoveIndex]);

  // Group into pairs: [{ number, whiteIdx, blackIdx? }]
  const pairs: { number: number; whiteIdx: number; blackIdx?: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ number: Math.floor(i / 2) + 1, whiteIdx: i, blackIdx: i + 1 < moves.length ? i + 1 : undefined });
  }

  const cellSx = (idx: number) => ({
    width: 64,
    px: 0.75,
    py: 0.4,
    borderRadius: 0.75,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontSize: { xs: '0.85rem', lg: '1rem' },
    fontWeight: idx === currentMoveIndex ? 700 : 400,
    bgcolor: idx === currentMoveIndex ? 'primary.main' : 'transparent',
    color: idx === currentMoveIndex ? 'primary.contrastText' : 'text.primary',
    '&:hover': {
      bgcolor: idx === currentMoveIndex ? 'primary.dark' : 'action.hover',
    },
    transition: 'background-color 0.1s',
    whiteSpace: 'nowrap',
  });

  return (
    <Paper
      elevation={2}
      sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
    >
      <Typography
        variant="subtitle2"
        sx={{ p: 1.5, bgcolor: 'grey.100', fontWeight: 700, fontSize: { xs: '0.95rem', lg: '1.1rem' }, flexShrink: 0 }}
      >
        Moves
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 0.5 }}>
        {moves.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No moves played
          </Typography>
        ) : (
          pairs.map((pair) => (
            <Box
              key={pair.number}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.25, py: 0.15 }}
            >
              {/* Move number */}
              <Box
                sx={{
                  width: 28,
                  textAlign: 'right',
                  color: 'text.secondary',
                  fontSize: { xs: '0.8rem', lg: '0.9rem' },
                  fontFamily: 'monospace',
                  pr: 0.5,
                  flexShrink: 0,
                }}
              >
                {pair.number}.
              </Box>

              {/* White move */}
              <Box
                ref={pair.whiteIdx === currentMoveIndex ? activeRef : undefined}
                sx={cellSx(pair.whiteIdx)}
                onClick={() => onMoveClick(pair.whiteIdx)}
              >
                {moves[pair.whiteIdx].san}
              </Box>

              {/* Black move */}
              {pair.blackIdx !== undefined ? (
                <Box
                  ref={pair.blackIdx === currentMoveIndex ? activeRef : undefined}
                  sx={cellSx(pair.blackIdx)}
                  onClick={() => onMoveClick(pair.blackIdx)}
                >
                  {moves[pair.blackIdx].san}
                </Box>
              ) : (
                <Box sx={{ width: 64 }} />
              )}
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
};

export default ReplayMoveList;
