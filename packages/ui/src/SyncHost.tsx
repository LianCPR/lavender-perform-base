import {
  createSyncMeta,
  getSupabaseClient,
  readSyncMeta,
  runSyncPass,
  useAuth,
  writeSyncMeta,
  type SyncMeta,
  type SyncState,
} from '@lavender/backend';
import { useLibrary, type LibrarySyncSnapshot } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import type { ID, Playlist } from '@lavender/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface SyncContextValue extends SyncState {
  /** Push local changes and pull newer cloud data once. */
  syncNow: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

const PUSH_DEBOUNCE_MS = 1500;

function playlistsById(playlists: Playlist[]): Map<ID, Playlist> {
  return new Map(playlists.map((playlist) => [playlist.id, playlist]));
}

function sameIds(a: ID[], b: ID[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

function samePlaylist(a: Playlist, b: Playlist): boolean {
  return (
    a.name === b.name &&
    (a.description ?? '') === (b.description ?? '') &&
    a.palette === b.palette &&
    sameIds(a.trackIds, b.trackIds)
  );
}

function sameHistory(a: LibrarySyncSnapshot['listeningHistory'], b: LibrarySyncSnapshot['listeningHistory']): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => {
    const other = b[index];
    return (
      other !== undefined &&
      entry.id === other.id &&
      entry.listenedSec === other.listenedSec &&
      entry.playedAt === other.playedAt
    );
  });
}

function sameSnapshot(a: LibrarySyncSnapshot, b: LibrarySyncSnapshot): boolean {
  if (!sameIds(a.favoriteTrackIds, b.favoriteTrackIds)) return false;
  if (!sameIds(a.recentTrackIds, b.recentTrackIds)) return false;
  if (!sameHistory(a.listeningHistory, b.listeningHistory)) return false;
  if (!sameIds(a.historyDeletedIds, b.historyDeletedIds)) return false;
  if (a.historyClearedAt !== b.historyClearedAt) return false;
  if (a.preferences.sort !== b.preferences.sort || a.preferences.view !== b.preferences.view) {
    return false;
  }
  if (a.playlists.length !== b.playlists.length) return false;
  const before = playlistsById(a.playlists);
  for (const [id, playlist] of playlistsById(b.playlists)) {
    const previous = before.get(id);
    if (!previous || !samePlaylist(previous, playlist)) return false;
  }
  return true;
}

function isOfflineError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    (typeof navigator !== 'undefined' && navigator.onLine === false) ||
    text.includes('failed to fetch') ||
    text.includes('network') ||
    text.includes('timeout')
  );
}

/**
 * Local-first sync shell.
 *
 * The device library stays authoritative for what is on this device; this host
 * only exchanges metadata with Supabase. Guest mode and offline use keep working
 * because every write already happened locally before this component ran.
 */
export function SyncHost({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const library = useLibrary();
  const player = usePlayer();
  const [state, setState] = useState<SyncState>({
    status: auth.configured ? 'signed-out' : 'disabled',
    lastSyncedAt: null,
    error: null,
    pending: false,
    migrated: false,
    cloudTrackCount: 0,
  });

  const metaRef = useRef<SyncMeta>(createSyncMeta(null));
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The snapshot we expect after applying a remote patch; matches are not local edits.
  const expectedRemoteRef = useRef<LibrarySyncSnapshot | null>(null);
  const snapshotRef = useRef(library.syncSnapshot);
  const playbackRef = useRef(player.playbackSnapshot);
  const userId = auth.user?.id ?? null;

  const commitMeta = useCallback((meta: SyncMeta) => {
    metaRef.current = meta;
    writeSyncMeta(meta);
  }, []);

  // A different account starts from fresh bookkeeping so its data is not mixed
  // with the previous listener's timestamps.
  useEffect(() => {
    if (!userId) {
      metaRef.current = readSyncMeta() ?? createSyncMeta(null);
      setState((prev) => ({ ...prev, status: auth.configured ? 'signed-out' : 'disabled' }));
      return;
    }
    const stored = readSyncMeta();
    if (!stored || stored.userId !== userId) {
      commitMeta(createSyncMeta(userId));
      setState((prev) => ({ ...prev, migrated: false, lastSyncedAt: null }));
    } else {
      metaRef.current = stored;
      setState((prev) => ({ ...prev, lastSyncedAt: stored.lastSyncedAt, migrated: Boolean(stored.migratedAt) }));
    }
  }, [auth.configured, commitMeta, userId]);

  const syncNow = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client || !userId || runningRef.current) return;

    runningRef.current = true;
    setState((prev) => ({ ...prev, status: 'syncing', error: null }));
    try {
      const result = await runSyncPass({
        client,
        userId,
        meta: metaRef.current,
        local: {
          favoriteTrackIds: library.syncSnapshot.favoriteTrackIds,
          recentTrackIds: library.syncSnapshot.recentTrackIds,
          playlists: library.syncSnapshot.playlists,
          preferences: library.syncSnapshot.preferences,
          imports: library.syncSnapshot.imports,
          listeningHistory: library.syncSnapshot.listeningHistory,
          historyDeletedIds: library.syncSnapshot.historyDeletedIds,
          historyClearedAt: library.syncSnapshot.historyClearedAt,
        },
        playback: player.playbackSnapshot,
        applyLibrary: (patch) => {
          const current = library.syncSnapshot;
          const expected: LibrarySyncSnapshot = {
            favoriteTrackIds: patch.favoriteTrackIds ?? current.favoriteTrackIds,
            recentTrackIds: patch.recentTrackIds ?? current.recentTrackIds,
            playlists: patch.playlists ?? current.playlists,
            preferences: patch.preferences ?? current.preferences,
            imports: current.imports,
            listeningHistory: patch.listeningHistory ?? current.listeningHistory,
            historyDeletedIds: current.historyDeletedIds,
            historyClearedAt: current.historyClearedAt,
            personalization: current.personalization,
          };
          expectedRemoteRef.current = expected;
          library.applySyncedLibrary(patch);
        },
        applyPlayback: (preferences) => player.applySyncedPreferences(preferences),
      });

      commitMeta(result.meta);
      setState({
        status: 'idle',
        lastSyncedAt: result.meta.lastSyncedAt,
        error: null,
        pending: false,
        migrated: Boolean(result.meta.migratedAt),
        cloudTrackCount: result.cloudTrackCount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Sync failed. Your library is still available offline.';
      setState((prev) => ({
        ...prev,
        status: isOfflineError(message) ? 'offline' : 'error',
        error: message,
        pending: prev.pending,
      }));
    } finally {
      runningRef.current = false;
    }
  }, [commitMeta, library, player, userId]);

  const scheduleSync = useCallback(() => {
    if (!userId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void syncNow();
    }, PUSH_DEBOUNCE_MS);
  }, [syncNow, userId]);

  // Detect local edits and stamp them so a newer cloud copy cannot win by accident.
  useEffect(() => {
    const next = library.syncSnapshot;
    const prev = snapshotRef.current;

    const expected = expectedRemoteRef.current;
    if (expected) {
      expectedRemoteRef.current = null;
      snapshotRef.current = next;
      // A pure remote application is not a local edit and must not be stamped.
      if (sameSnapshot(next, expected)) return;
    }
    snapshotRef.current = next;
    if (!userId) return;

    const meta = metaRef.current;
    let changed = false;
    const now = new Date().toISOString();

    if (!sameIds(prev.favoriteTrackIds, next.favoriteTrackIds)) {
      meta.sections.favorites = now;
      changed = true;
    }
    if (!sameIds(prev.recentTrackIds, next.recentTrackIds)) {
      meta.sections.recents = now;
      changed = true;
    }
    if (
      !sameHistory(prev.listeningHistory, next.listeningHistory) ||
      !sameIds(prev.historyDeletedIds, next.historyDeletedIds) ||
      prev.historyClearedAt !== next.historyClearedAt
    ) {
      changed = true;
    }
    if (
      prev.preferences.sort !== next.preferences.sort ||
      prev.preferences.view !== next.preferences.view
    ) {
      meta.sections.preferences = now;
      changed = true;
    }

    const before = playlistsById(prev.playlists);
    const after = playlistsById(next.playlists);
    for (const [id, playlist] of after) {
      const previous = before.get(id);
      if (!previous || !samePlaylist(previous, playlist)) {
        meta.playlists[id] = { updatedAt: now, deletedAt: null };
        changed = true;
      }
    }
    for (const id of before.keys()) {
      if (!after.has(id)) {
        meta.playlists[id] = { updatedAt: now, deletedAt: now };
        changed = true;
      }
    }

    // Imported tracks removed here must not reappear as cloud-only metadata.
    const importedBefore = new Set(prev.imports.map((item) => item.track.id));
    const importedAfter = new Set(next.imports.map((item) => item.track.id));
    for (const id of importedBefore) {
      if (!importedAfter.has(id)) {
        meta.removedImports[id] = now;
        changed = true;
      }
    }

    if (changed) {
      commitMeta(meta);
      setState((prevState) => ({ ...prevState, pending: true }));
      scheduleSync();
    }
  }, [commitMeta, library.syncSnapshot, scheduleSync, userId]);

  // Playback preferences change (volume/shuffle/repeat) are synced separately.
  useEffect(() => {
    const next = player.playbackSnapshot;
    const prev = playbackRef.current;
    playbackRef.current = next;
    if (!userId) return;
    const changed =
      prev.shuffle !== next.shuffle || prev.repeat !== next.repeat || prev.volume !== next.volume;
    if (!changed) return;
    metaRef.current.playback = new Date().toISOString();
    commitMeta(metaRef.current);
    setState((prevState) => ({ ...prevState, pending: true }));
    scheduleSync();
  }, [commitMeta, player.playbackSnapshot, scheduleSync, userId]);

  // Initial sync after sign-in and whenever the account changes.
  useEffect(() => {
    if (!userId || !auth.configured) return;
    void syncNow();
    // Runs once per signed-in account.
  }, [userId, auth.configured]);

  // Reconnect / disconnect handling keeps the status honest.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setState((prev) => ({ ...prev, status: userId ? 'idle' : prev.status }));
      void syncNow();
    };
    const handleOffline = () => {
      setState((prev) => ({ ...prev, status: userId ? 'offline' : prev.status }));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [syncNow, userId]);

  const value = useMemo<SyncContextValue>(
    () => ({ ...state, syncNow }),
    [state, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used inside <SyncHost>.');
  return context;
}
