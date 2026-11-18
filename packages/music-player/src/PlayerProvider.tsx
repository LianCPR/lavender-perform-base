import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Track } from '@lavender/shared';

import { createPlaybackEngine, statusFromSnapshot, type PlaybackEngine } from './engine';
import { readStoredPlayer, writeStoredPlayer } from './playerStorage';
import type { PlayerState, RepeatMode } from './types';

export interface PlayerContextValue extends PlayerState {
  /** Load a track (and optionally replace the queue) and start real playback. */
  play: (track?: Track, queue?: Track[]) => void;
  /** Start a randomized copy of the queue. */
  playShuffled: (queue: Track[]) => void;
  /** Play a track that is already in the queue. */
  selectQueueTrack: (index: number) => void;
  moveQueueItem: (fromIndex: number, toIndex: number) => void;
  removeQueueItem: (index: number) => void;
  /** Insert directly after the current track. */
  playNext: (track: Track) => void;
  /** Append to the end of the queue. */
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
  pause: () => void;
  stop: () => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  seekToFraction: (fraction: number) => void;
  seekToSeconds: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  /** Apply account-level playback preferences restored from the cloud. */
  applySyncedPreferences: (preferences: {
    shuffle: boolean;
    repeat: RepeatMode;
    volume: number;
  }) => void;
  /** Compact view of playback used by cross-device sync. */
  playbackSnapshot: {
    currentTrackId: string | null;
    queueIds: string[];
    positionSec: number;
    shuffle: boolean;
    repeat: RepeatMode;
    volume: number;
  };
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export interface PlayerProviderProps {
  children: ReactNode;
  /** Demo fallback when nothing is persisted. */
  initialTrack?: Track;
  initialQueue?: Track[];
  /** Resolves ids from persistence to live tracks (catalog + imports). */
  resolveTrack?: (id: string) => Track | undefined;
  /** Re-resolved track list; imported audio URIs arrive asynchronously. */
  availableTracks?: Track[];
  /**
   * Resolves an authorized playback source for an online track. Supplied by the
   * host so the player stays provider-independent; may throw a readable error.
   */
  resolveProviderTrack?: (track: Track) => Promise<Track>;
}

const REPEAT_ORDER: RepeatMode[] = ['off', 'all', 'one'];

const NO_AUDIO_MESSAGE =
  'This demo track has no audio file. Import a song from your device to play real music.';
const NOT_ON_DEVICE_MESSAGE =
  'This song is in your cloud library, but its file lives on another device. Import the file here to play it.';

function shuffleList(items: Track[]): Track[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    const value = copy[index];
    copy[index] = copy[target] as Track;
    copy[target] = value as Track;
  }
  return copy;
}

function nextIndexFor(
  queue: Track[],
  queueIndex: number,
  shuffle: boolean,
  repeat: RepeatMode,
  direction: 1 | -1,
): number {
  if (queue.length === 0) return -1;
  if (shuffle && queue.length > 1) {
    let candidate = queueIndex;
    for (let attempt = 0; attempt < 12 && candidate === queueIndex; attempt += 1) {
      candidate = Math.floor(Math.random() * queue.length);
    }
    return candidate === queueIndex ? (queueIndex + 1) % queue.length : candidate;
  }
  const candidate = queueIndex + direction;
  if (candidate >= queue.length) return repeat === 'all' ? 0 : -1;
  if (candidate < 0) return repeat === 'all' ? queue.length - 1 : 0;
  return candidate;
}

export function PlayerProvider({
  children,
  initialTrack,
  initialQueue = [],
  resolveTrack,
  availableTracks,
  resolveProviderTrack,
}: PlayerProviderProps) {
  const engineRef = useRef<PlaybackEngine | null>(null);
  const stateRef = useRef<PlayerState | null>(null);
  const autoAdvanceRef = useRef<() => void>(() => undefined);
  // The URI currently loaded into the engine, so a re-resolved track (imported
  // files hydrate asynchronously) is loaded exactly once.
  const loadedUriRef = useRef<string | null>(null);
  // Imported queue entries only resolve once the library hydrates, so the
  // stored ids are kept around to rebuild the session afterwards.
  const storedSessionRef = useRef<{ currentTrackId: string | null; queueIds: string[] } | null>(
    null,
  );
  // Keeps the latest resolver without recreating every playback callback.
  const resolveProviderRef = useRef(resolveProviderTrack);
  resolveProviderRef.current = resolveProviderTrack;

  const ensurePlayable = useCallback(async (track: Track): Promise<Track> => {
    if (track.audio?.uri || !track.provider) return track;
    const resolver = resolveProviderRef.current;
    if (!resolver) {
      throw new Error('Online playback is not available for this track.');
    }
    return resolver(track);
  }, []);

  const [state, setState] = useState<PlayerState>(() => {
    const stored = readStoredPlayer();
    storedSessionRef.current = stored
      ? { currentTrackId: stored.currentTrackId, queueIds: stored.queueIds }
      : null;
    const resolve = resolveTrack ?? (() => undefined);
    const restoredQueue = (stored?.queueIds ?? [])
      .map((id) => resolve(id))
      .filter((track): track is Track => Boolean(track));
    const restoredCurrent = stored?.currentTrackId ? resolve(stored.currentTrackId) : undefined;
    const queue = restoredQueue.length > 0 ? restoredQueue : initialQueue;
    const currentTrack = restoredCurrent ?? initialTrack ?? queue[0] ?? null;
    const queueIndex = currentTrack
      ? Math.max(0, queue.findIndex((track) => track.id === currentTrack.id))
      : 0;
    return {
      currentTrack,
      isPlaying: false,
      positionSec: stored?.positionSec ?? 0,
      durationSec: currentTrack?.durationSec ?? 0,
      queue,
      queueIndex,
      repeat: stored?.repeat ?? 'off',
      shuffle: stored?.shuffle ?? false,
      volume: stored?.volume ?? 1,
      status: 'idle',
      error: null,
      isBuffering: false,
    };
  });
  stateRef.current = state;

  /** Loads a track into the single engine and starts it when asked. */
  const startTrack = useCallback(async (track: Track, positionSec = 0, autoplay = true) => {
    const engine = engineRef.current;
    let playable = track;

    // Online tracks carry metadata only; the provider resolves a fresh,
    // authorized stream URL right before playback.
    if (!track.audio?.uri && track.provider) {
      setState((prev) => ({
        ...prev,
        currentTrack: track,
        durationSec: track.durationSec,
        positionSec,
        isBuffering: true,
        status: 'loading',
        error: null,
        isPlaying: false,
      }));
      try {
        playable = await ensurePlayable(track);
      } catch (error) {
        engineRef.current?.stop();
        setState((prev) => ({
          ...prev,
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'This online track could not be played right now.',
          isBuffering: false,
          isPlaying: false,
        }));
        return;
      }
    }

    const missingMessage = playable.imported ? NOT_ON_DEVICE_MESSAGE : NO_AUDIO_MESSAGE;
    setState((prev) => ({
      ...prev,
      currentTrack: playable,
      durationSec: playable.durationSec,
      positionSec,
      isBuffering: false,
      status: playable.audio?.uri ? 'loading' : 'error',
      error: playable.audio?.uri ? null : missingMessage,
      isPlaying: false,
    }));

    if (!engine) return;
    if (!playable.audio?.uri) {
      engine.stop();
      return;
    }
    await engine.load(playable.audio.uri);
    if (positionSec > 0) await engine.seek(positionSec);
    engine.setVolume(stateRef.current?.volume ?? 1);
    if (autoplay) await engine.play();
  }, [ensurePlayable]);

  const advance = useCallback(
    (direction: 1 | -1, autoplay: boolean) => {
      const prev = stateRef.current;
      if (!prev) return;
      const index = nextIndexFor(prev.queue, prev.queueIndex, prev.shuffle, prev.repeat, direction);
      if (index < 0) {
        engineRef.current?.pause();
        setState((current) => ({
          ...current,
          isPlaying: false,
          status: 'ended',
          positionSec: current.durationSec,
        }));
        return;
      }
      const track = prev.queue[index];
      if (!track) return;
      setState((current) => ({ ...current, queueIndex: index }));
      void startTrack(track, 0, autoplay);
    },
    [startTrack],
  );

  const handleFinish = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    if (current.repeat === 'one') {
      void engineRef.current?.seek(0).then(() => engineRef.current?.play());
      setState((prev) => ({ ...prev, positionSec: 0, isPlaying: true, status: 'playing' }));
      return;
    }
    advance(1, true);
  }, [advance]);
  autoAdvanceRef.current = handleFinish;

  // One engine for the whole app. Created on mount, released on unmount.
  useEffect(() => {
    const engine = createPlaybackEngine();
    engineRef.current = engine;
    engine.setVolume(stateRef.current?.volume ?? 1);

    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'status') {
        const snapshot = event.snapshot;
        setState((prev) => {
          if (!prev.currentTrack) return prev;
          // A failed track must not inherit position/duration from the previous
          // source still sitting in the engine.
          if (prev.status === 'error') return prev;
          const durationSec = snapshot.durationSec > 0 ? snapshot.durationSec : prev.durationSec;
          const status = statusFromSnapshot(snapshot, prev.status);
          const unchanged =
            Math.abs(snapshot.positionSec - prev.positionSec) < 0.2 &&
            Math.abs(durationSec - prev.durationSec) < 0.5 &&
            snapshot.isPlaying === prev.isPlaying &&
            snapshot.isBuffering === prev.isBuffering &&
            status === prev.status;
          if (unchanged) return prev;
          return {
            ...prev,
            positionSec: snapshot.positionSec,
            durationSec,
            isPlaying: snapshot.isPlaying,
            isBuffering: snapshot.isBuffering,
            status,
          };
        });
        return;
      }

      if (event.type === 'finish') {
        autoAdvanceRef.current();
        return;
      }

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: event.message,
        isPlaying: false,
      }));
    });

    const current = stateRef.current?.currentTrack;
    if (current?.audio?.uri) {
      loadedUriRef.current = current.audio.uri;
      void engine.load(current.audio.uri).then(async () => {
        const position = stateRef.current?.positionSec ?? 0;
        if (position > 0) await engine.seek(position);
        engine.setNowPlayingMetadata({
          title: current.title,
          artist: current.artistName,
          albumTitle: current.albumTitle,
          artworkUrl: current.artworkUri,
        });
      });
    }

    return () => {
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Imported tracks resolve their audio URI after the library hydrates, so the
  // current track object is refreshed once the file becomes available.
  useEffect(() => {
    if (!availableTracks) return;
    setState((prev) => {
      const resolve = (track: Track) => availableTracks.find((item) => item.id === track.id) ?? track;
      const stored = storedSessionRef.current;
      const restoredCurrent =
        prev.currentTrack ??
        (stored?.currentTrackId
          ? availableTracks.find((track) => track.id === stored.currentTrackId) ?? null
          : null);
      if (!restoredCurrent) return prev;
      const restoredQueue =
        prev.queue.length > 0
          ? prev.queue
          : (stored?.queueIds ?? [])
              .map((id) => availableTracks.find((track) => track.id === id))
              .filter((track): track is Track => Boolean(track));
      const currentTrack = resolve(restoredCurrent);
      const queue = restoredQueue.map(resolve);
      const queueIndex = Math.max(
        0,
        queue.findIndex((track) => track.id === currentTrack.id),
      );
      const durationSec = prev.durationSec || currentTrack.durationSec;
      const unchanged =
        currentTrack === prev.currentTrack &&
        durationSec === prev.durationSec &&
        queueIndex === prev.queueIndex &&
        queue.length === prev.queue.length &&
        queue.every((track, index) => track === prev.queue[index]);
      if (unchanged) return prev;
      return { ...prev, currentTrack, durationSec, queue, queueIndex };
    });
  }, [availableTracks]);

  // An imported track can be restored before its file URL exists; load it as
  // soon as the resolved track carries an audio URI (still paused).
  const currentAudioUri = state.currentTrack?.audio?.uri;
  useEffect(() => {
    if (!currentAudioUri) return;
    const engine = engineRef.current;
    if (!engine || loadedUriRef.current === currentAudioUri) return;
    loadedUriRef.current = currentAudioUri;
    const position = stateRef.current?.positionSec ?? 0;
    void engine.load(currentAudioUri).then(async () => {
      if (position > 0) await engine.seek(position);
    });
  }, [currentAudioUri]);

  // Keep the lock screen / media session metadata in sync.
  useEffect(() => {
    if (!state.currentTrack) return;
    engineRef.current?.setNowPlayingMetadata({
      title: state.currentTrack.title,
      artist: state.currentTrack.artistName,
      albumTitle: state.currentTrack.albumTitle,
      artworkUrl: state.currentTrack.artworkUri,
    });
  }, [state.currentTrack]);

  // Persist playback so the session can be restored without autoplay.
  const persist = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    writeStoredPlayer({
      version: 1,
      currentTrackId: current.currentTrack?.id ?? null,
      queueIds: current.queue.map((track) => track.id),
      queueIndex: current.queueIndex,
      positionSec: current.positionSec,
      shuffle: current.shuffle,
      repeat: current.repeat,
      volume: current.volume,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  useEffect(() => {
    persist();
  }, [persist, state.currentTrack?.id, state.queue, state.shuffle, state.repeat, state.volume, state.queueIndex]);

  useEffect(() => {
    if (!state.isPlaying) return;
    const timer = setInterval(persist, 5000);
    return () => clearInterval(timer);
  }, [persist, state.isPlaying]);

  const play = useCallback(
    (track?: Track, queue?: Track[]) => {
      const prev = stateRef.current;
      if (!prev) return;
      let nextQueue = queue ?? prev.queue;
      const target = track ?? prev.currentTrack ?? nextQueue[0];
      if (!target) return;
      if (!nextQueue.some((item) => item.id === target.id)) {
        nextQueue = [...nextQueue, target];
      }
      const index = Math.max(0, nextQueue.findIndex((item) => item.id === target.id));
      setState((current) => ({
        ...current,
        queue: nextQueue,
        queueIndex: index,
        shuffle: false,
      }));
      void startTrack(target, 0, true);
    },
    [startTrack],
  );

  const playShuffled = useCallback(
    (queue: Track[]) => {
      if (queue.length === 0) return;
      const shuffled = shuffleList(queue);
      const first = shuffled[0];
      if (!first) return;
      setState((current) => ({ ...current, queue: shuffled, queueIndex: 0, shuffle: true }));
      void startTrack(first, 0, true);
    },
    [startTrack],
  );

  const selectQueueTrack = useCallback(
    (index: number) => {
      const track = stateRef.current?.queue[index];
      if (!track) return;
      setState((current) => ({ ...current, queueIndex: index }));
      void startTrack(track, 0, true);
    },
    [startTrack],
  );

  const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.queue.length ||
        toIndex < 0 ||
        toIndex >= prev.queue.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const queue = [...prev.queue];
      const [item] = queue.splice(fromIndex, 1);
      if (!item) return prev;
      queue.splice(toIndex, 0, item);
      const currentId = prev.currentTrack?.id;
      const queueIndex = currentId ? Math.max(0, queue.findIndex((track) => track.id === currentId)) : 0;
      return { ...prev, queue, queueIndex };
    });
  }, []);

  const removeQueueItem = useCallback(
    (index: number) => {
      const prev = stateRef.current;
      if (!prev || index < 0 || index >= prev.queue.length) return;
      const queue = prev.queue.filter((_, itemIndex) => itemIndex !== index);

      if (queue.length === 0) {
        engineRef.current?.stop();
        setState((current) => ({
          ...current,
          queue: [],
          queueIndex: 0,
          currentTrack: null,
          isPlaying: false,
          positionSec: 0,
          durationSec: 0,
          status: 'idle',
          error: null,
        }));
        return;
      }

      if (index !== prev.queueIndex) {
        const queueIndex = index < prev.queueIndex ? prev.queueIndex - 1 : prev.queueIndex;
        setState((current) => ({ ...current, queue, queueIndex }));
        return;
      }

      const queueIndex = Math.min(index, queue.length - 1);
      const nextTrack = queue[queueIndex];
      setState((current) => ({ ...current, queue, queueIndex }));
      if (nextTrack) void startTrack(nextTrack, 0, prev.isPlaying);
    },
    [startTrack],
  );

  const addToQueue = useCallback((track: Track) => {
    setState((prev) => ({ ...prev, queue: [...prev.queue, track] }));
  }, []);

  const playNext = useCallback((track: Track) => {
    setState((prev) => {
      if (prev.queue.length === 0) return prev;
      const queue = prev.queue.filter((item) => item.id !== track.id);
      const insertAt = Math.min(prev.queueIndex + 1, queue.length);
      queue.splice(insertAt, 0, track);
      return { ...prev, queue };
    });
  }, []);

  const clearQueue = useCallback(() => {
    engineRef.current?.stop();
    setState((prev) => ({
      ...prev,
      queue: [],
      queueIndex: 0,
      currentTrack: null,
      isPlaying: false,
      positionSec: 0,
      durationSec: 0,
      status: 'idle',
      error: null,
    }));
  }, []);

  const pause = useCallback(() => {
    engineRef.current?.pause();
    persist();
    setState((prev) => ({ ...prev, isPlaying: false, status: prev.status === 'error' ? 'error' : 'paused' }));
  }, [persist]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    setState((prev) => ({ ...prev, isPlaying: false, positionSec: 0, status: 'paused' }));
  }, []);

  const togglePlayback = useCallback(() => {
    const prev = stateRef.current;
    if (!prev?.currentTrack) return;
        if (!prev.currentTrack.audio?.uri && !prev.currentTrack.provider) {
      setState((current) => ({ ...current, status: 'error', error: NO_AUDIO_MESSAGE, isPlaying: false }));
      return;
    }
    if (prev.isPlaying) {
      pause();
      return;
    }
    const resumeAt = prev.status === 'ended' ? 0 : prev.positionSec;
    setState((current) => ({ ...current, status: 'loading', error: null }));
    void (async () => {
      const engine = engineRef.current;
      if (!engine) return;
      let track = prev.currentTrack;
      if (!track) return;
      if (!track.audio?.uri && track.provider) {
        try {
          track = await ensurePlayable(track);
          setState((current) => ({ ...current, currentTrack: track }));
        } catch (error) {
          setState((current) => ({
            ...current,
            status: 'error',
            error:
              error instanceof Error ? error.message : 'This online track could not be played.',
            isPlaying: false,
          }));
          return;
        }
      }
      const uri = track.audio?.uri;
      if (!uri) return;
      if (loadedUriRef.current !== uri) {
        loadedUriRef.current = uri;
        await engine.load(uri);
      }
      if (prev.status === 'ended') await engine.seek(0);
      else if (resumeAt > 0) await engine.seek(resumeAt);
      await engine.play();
    })();
  }, [ensurePlayable, pause]);

  const next = useCallback(() => advance(1, true), [advance]);
  const previous = useCallback(() => {
    const prev = stateRef.current;
    if (!prev) return;
    if (prev.positionSec > 3) {
      void engineRef.current?.seek(0);
      setState((current) => ({ ...current, positionSec: 0 }));
      return;
    }
    advance(-1, true);
  }, [advance]);

  const seekToSeconds = useCallback((seconds: number) => {
    const prev = stateRef.current;
    if (!prev) return;
    const duration = prev.durationSec;
    const clamped = Math.min(Math.max(seconds, 0), duration > 0 ? duration : seconds);
    setState((current) => ({ ...current, positionSec: clamped }));
    void engineRef.current?.seek(clamped);
  }, []);

  const seekToFraction = useCallback(
    (fraction: number) => {
      const prev = stateRef.current;
      if (!prev) return;
      seekToSeconds(Math.min(Math.max(fraction, 0), 1) * prev.durationSec);
    },
    [seekToSeconds],
  );

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.min(Math.max(volume, 0), 1);
    engineRef.current?.setVolume(clamped);
    setState((prev) => ({ ...prev, volume: clamped }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
  }, []);

  const cycleRepeat = useCallback(() => {
    setState((prev) => {
      const index = REPEAT_ORDER.indexOf(prev.repeat);
      const repeat = REPEAT_ORDER[(index + 1) % REPEAT_ORDER.length] ?? 'off';
      return { ...prev, repeat };
    });
  }, []);

  const applySyncedPreferences = useCallback<PlayerContextValue['applySyncedPreferences']>(
    (preferences) => {
      engineRef.current?.setVolume(preferences.volume);
      setState((prev) => ({
        ...prev,
        shuffle: preferences.shuffle,
        repeat: preferences.repeat,
        volume: preferences.volume,
      }));
    },
    [],
  );

  const playbackSnapshot = useMemo<PlayerContextValue['playbackSnapshot']>(
    () => ({
      currentTrackId: state.currentTrack?.id ?? null,
      queueIds: state.queue.map((track) => track.id),
      positionSec: state.positionSec,
      shuffle: state.shuffle,
      repeat: state.repeat,
      volume: state.volume,
    }),
    [state.currentTrack?.id, state.queue, state.positionSec, state.shuffle, state.repeat, state.volume],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      ...state,
      play,
      playShuffled,
      selectQueueTrack,
      moveQueueItem,
      removeQueueItem,
      playNext,
      addToQueue,
      clearQueue,
      pause,
      stop,
      togglePlayback,
      next,
      previous,
      seekToFraction,
      seekToSeconds,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      applySyncedPreferences,
      playbackSnapshot,
    }),
    [
      state,
      applySyncedPreferences,
      playbackSnapshot,
      play,
      playShuffled,
      selectQueueTrack,
      moveQueueItem,
      removeQueueItem,
      playNext,
      addToQueue,
      clearQueue,
      pause,
      stop,
      togglePlayback,
      next,
      previous,
      seekToFraction,
      seekToSeconds,
      setVolume,
      toggleShuffle,
      cycleRepeat,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/** Read playback state and intent-level actions. */
export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used inside <PlayerProvider>.');
  }
  return context;
}
