import { createSyncMeta, EPOCH, type SyncMeta } from './types';

const STORAGE_KEY = 'lavender.sync';

export interface SyncStorage {
  read(): SyncMeta | null;
  write(meta: SyncMeta): void;
}

function sanitize(value: unknown): SyncMeta | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SyncMeta>;
  if (candidate.version !== 1) return null;
  const stamp = (input: unknown, fallback: string) =>
    typeof input === 'string' && !Number.isNaN(Date.parse(input)) ? input : fallback;
  const playlists: SyncMeta['playlists'] = {};
  if (candidate.playlists && typeof candidate.playlists === 'object') {
    for (const [id, entry] of Object.entries(candidate.playlists)) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as { updatedAt?: unknown; deletedAt?: unknown };
      playlists[id] = {
        updatedAt: stamp(item.updatedAt, EPOCH),
        deletedAt: typeof item.deletedAt === 'string' ? item.deletedAt : null,
      };
    }
  }
  const removedImports: SyncMeta['removedImports'] = {};
  if (candidate.removedImports && typeof candidate.removedImports === 'object') {
    for (const [id, entry] of Object.entries(candidate.removedImports)) {
      if (typeof entry === 'string') removedImports[id] = stamp(entry, EPOCH);
    }
  }

  return {
    version: 1,
    userId: typeof candidate.userId === 'string' ? candidate.userId : null,
    migratedAt: typeof candidate.migratedAt === 'string' ? candidate.migratedAt : null,
    sections: {
      favorites: stamp(candidate.sections?.favorites, EPOCH),
      recents: stamp(candidate.sections?.recents, EPOCH),
      preferences: stamp(candidate.sections?.preferences, EPOCH),
    },
    playlists,
    removedImports,
    playback: stamp(candidate.playback, EPOCH),
    lastSyncedAt: typeof candidate.lastSyncedAt === 'string' ? candidate.lastSyncedAt : null,
  };
}

const webStorage: SyncStorage = {
  read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  },
  write(meta) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // Best effort: sync bookkeeping can be rebuilt from the server.
    }
  },
};

let registered: SyncStorage | null = null;

/** Native app registers a document-directory adapter before first render. */
export function setSyncStorage(storage: SyncStorage | null): void {
  registered = storage;
}

function activeStorage(): SyncStorage | null {
  if (registered) return registered;
  if (typeof window !== 'undefined' && window.localStorage) return webStorage;
  return null;
}

export function readSyncMeta(): SyncMeta | null {
  return activeStorage()?.read() ?? null;
}

export function writeSyncMeta(meta: SyncMeta): void {
  activeStorage()?.write(meta);
}

/** Fresh bookkeeping when a different account signs in. */
export function resetSyncMeta(userId: string | null): SyncMeta {
  const meta = createSyncMeta(userId);
  writeSyncMeta(meta);
  return meta;
}
