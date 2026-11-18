import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { PlayerStatus } from './types';

export interface EngineSnapshot {
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  isLoaded: boolean;
  isBuffering: boolean;
}

export type EngineEvent =
  | { type: 'status'; snapshot: EngineSnapshot }
  | { type: 'finish' }
  | { type: 'error'; message: string };

export interface NowPlayingMetadata {
  title: string;
  artist: string;
  albumTitle: string;
  artworkUrl?: string;
}

/**
 * The single audio engine.
 *
 * Wraps one `expo-audio` player so only one source can ever be audible. The
 * UI never touches this directly: `PlayerProvider` owns an instance and turns
 * its events into application state.
 */
export interface PlaybackEngine {
  load(uri: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(positionSec: number): Promise<void>;
  setVolume(volume: number): void;
  stop(): void;
  setNowPlayingMetadata(metadata: NowPlayingMetadata): void;
  clearNowPlayingMetadata(): void;
  subscribe(listener: (event: EngineEvent) => void): () => void;
  dispose(): void;
}

const LOAD_TIMEOUT_MS = 15_000;

export function createPlaybackEngine(): PlaybackEngine {
  const listeners = new Set<(event: EngineEvent) => void>();
  let player: AudioPlayer | null = null;
  let disposed = false;
  let readyToken = 0;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let loaded = false;

  const emit = (event: EngineEvent) => {
    for (const listener of listeners) listener(event);
  };

  const configureSession = () => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
      interruptionMode: 'doNotMix',
    }).catch(() => {
      // Web browsers ignore most session options; playback still works.
    });
  };

  const ensurePlayer = (): AudioPlayer => {
    if (player) return player;
    configureSession();
    player = createAudioPlayer(null, { updateInterval: 250 });
    player.addListener('playbackStatusUpdate', (status) => {
      if (disposed) return;
      if (status.isLoaded) loaded = true;
      emit({
        type: 'status',
        snapshot: {
          isPlaying: status.playing,
          positionSec: status.currentTime ?? 0,
          durationSec: status.duration ?? 0,
          isLoaded: status.isLoaded,
          isBuffering: status.isBuffering ?? false,
        },
      });
      if (status.didJustFinish) emit({ type: 'finish' });
    });
    return player;
  };

  const clearLoadTimer = () => {
    if (loadTimer) clearTimeout(loadTimer);
    loadTimer = null;
  };

  return {
    async load(uri: string) {
      const instance = ensurePlayer();
      clearLoadTimer();
      loaded = false;
      readyToken += 1;
      const token = readyToken;
      try {
        instance.replace({ uri });
      } catch (error) {
        emit({ type: 'error', message: describeError(error) });
        return;
      }
      loadTimer = setTimeout(() => {
        if (disposed || token !== readyToken) return;
        if (!loaded && !instance.isLoaded) {
          emit({
            type: 'error',
            message: 'This file could not be decoded. The format may be unsupported or the file may be damaged.',
          });
        }
      }, LOAD_TIMEOUT_MS);
    },

    async play() {
      const instance = ensurePlayer();
      try {
        await instance.play();
        if (loaded) clearLoadTimer();
      } catch (error) {
        emit({ type: 'error', message: describeError(error) });
      }
    },

    pause() {
      player?.pause();
    },

    async seek(positionSec: number) {
      if (!player) return;
      try {
        await player.seekTo(Math.max(0, positionSec));
      } catch {
        // Seeking before the source is ready is a no-op on some platforms.
      }
    },

    setVolume(volume: number) {
      if (!player) return;
      player.volume = Math.min(1, Math.max(0, volume));
    },

    stop() {
      if (!player) return;
      player.pause();
      void player.seekTo(0).catch(() => undefined);
    },

    setNowPlayingMetadata(metadata: NowPlayingMetadata) {
      if (!player) return;
      try {
        player.setActiveForLockScreen(true, {
          title: metadata.title,
          artist: metadata.artist,
          albumTitle: metadata.albumTitle,
          artworkUrl: metadata.artworkUrl,
        }, { showNextTrack: true, showPreviousTrack: true });
      } catch {
        // Lock screen controls are unavailable on web and some devices.
      }
    },

    clearNowPlayingMetadata() {
      try {
        player?.clearLockScreenControls();
      } catch {
        // Ignore: nothing to clear.
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispose() {
      disposed = true;
      clearLoadTimer();
      listeners.clear();
      try {
        player?.remove();
      } catch {
        // Already released.
      }
      player = null;
    },
  };
}

function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not allowed|user gesture|NotAllowedError/i.test(message)) {
    return 'The browser blocked playback. Press play again to start audio.';
  }
  return message || 'Playback failed.';
}

export function statusFromSnapshot(snapshot: EngineSnapshot, current: PlayerStatus): PlayerStatus {
  if (snapshot.isPlaying) return 'playing';
  if (snapshot.isLoaded && snapshot.durationSec > 0 && snapshot.positionSec >= snapshot.durationSec - 0.25) {
    return 'ended';
  }
  return current === 'loading' ? 'loading' : 'paused';
}
