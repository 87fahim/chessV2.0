import React from 'react';
import { Box } from '@mui/material';
import LudoApp from '../ludo/src/App';
import { ErrorBoundary } from '../ludo/src/ErrorBoundary';
import './ludoEmbed.css';

/**
 * Chess route shell for the local Ludo board.
 * Uses Ludo's client UI + localGameEngine only (no Ludo server).
 */
const LudoPage: React.FC = () => {
  return (
    <Box className="ludo-root" sx={{ width: '100%', minHeight: '100%' }}>
      <ErrorBoundary>
        <LudoApp />
      </ErrorBoundary>
    </Box>
  );
};

export default LudoPage;
