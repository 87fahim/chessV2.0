import React from 'react';
import { Box, Typography } from '@mui/material';
import { getPieceImage, getPieceValue } from '../../lib/chess/boardUtils';
import type { PieceColor, PieceType } from '../../types/chess';

interface CapturedPiecesProps {
  pieces: { w: PieceType[]; b: PieceType[] };
}

const CapturedPieces: React.FC<CapturedPiecesProps> = ({ pieces }) => {
  const sortPieces = (arr: PieceType[]) =>
    [...arr].sort((a, b) => getPieceValue(b) - getPieceValue(a));

  const materialDiff = (color: PieceColor): number => {
    const mine = pieces[color].reduce((s, p) => s + getPieceValue(p), 0);
    const theirs = pieces[color === 'w' ? 'b' : 'w'].reduce((s, p) => s + getPieceValue(p), 0);
    return mine - theirs;
  };

  const renderCaptures = (color: PieceColor) => {
    const sorted = sortPieces(pieces[color]);
    const capturedBy = color === 'w' ? 'b' : 'w';
    const diff = materialDiff(color);

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          flexWrap: 'wrap',
          minHeight: { xs: 24, sm: 28 },
        }}
      >
        {sorted.map((piece, i) => (
          <Box
            key={i}
            component="img"
            src={getPieceImage(capturedBy, piece)}
            alt={`${capturedBy}${piece}`}
            sx={{ width: { xs: 18, sm: 20 }, height: { xs: 18, sm: 20 }, objectFit: 'contain', opacity: 0.8 }}
          />
        ))}
        {diff > 0 && (
          <Typography variant="caption" sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}>
            +{diff}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {renderCaptures('w')}
      {renderCaptures('b')}
    </Box>
  );
};

export default CapturedPieces;
