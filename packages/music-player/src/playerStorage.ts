import { Platform } from 'react-native';

import type { RepeatMode } from './types';

const STORAGE_KEY = 'lavender.player';
const VERSION = 1;

/** Playback state that is worth restoring after a restart (never autoplay). */
export interface PlayerPersistence {
  version: number;
  currentTrackId: string | null;
  queueIds: string[];
  queueIndex: number;
  positionSec: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  updatedAt: string;
}

export interface PlayerStorage {
  read(): PlayerPersistence | null;
  write(state: PlayerPersistence): void;
}

const isRepeat = (value: unknown): value is RepeatMode =>
  value === 'off' || value === 'all' || value === 'one';

function sanitize(value: unknown): PlayerPersistence | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<PlayerPersistence>;
  if (typeof candidate.currentTrackId !== 'string') return null;
  const queueIds = Array.isArray(candidate.queueIds)
    ? candidate.queueIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    version: VERSION,
    currentTrackId: candidate.currentTrackId,
    queueIds,
    queueIndex: typeof candidate.queueIndex === 'number' ? candidate.queueIndex : 0,
    positionSec: typeof candidate.positionSec === 'number' ? Math.max(0, candidate.positionSec) : 0,
    shuffle: candidate.shuffle === true,
    repeat: isRepeat(candidate.repeat) ? candidate.repeat : 'off',
    volume: typeof candidate.volume === 'number' ? Math.min(1, Math.max(0, candidate.volume)) : 1,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
  };
}

const webStorage: PlayerStorage = {
  read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  write(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Best-effort: playback still works without persistence.
    }
  },
};

let registered: PlayerStorage | null = null;

/** Register a device-local adapter (AsyncStorage / filesystem) on native. */
export function setPlayerStorage(storage: PlayerStorage | null): void {
  registered = storage;
}

function activeStorage(): PlayerStorage | null {
  if (registered) return registered;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return webStorage;
  return null;
}

export function readStoredPlayer(): PlayerPersistence | null {
  return activeStorage()?.read() ?? null;
}

export function writeStoredPlayer(state: PlayerPersistence): void {
  activeStorage()?.write(state);
}

export function clearStoredPlayer(): void {
  activeStorage()?.write({
    version: VERSION,
    currentTrackId: null,
    queueIds: [],
    queueIndex: 0,
    positionSec: 0,
    shuffle: false,
    repeat: 'off',
    volume: 1,
    updatedAt: new Date().toISOString(),
  });
}
