import { useCallback } from 'react';
import { playSoundEffect, type GameSoundEffect } from '../lib/sound/gameSounds';
import { useAppSelector } from './useStore';

interface MoveOutcomeInput {
  san?: string;
  captured?: boolean;
  promotion?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
}

export function useGameSounds() {
  const settings = useAppSelector((s) => s.settings.data);

  const isEffectEnabled = useCallback(
    (effect: GameSoundEffect): boolean => {
      if (settings.soundEnabled === false) return false;

      switch (effect) {
        case 'move':
        case 'castle':
        case 'promotion':
          return settings.moveSoundEnabled !== false;
        case 'capture':
          return settings.captureSoundEnabled !== false;
        case 'check':
        case 'checkmate':
          return settings.checkSoundEnabled !== false;
        default:
          return true;
      }
    },
    [settings],
  );

  const play = useCallback(
    (effect: GameSoundEffect) => {
      if (!isEffectEnabled(effect)) return;
      playSoundEffect(effect);
    },
    [isEffectEnabled],
  );

  const playMoveOutcome = useCallback(
    ({ san, captured, promotion, isCheck, isCheckmate }: MoveOutcomeInput) => {
      if (isCheckmate) {
        play('checkmate');
        return;
      }

      if (isCheck) {
        play('check');
        return;
      }

      if (promotion) {
        play('promotion');
        return;
      }

      if (san?.startsWith('O-O')) {
        play('castle');
        return;
      }

      if (captured) {
        play('capture');
        return;
      }

      play('move');
    },
    [play],
  );

  const playGameStart = useCallback(() => {
    play('game-start');
  }, [play]);

  const playGameEnd = useCallback(() => {
    play('game-end');
  }, [play]);

  const playIllegalMove = useCallback(() => {
    play('illegal-move');
  }, [play]);

  return {
    play,
    playMoveOutcome,
    playGameStart,
    playGameEnd,
    playIllegalMove,
  };
}
