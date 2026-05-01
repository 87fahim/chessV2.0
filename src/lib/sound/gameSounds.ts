import moveSfx from '../../assets/sounds/move.mp3';
import captureSfx from '../../assets/sounds/capture.mp3';
import checkSfx from '../../assets/sounds/check.mp3';
import checkmateSfx from '../../assets/sounds/checkmate.mp3';
import castleSfx from '../../assets/sounds/castle.mp3';
import promotionSfx from '../../assets/sounds/promotion.mp3';
import illegalMoveSfx from '../../assets/sounds/illegal-move.mp3';
import gameStartSfx from '../../assets/sounds/game-start.mp3';
import gameEndSfx from '../../assets/sounds/game-end.mp3';

export type GameSoundEffect =
  | 'move'
  | 'capture'
  | 'check'
  | 'checkmate'
  | 'castle'
  | 'promotion'
  | 'illegal-move'
  | 'game-start'
  | 'game-end';

const SOUND_SOURCES: Record<GameSoundEffect, string> = {
  move: moveSfx,
  capture: captureSfx,
  check: checkSfx,
  checkmate: checkmateSfx,
  castle: castleSfx,
  promotion: promotionSfx,
  'illegal-move': illegalMoveSfx,
  'game-start': gameStartSfx,
  'game-end': gameEndSfx,
};

const audioCache = new Map<GameSoundEffect, HTMLAudioElement>();

function getBaseAudio(effect: GameSoundEffect): HTMLAudioElement {
  const cached = audioCache.get(effect);
  if (cached) return cached;

  const audio = new Audio(SOUND_SOURCES[effect]);
  audio.preload = 'auto';
  audioCache.set(effect, audio);
  return audio;
}

export function playSoundEffect(effect: GameSoundEffect, volume = 1): void {
  try {
    const base = getBaseAudio(effect);
    const audio = base.cloneNode(true) as HTMLAudioElement;
    audio.volume = Math.max(0, Math.min(1, volume));
    void audio.play().catch(() => undefined);
  } catch {
    // Ignore sound playback errors (e.g., autoplay restrictions).
  }
}
