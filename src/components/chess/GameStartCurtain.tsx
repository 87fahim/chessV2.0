import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface GameStartCurtainProps {
  /** Show the curtain (true = visible, false = fade out then unmount) */
  visible: boolean;
  /** Player color label, e.g. "White" or "Black" */
  playerLabel?: string;
  /** Optional subtitle, e.g. "vs Computer (Medium)" or opponent name */
  subtitle?: string;
}

const GameStartCurtain: React.FC<GameStartCurtainProps> = ({
  visible,
  playerLabel,
  subtitle,
}) => {
  const [mounted, setMounted] = useState(visible);
  const [opacity, setOpacity] = useState(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Small delay so the element mounts before fading in
      requestAnimationFrame(() => setOpacity(1));
    } else {
      setOpacity(0);
      const timer = setTimeout(() => setMounted(false), 600);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(2px)',
        borderRadius: '4px',
        opacity,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: opacity > 0 ? 'auto' : 'none',
      }}
    >
      <Typography
        variant="h4"
        sx={{
          color: '#fff',
          fontWeight: 800,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          mb: 0.5,
        }}
      >
        {playerLabel ? `Playing as ${playerLabel}` : 'Game Starting'}
      </Typography>
      {subtitle && (
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 500,
            textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default GameStartCurtain;
