/** Lightweight procedural SFX via Web Audio — no external audio files. */

const VOLUME_STORAGE_KEY = 'ludo.soundVolume'
/** UI volume is 0–1; multiply so 100% is actually audible over the board UI. */
const MASTER_OUTPUT_SCALE = 20
const DEFAULT_VOLUME = 0.85

let audioContext: AudioContext | null = null
let masterGain: GainNode | null = null
let volume = loadStoredVolume()

function loadStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY)
    if (raw === null) {
      return DEFAULT_VOLUME
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      return DEFAULT_VOLUME
    }
    return Math.min(1, Math.max(0, parsed))
  } catch {
    return DEFAULT_VOLUME
  }
}

function masterGainValue(uiVolume: number): number {
  return Math.min(1, Math.max(0, uiVolume)) * MASTER_OUTPUT_SCALE
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioCtx) {
    return null
  }

  if (!audioContext) {
    audioContext = new AudioCtx()
    masterGain = audioContext.createGain()
    masterGain.gain.value = masterGainValue(volume)
    masterGain.connect(audioContext.destination)
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume()
  }

  return audioContext
}

function getMaster(): GainNode | null {
  const context = getAudioContext()
  if (!context) {
    return null
  }
  if (!masterGain) {
    masterGain = context.createGain()
    masterGain.gain.value = masterGainValue(volume)
    masterGain.connect(context.destination)
  }
  return masterGain
}

export function unlockGameSounds(): void {
  getAudioContext()
}

export function getGameSoundVolume(): number {
  return volume
}

export function setGameSoundVolume(next: number): void {
  volume = Math.min(1, Math.max(0, next))
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume))
  } catch {
    // ignore
  }
  const master = getMaster()
  if (master && audioContext) {
    master.gain.setTargetAtTime(masterGainValue(volume), audioContext.currentTime, 0.02)
  }
}

function canPlay(): boolean {
  return volume > 0.001
}

function tone(
  context: AudioContext,
  {
    frequency,
    duration,
    type = 'sine',
    gain = 0.08,
    when = 0,
    attack = 0.01,
    decay = 0.08,
    frequencyEnd,
  }: {
    frequency: number
    duration: number
    type?: OscillatorType
    gain?: number
    when?: number
    attack?: number
    decay?: number
    frequencyEnd?: number
  },
): void {
  const master = getMaster()
  if (!master) {
    return
  }

  const start = context.currentTime + when
  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  if (frequencyEnd !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequencyEnd), start + duration)
  }

  gainNode.gain.setValueAtTime(0.0001, start)
  gainNode.gain.exponentialRampToValueAtTime(gain, start + attack)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.01, duration - decay))

  oscillator.connect(gainNode)
  gainNode.connect(master)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

function noiseBurst(
  context: AudioContext,
  {
    duration,
    gain = 0.04,
    when = 0,
    filterFreq = 1200,
  }: {
    duration: number
    gain?: number
    when?: number
    filterFreq?: number
  },
): void {
  const master = getMaster()
  if (!master) {
    return
  }

  const start = context.currentTime + when
  const sampleCount = Math.floor(context.sampleRate * duration)
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let index = 0; index < sampleCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount)
  }

  const source = context.createBufferSource()
  source.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = filterFreq
  filter.Q.value = 0.9

  const gainNode = context.createGain()
  gainNode.gain.setValueAtTime(0.0001, start)
  gainNode.gain.exponentialRampToValueAtTime(gain, start + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration)

  source.connect(filter)
  filter.connect(gainNode)
  gainNode.connect(master)
  source.start(start)
  source.stop(start + duration + 0.02)
}

/** Soft wooden hop / jump for each tile step. */
export function playHopSound(hopIndex = 0): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  const pitch = 420 + (hopIndex % 5) * 28
  tone(context, {
    frequency: pitch,
    frequencyEnd: pitch * 0.72,
    duration: 0.11,
    type: 'triangle',
    gain: 0.055,
    attack: 0.004,
    decay: 0.05,
  })
  noiseBurst(context, { duration: 0.045, gain: 0.028, filterFreq: 1800 })
}

/** Short dice clack while the cube spins. */
export function playDiceRollSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  for (let index = 0; index < 5; index += 1) {
    noiseBurst(context, {
      duration: 0.035,
      gain: 0.03 - index * 0.003,
      when: index * 0.07,
      filterFreq: 1400 + index * 180,
    })
  }
}

/** Bright fanfare when a new match begins. */
export function playGameStartSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  const notes = [392, 523.25, 659.25, 783.99]
  notes.forEach((frequency, index) => {
    tone(context, {
      frequency,
      duration: 0.22,
      type: 'triangle',
      gain: 0.045,
      when: index * 0.1,
      attack: 0.01,
      decay: 0.08,
    })
  })
  noiseBurst(context, { duration: 0.08, gain: 0.025, when: 0.35, filterFreq: 2000 })
}

/** Token leaves the yard onto the board. */
export function playYardExitSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  tone(context, {
    frequency: 280,
    frequencyEnd: 520,
    duration: 0.18,
    type: 'sine',
    gain: 0.05,
    attack: 0.01,
    decay: 0.06,
  })
  tone(context, {
    frequency: 560,
    frequencyEnd: 720,
    duration: 0.12,
    type: 'triangle',
    gain: 0.03,
    when: 0.08,
  })
}

/** Soft cue when turn passes with no legal moves. */
export function playTurnPassSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  tone(context, {
    frequency: 360,
    frequencyEnd: 240,
    duration: 0.16,
    type: 'sine',
    gain: 0.035,
    attack: 0.01,
    decay: 0.06,
  })
}

/** Extra turn earned (6 / capture / token home). */
export function playExtraTurnSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  ;[440, 554.37, 659.25].forEach((frequency, index) => {
    tone(context, {
      frequency,
      duration: 0.14,
      type: 'triangle',
      gain: 0.04,
      when: index * 0.07,
      attack: 0.008,
      decay: 0.05,
    })
  })
}

/** Capture sting — something got hit. */
export function playCaptureHitSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  tone(context, {
    frequency: 220,
    frequencyEnd: 90,
    duration: 0.22,
    type: 'sawtooth',
    gain: 0.045,
    attack: 0.005,
    decay: 0.08,
  })
  noiseBurst(context, { duration: 0.12, gain: 0.05, filterFreq: 700 })
}

/** Whoosh while a captured token slides home. */
export function playCaptureTravelSound(durationSec: number): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  const duration = Math.max(0.25, Math.min(2.4, durationSec))
  tone(context, {
    frequency: 640,
    frequencyEnd: 160,
    duration,
    type: 'sine',
    gain: 0.035,
    attack: 0.04,
    decay: 0.12,
  })
  noiseBurst(context, {
    duration: Math.min(0.35, duration * 0.35),
    gain: 0.03,
    filterFreq: 900,
  })
}

/** Soft land when a captured token reaches the yard. */
export function playCaptureHomeSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  tone(context, {
    frequency: 320,
    frequencyEnd: 180,
    duration: 0.16,
    type: 'triangle',
    gain: 0.05,
    attack: 0.01,
    decay: 0.06,
  })
  tone(context, {
    frequency: 480,
    frequencyEnd: 360,
    duration: 0.1,
    type: 'sine',
    gain: 0.03,
    when: 0.04,
  })
}

/** Chime when a single token reaches the final tile. */
export function playTokenFinishSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
    tone(context, {
      frequency,
      duration: 0.18,
      type: 'sine',
      gain: 0.04,
      when: index * 0.08,
      attack: 0.01,
      decay: 0.06,
    })
  })
}

/** Player finishes all tokens / locks a placement. */
export function playPlayerWinSound(place = 1): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  const fanfares: number[][] = [
    [523.25, 659.25, 783.99, 1046.5],
    [493.88, 587.33, 740.0],
    [440, 554.37, 659.25],
    [349.23, 415.3, 523.25],
  ]
  const notes = fanfares[Math.min(place, fanfares.length) - 1] ?? fanfares[3]

  notes.forEach((frequency, index) => {
    tone(context, {
      frequency,
      duration: 0.28,
      type: 'triangle',
      gain: 0.05 - index * 0.004,
      when: index * 0.12,
      attack: 0.015,
      decay: 0.1,
    })
  })
  if (place === 1) {
    tone(context, {
      frequency: 1318.5,
      duration: 0.35,
      type: 'sine',
      gain: 0.03,
      when: 0.45,
      attack: 0.02,
      decay: 0.12,
    })
  }
}

/** Full match over — final standings popup. */
export function playGameEndSound(): void {
  if (!canPlay()) {
    return
  }
  const context = getAudioContext()
  if (!context) {
    return
  }

  const rising = [261.63, 329.63, 392, 523.25, 659.25]
  rising.forEach((frequency, index) => {
    tone(context, {
      frequency,
      duration: 0.2,
      type: 'sine',
      gain: 0.038,
      when: index * 0.09,
      attack: 0.01,
      decay: 0.07,
    })
  })
  tone(context, {
    frequency: 783.99,
    frequencyEnd: 1046.5,
    duration: 0.55,
    type: 'triangle',
    gain: 0.05,
    when: 0.5,
    attack: 0.02,
    decay: 0.18,
  })
  noiseBurst(context, { duration: 0.2, gain: 0.03, when: 0.55, filterFreq: 2400 })
}
