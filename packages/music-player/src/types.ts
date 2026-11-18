import type { Track } from '@lavender/shared';

export type RepeatMode = 'off' | 'all' | 'one';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

/** Everything the UI renders about playback, backed by a real audio engine. */
export interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  /** Elapsed seconds reported by the engine. */
  positionSec: number;
  durationSec: number;
  queue: Track[];
  queueIndex: number;
  repeat: RepeatMode;
  shuffle: boolean;
  /** 0–1. Applied per player; iOS also honours the hardware volume buttons. */
  volume: number;
  status: PlayerStatus;
  /** Human-readable playback or file error, cleared on the next successful load. */
  error: string | null;
  isBuffering: boolean;
}

export type { EngineEvent, PlaybackEngine } from './engine';
