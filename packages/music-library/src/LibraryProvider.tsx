import {
  MAX_HISTORY_ENTRIES,
  MAX_HISTORY_TOMBSTONES,
  mergeHistoryEntries,
  type ListeningHistoryEntry,
} from '@lavender/personalization';
import { addTracks, createPlaylist as makePlaylist, removeTrack } from '@lavender/playlists';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  Album,
  Artist,
  ArtworkPalette,
  ID,
  Playlist,
  ProviderAlbum,
  ProviderArtist,
  ProviderPlaylist,
  Track,
} from '@lavender/shared';

import { parseAudioMetadata } from './audioMetadata';
import { demoCatalog, type MusicCatalog } from './demoCatalog';
import {
  initialLibraryState,
  MAX_ONLINE_TRACKS,
  MAX_RECENT_SEARCHES,
  MAX_RECENT_TRACKS,
  readStoredLibrary,
  writeStoredLibrary,
  type ImportedTrackRecord,
  type LibraryPreferences,
  type LibrarySort,
  type LibraryState,
  type LibraryView,
} from './libraryStorage';
import { loadLocalAudio, pickAudioFiles, removeLocalAudio, saveLocalAudio } from './localAudio';
import * as selectors from './selectors';

const IMPORT_PALETTES: ArtworkPalette[] = ['haze', 'ocean', 'lavender', 'sage', 'rose', 'dusk', 'plum', 'ember'];

export interface ImportResult {
  added: number;
  canceled: boolean;
  failed: { name: string; reason: string }[];
}

/** Palette rotation for playlists created in the app. */
const CREATE_PALETTES: ArtworkPalette[] = ['lavender', 'rose', 'haze', 'dusk', 'plum', 'ocean'];

export interface LibrarySyncSnapshot {
  favoriteTrackIds: ID[];
  recentTrackIds: ID[];
  playlists: Playlist[];
  preferences: LibraryPreferences;
  imports: ImportedTrackRecord[];
  listeningHistory: ListeningHistoryEntry[];
  historyDeletedIds: string[];
  historyClearedAt: string | null;
  personalization: { enabled: boolean; dismissedRecommendations: string[] };
}

/** What cross-device sync may write back into the device-local library. */
export interface SyncedLibraryPatch {
  favoriteTrackIds?: ID[];
  recentTrackIds?: ID[];
  playlists?: Playlist[];
  preferences?: LibraryPreferences;
  /** Metadata-only imported tracks that live in the cloud, not on this device. */
  cloudTracks?: Track[];
  /** Additive listening history pulled from the cloud. */
  listeningHistory?: ListeningHistoryEntry[];
}

export interface LibraryContextValue {
  catalog: MusicCatalog;

  favoriteTrackIds: ID[];
  isFavorite: (trackId: ID) => boolean;
  toggleFavorite: (trackId: ID) => void;

  /** Listener playlists first, then the curated demo playlists. */
  playlists: Playlist[];
  userPlaylists: Playlist[];
  playlistById: (id: ID) => Playlist | undefined;
  createPlaylist: (name: string) => Playlist | null;
  renamePlaylist: (id: ID, name: string) => void;
  deletePlaylist: (id: ID) => void;
  addTracksToPlaylist: (id: ID, trackIds: ID[]) => void;
  removeTrackFromPlaylist: (id: ID, trackId: ID) => void;

  recentTrackIds: ID[];
  recentTracks: Track[];
  recordPlayed: (trackId: ID) => void;

  /** Measured listening sessions, newest first; metadata only. */
  listeningHistory: ListeningHistoryEntry[];
  recordListen: (entry: ListeningHistoryEntry) => void;
  deleteHistoryEntry: (entryId: string) => void;
  clearListeningHistory: () => void;
  historyClearedAt: string | null;

  personalizationEnabled: boolean;
  setPersonalizationEnabled: (enabled: boolean) => void;
  dismissedRecommendations: string[];
  dismissRecommendation: (id: string) => void;
  restoreRecommendation: (id: string) => void;
  resetTasteProfile: () => void;

  freshImports: ImportedTrackRecord[];
  importMusic: () => Promise<ImportResult>;
  isImporting: boolean;
  updateImportedTrack: (
    id: ID,
    patch: { title?: string; artistName?: string; albumTitle?: string },
  ) => void;
  removeImportedTrack: (id: ID) => void;
  allTracks: Track[];

  /** Imported metadata known in the cloud but without a local audio file. */
  cloudTracks: Track[];
  /** True when the track has a playable file on this device. */
  isLocallyAvailable: (track: Track) => boolean;
  /** Device-local data the sync engine reads and writes. */
  syncSnapshot: LibrarySyncSnapshot;
  applySyncedLibrary: (patch: SyncedLibraryPatch) => void;

  recentSearches: string[];
  recordSearch: (term: string) => void;
  clearSearches: () => void;

  preferences: LibraryPreferences;
  setSort: (sort: LibrarySort) => void;
  setView: (view: LibraryView) => void;

  /** Provider metadata seen on this device; keeps online queues resolvable. */
  cacheOnlineTracks: (tracks: Track[]) => void;
  /** Online tracks explicitly saved into the unified library. */
  savedOnlineTracks: Track[];
  isSavedOnlineTrack: (id: ID) => boolean;
  toggleOnlineTrackSaved: (track: Track) => void;
  savedOnlineAlbums: ProviderAlbum[];
  isSavedOnlineAlbum: (id: ID) => boolean;
  toggleOnlineAlbumSaved: (album: ProviderAlbum) => void;
  followedOnlineArtists: ProviderArtist[];
  isFollowingOnlineArtist: (id: ID) => boolean;
  toggleOnlineArtistFollowed: (artist: ProviderArtist) => void;
  savedOnlinePlaylists: ProviderPlaylist[];
  isSavedOnlinePlaylist: (id: ID) => boolean;
  toggleOnlinePlaylistSaved: (playlist: ProviderPlaylist) => void;

  /** Convenience wrappers around the pure selectors. */
  albumById: (id: ID) => Album | undefined;
  artistById: (id: ID) => Artist | undefined;
  trackById: (id: ID) => Track | undefined;
  tracksForAlbum: (albumId: ID) => Track[];
  tracksForArtist: (artistId: ID) => Track[];
  tracksForPlaylist: (playlist: Playlist) => Track[];
  tracksForIds: (ids: ID[]) => Track[];
}

export const LibraryContext = createContext<LibraryContextValue | null>(null);

/** Merge provider tracks into the cache, dropping short-lived stream URLs. */
function mergeOnlineTracks(existing: Track[], incoming: Track[]): Track[] {
  const providerTracks = incoming.filter((track) => track.provider && track.providerTrackId);
  if (providerTracks.length === 0) return existing;
  const map = new Map(existing.map((track) => [track.id, track]));
  for (const track of providerTracks) {
    map.delete(track.id);
    map.set(track.id, { ...track, audio: undefined });
  }
  return [...map.values()].slice(-MAX_ONLINE_TRACKS);
}

export interface LibraryProviderProps {
  children: ReactNode;
  /** Defaults to the local demo catalog. */
  catalog?: MusicCatalog;
}

export function LibraryProvider({ children, catalog = demoCatalog }: LibraryProviderProps) {
  // Read once on mount; the write effect below keeps storage in sync.
  const [state, setState] = useState<LibraryState>(() => readStoredLibrary() ?? initialLibraryState);
  const [isImporting, setIsImporting] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    writeStoredLibrary(state);
  }, [state]);

  // Blob URLs and picker cache paths do not survive a restart, so the durable
  // copy is resolved again for every imported track. Missing files stay in the
  // library as metadata and fail gracefully when they are played.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    let cancelled = false;

    const restore = async () => {
      const records = state.importedTracks;
      if (records.length === 0) return;
      const resolved = await Promise.all(
        records.map(async (record) => {
          const uri = await loadLocalAudio(record.storageKey);
          return { record, uri };
        }),
      );
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        importedTracks: prev.importedTracks.map((record) => {
          const match = resolved.find((item) => item.record.storageKey === record.storageKey);
          if (!match?.uri) return { ...record, track: { ...record.track, audio: undefined } };
          return {
            ...record,
            track: {
              ...record.track,
              audio: {
                uri: match.uri,
                mimeType: record.mimeType,
                format: record.format,
              },
            },
          };
        }),
      }));
    };

    void restore();
    return () => {
      cancelled = true;
    };
    // Hydration runs once, with the state read on mount.
  }, []);

  const toggleFavorite = useCallback((trackId: ID) => {
    setState((prev) => ({
      ...prev,
      favoriteTrackIds: prev.favoriteTrackIds.includes(trackId)
        ? prev.favoriteTrackIds.filter((id) => id !== trackId)
        : [trackId, ...prev.favoriteTrackIds],
    }));
  }, []);

  const recordPlayed = useCallback((trackId: ID) => {
    setState((prev) =>
      prev.recentTrackIds[0] === trackId
        ? prev
        : {
            ...prev,
            recentTrackIds: [trackId, ...prev.recentTrackIds.filter((id) => id !== trackId)].slice(
              0,
              MAX_RECENT_TRACKS,
            ),
          },
    );
  }, []);

  const recordListen = useCallback((entry: ListeningHistoryEntry) => {
    setState((prev) => ({
      ...prev,
      listeningHistory: mergeHistoryEntries(prev.listeningHistory, [entry]).slice(
        0,
        MAX_HISTORY_ENTRIES,
      ),
      historyDeletedIds: prev.historyDeletedIds.filter((id) => id !== entry.id),
    }));
  }, []);

  const deleteHistoryEntry = useCallback((entryId: string) => {
    setState((prev) => ({
      ...prev,
      listeningHistory: prev.listeningHistory.filter((entry) => entry.id !== entryId),
      historyDeletedIds: [entryId, ...prev.historyDeletedIds.filter((id) => id !== entryId)].slice(
        0,
        MAX_HISTORY_TOMBSTONES,
      ),
    }));
  }, []);

  const clearListeningHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      listeningHistory: [],
      historyDeletedIds: [],
      historyClearedAt: new Date().toISOString(),
    }));
  }, []);

  const setPersonalizationEnabled = useCallback((enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      personalization: { ...prev.personalization, enabled },
    }));
  }, []);

  const dismissRecommendation = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      personalization: {
        ...prev.personalization,
        dismissedRecommendations: [
          id,
          ...prev.personalization.dismissedRecommendations.filter((item) => item !== id),
        ].slice(0, 100),
      },
    }));
  }, []);

  const restoreRecommendation = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      personalization: {
        ...prev.personalization,
        dismissedRecommendations: prev.personalization.dismissedRecommendations.filter(
          (item) => item !== id,
        ),
      },
    }));
  }, []);

  const resetTasteProfile = useCallback(() => {
    setState((prev) => ({
      ...prev,
      listeningHistory: [],
      historyDeletedIds: [],
      historyClearedAt: new Date().toISOString(),
      personalization: { ...prev.personalization, dismissedRecommendations: [] },
    }));
  }, []);

  const recordSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      recentSearches: [
        trimmed,
        ...prev.recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES),
    }));
  }, []);

  const clearSearches = useCallback(() => {
    setState((prev) => (prev.recentSearches.length === 0 ? prev : { ...prev, recentSearches: [] }));
  }, []);

  const importMusic = useCallback(async (): Promise<ImportResult> => {
    setIsImporting(true);
    try {
      const picked = await pickAudioFiles();
      if (picked.length === 0) return { added: 0, canceled: true, failed: [] };

      const records: ImportedTrackRecord[] = [];
      const failed: { name: string; reason: string }[] = [];

      for (const file of picked) {
        try {
          const metadata = parseAudioMetadata(file.bytes, file.name, file.mimeType);
          const format = metadata.format;
          const looksAudio = file.mimeType.startsWith('audio/') || format !== 'unknown';
          if (!looksAudio) {
            failed.push({ name: file.name, reason: 'Not an audio file' });
            continue;
          }

          const storageKey = `imp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
          const stored = await saveLocalAudio(storageKey, file.name, metadata.mimeType, file.bytes);
          const fallbackTitle = file.name
            .replace(/\.[^.]+$/, '')
            .replace(/[_-]+/g, ' ')
            .trim();
          const palette =
            IMPORT_PALETTES[(state.importedTracks.length + records.length) % IMPORT_PALETTES.length] ?? 'haze';

          records.push({
            storageKey,
            fileName: file.name,
            mimeType: metadata.mimeType,
            format,
            addedAt: new Date().toISOString(),
            track: {
              id: `imported-${storageKey}`,
              title: metadata.title ?? fallbackTitle ?? file.name,
              artistId: 'imported',
              artistName: metadata.artist ?? 'Unknown artist',
              albumId: `imported-${(metadata.album ?? 'singles').toLowerCase().replace(/\s+/g, '-')}`,
              albumTitle: metadata.album ?? 'Imported music',
              durationSec: metadata.durationSec,
              palette,
              imported: true,
              artworkUri: metadata.artworkDataUrl,
              audio: { uri: stored.uri, mimeType: metadata.mimeType, format },
            },
          });
        } catch (error) {
          failed.push({
            name: file.name,
            reason: error instanceof Error ? error.message : 'Could not read this file',
          });
        }
      }

      if (records.length > 0) {
        setState((prev) => ({ ...prev, importedTracks: [...records, ...prev.importedTracks] }));
      }
      return { added: records.length, canceled: false, failed };
    } finally {
      setIsImporting(false);
    }
  }, [state.importedTracks.length]);

  const updateImportedTrack = useCallback(
    (id: ID, patch: { title?: string; artistName?: string; albumTitle?: string }) => {
      setState((prev) => ({
        ...prev,
        importedTracks: prev.importedTracks.map((record) =>
          record.track.id === id
            ? {
                ...record,
                track: {
                  ...record.track,
                  title: patch.title?.trim() || record.track.title,
                  artistName: patch.artistName?.trim() || record.track.artistName,
                  albumTitle: patch.albumTitle?.trim() || record.track.albumTitle,
                },
              }
            : record,
        ),
      }));
    },
    [],
  );

  const removeImportedTrack = useCallback((id: ID) => {
    setState((prev) => {
      const record = prev.importedTracks.find((item) => item.track.id === id);
      if (record) void removeLocalAudio(record.storageKey);
      return {
        ...prev,
        importedTracks: prev.importedTracks.filter((item) => item.track.id !== id),
        favoriteTrackIds: prev.favoriteTrackIds.filter((trackId) => trackId !== id),
        recentTrackIds: prev.recentTrackIds.filter((trackId) => trackId !== id),
        playlists: prev.playlists.map((playlist) => ({
          ...playlist,
          trackIds: playlist.trackIds.filter((trackId) => trackId !== id),
        })),
      };
    });
  }, []);

  const createPlaylist = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const palette = CREATE_PALETTES[state.playlists.length % CREATE_PALETTES.length] ?? 'lavender';
      const playlist = makePlaylist({ name: trimmed, palette });
      setState((prev) => ({ ...prev, playlists: [playlist, ...prev.playlists] }));
      return playlist;
    },
    [state.playlists.length],
  );

  const renamePlaylist = useCallback((id: ID, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((playlist) =>
        playlist.id === id ? { ...playlist, name: trimmed } : playlist,
      ),
    }));
  }, []);

  const deletePlaylist = useCallback((id: ID) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.filter((playlist) => playlist.id !== id),
    }));
  }, []);

  const addTracksToPlaylist = useCallback((id: ID, trackIds: ID[]) => {
    if (trackIds.length === 0) return;
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((playlist) =>
        playlist.id === id ? addTracks(playlist, trackIds) : playlist,
      ),
    }));
  }, []);

  const removeTrackFromPlaylist = useCallback((id: ID, trackId: ID) => {
    setState((prev) => ({
      ...prev,
      playlists: prev.playlists.map((playlist) =>
        playlist.id === id ? removeTrack(playlist, trackId) : playlist,
      ),
    }));
  }, []);

  const setSort = useCallback((sort: LibrarySort) => {
    setState((prev) =>
      prev.preferences.sort === sort
        ? prev
        : { ...prev, preferences: { ...prev.preferences, sort } },
    );
  }, []);

  const setView = useCallback((view: LibraryView) => {
    setState((prev) =>
      prev.preferences.view === view
        ? prev
        : { ...prev, preferences: { ...prev.preferences, view } },
    );
  }, []);

  const cacheOnlineTracks = useCallback((tracks: Track[]) => {
    const incoming = tracks.filter((track) => track.provider && track.providerTrackId);
    if (incoming.length === 0) return;
    setState((prev) => ({
      ...prev,
      onlineTracks: mergeOnlineTracks(prev.onlineTracks, incoming),
    }));
  }, []);

  const toggleOnlineTrackSaved = useCallback((track: Track) => {
    if (!track.provider) return;
    setState((prev) => {
      const saved = prev.savedOnlineTrackIds.includes(track.id);
      return {
        ...prev,
        onlineTracks: mergeOnlineTracks(prev.onlineTracks, [track]),
        savedOnlineTrackIds: saved
          ? prev.savedOnlineTrackIds.filter((id) => id !== track.id)
          : [track.id, ...prev.savedOnlineTrackIds],
      };
    });
  }, []);

  const toggleOnlineAlbumSaved = useCallback((album: ProviderAlbum) => {
    setState((prev) => {
      const saved = prev.savedOnlineAlbums.some((item) => item.id === album.id);
      return {
        ...prev,
        savedOnlineAlbums: saved
          ? prev.savedOnlineAlbums.filter((item) => item.id !== album.id)
          : [album, ...prev.savedOnlineAlbums],
      };
    });
  }, []);

  const toggleOnlineArtistFollowed = useCallback((artist: ProviderArtist) => {
    setState((prev) => {
      const followed = prev.followedOnlineArtists.some((item) => item.id === artist.id);
      return {
        ...prev,
        followedOnlineArtists: followed
          ? prev.followedOnlineArtists.filter((item) => item.id !== artist.id)
          : [artist, ...prev.followedOnlineArtists],
      };
    });
  }, []);

  const toggleOnlinePlaylistSaved = useCallback((playlist: ProviderPlaylist) => {
    setState((prev) => {
      const saved = prev.savedOnlinePlaylists.some((item) => item.id === playlist.id);
      return {
        ...prev,
        savedOnlinePlaylists: saved
          ? prev.savedOnlinePlaylists.filter((item) => item.id !== playlist.id)
          : [playlist, ...prev.savedOnlinePlaylists],
      };
    });
  }, []);

  const applySyncedLibrary = useCallback((patch: SyncedLibraryPatch) => {
    setState((prev) => ({
      ...prev,
      favoriteTrackIds: patch.favoriteTrackIds ?? prev.favoriteTrackIds,
      recentTrackIds: patch.recentTrackIds ?? prev.recentTrackIds,
      playlists: patch.playlists ?? prev.playlists,
      preferences: patch.preferences ?? prev.preferences,
      cloudTracks: patch.cloudTracks ?? prev.cloudTracks,
      // The sync engine already merged local + remote history, including
      // tombstones and the clear cutoff; replacing is what lets an empty
      // remote result actually remove local rows.
      listeningHistory: patch.listeningHistory ?? prev.listeningHistory,
    }));
  }, []);

  const syncSnapshot = useMemo<LibrarySyncSnapshot>(
    () => ({
      favoriteTrackIds: state.favoriteTrackIds,
      recentTrackIds: state.recentTrackIds,
      playlists: state.playlists,
      preferences: state.preferences,
      imports: state.importedTracks,
      listeningHistory: state.listeningHistory,
      historyDeletedIds: state.historyDeletedIds,
      historyClearedAt: state.historyClearedAt,
      personalization: state.personalization,
    }),
    [
      state.favoriteTrackIds,
      state.recentTrackIds,
      state.playlists,
      state.preferences,
      state.importedTracks,
      state.listeningHistory,
      state.historyDeletedIds,
      state.historyClearedAt,
      state.personalization,
    ],
  );

  const playlists = useMemo(
    () => [...state.playlists, ...catalog.playlists],
    [catalog.playlists, state.playlists],
  );

  const savedOnlineTracks = useMemo(() => {
    const ids = new Set(state.savedOnlineTrackIds);
    return state.onlineTracks.filter((track) => ids.has(track.id));
  }, [state.onlineTracks, state.savedOnlineTrackIds]);

  // Imported files and saved online tracks join the catalog so browsing, search
  // and every selector see one track list. Online tracks never gain a local
  // file: they are resolved through their provider when played.
  const mergedCatalog = useMemo<MusicCatalog>(() => {
    const importedIds = new Set(state.importedTracks.map((record) => record.track.id));
    const remoteOnly = state.cloudTracks.filter((track) => !importedIds.has(track.id));
    if (
      state.importedTracks.length === 0 &&
      remoteOnly.length === 0 &&
      savedOnlineTracks.length === 0
    ) {
      return catalog;
    }
    return {
      ...catalog,
      tracks: [
        ...state.importedTracks.map((record) => record.track),
        ...remoteOnly,
        ...savedOnlineTracks,
        ...catalog.tracks,
      ],
    };
  }, [catalog, state.importedTracks, state.cloudTracks, savedOnlineTracks]);

  // Queue restoration and recents can reference provider metadata that is
  // cached but not explicitly saved.
  const resolveTrack = useCallback(
    (id: ID) =>
      selectors.trackById(mergedCatalog, id) ?? state.onlineTracks.find((track) => track.id === id),
    [mergedCatalog, state.onlineTracks],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      catalog: mergedCatalog,
      freshImports: state.importedTracks,
      importMusic,
      isImporting,
      updateImportedTrack,
      removeImportedTrack,
      allTracks: mergedCatalog.tracks,
      cloudTracks: state.cloudTracks,
      isLocallyAvailable: (track) => !track.imported || Boolean(track.audio?.uri),
      syncSnapshot,
      applySyncedLibrary,
      favoriteTrackIds: state.favoriteTrackIds,
      isFavorite: (trackId) => state.favoriteTrackIds.includes(trackId),
      toggleFavorite,
      playlists,
      userPlaylists: state.playlists,
      playlistById: (id) => selectors.playlistById(playlists, id),
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTracksToPlaylist,
      removeTrackFromPlaylist,
      recentTrackIds: state.recentTrackIds,
      recentTracks: selectors.tracksForIds(mergedCatalog, state.recentTrackIds),
      recordPlayed,
      listeningHistory: state.listeningHistory,
      recordListen,
      deleteHistoryEntry,
      clearListeningHistory,
      historyClearedAt: state.historyClearedAt,
      personalizationEnabled: state.personalization.enabled,
      setPersonalizationEnabled,
      dismissedRecommendations: state.personalization.dismissedRecommendations,
      dismissRecommendation,
      restoreRecommendation,
      resetTasteProfile,
      recentSearches: state.recentSearches,
      recordSearch,
      clearSearches,
      preferences: state.preferences,
      setSort,
      setView,
      cacheOnlineTracks,
      savedOnlineTracks,
      isSavedOnlineTrack: (id) => state.savedOnlineTrackIds.includes(id),
      toggleOnlineTrackSaved,
      savedOnlineAlbums: state.savedOnlineAlbums,
      isSavedOnlineAlbum: (id) => state.savedOnlineAlbums.some((album) => album.id === id),
      toggleOnlineAlbumSaved,
      followedOnlineArtists: state.followedOnlineArtists,
      isFollowingOnlineArtist: (id) =>
        state.followedOnlineArtists.some((artist) => artist.id === id),
      toggleOnlineArtistFollowed,
      savedOnlinePlaylists: state.savedOnlinePlaylists,
      isSavedOnlinePlaylist: (id) =>
        state.savedOnlinePlaylists.some((playlist) => playlist.id === id),
      toggleOnlinePlaylistSaved,
      albumById: (id) => selectors.albumById(catalog, id),
      artistById: (id) => selectors.artistById(catalog, id),
      // Imported files live only in the merged catalog, so every id lookup and
      // collection selector has to read from it (albums/artists stay demo-only).
      trackById: (id) => resolveTrack(id),
      tracksForAlbum: (albumId) => selectors.tracksForAlbum(mergedCatalog, albumId),
      tracksForArtist: (artistId) => selectors.tracksForArtist(mergedCatalog, artistId),
      tracksForPlaylist: (playlist) => selectors.tracksForPlaylist(mergedCatalog, playlist),
      tracksForIds: (ids) =>
        ids.map((id) => resolveTrack(id)).filter((track): track is Track => Boolean(track)),
    }),
    [
      mergedCatalog,
      playlists,
      importMusic,
      isImporting,
      updateImportedTrack,
      removeImportedTrack,
      state.favoriteTrackIds,
      state.importedTracks,
      state.cloudTracks,
      state.preferences,
      state.playlists,
      syncSnapshot,
      applySyncedLibrary,
      state.recentSearches,
      state.recentTrackIds,
      state.savedOnlineTrackIds,
      state.savedOnlineAlbums,
      state.followedOnlineArtists,
      state.savedOnlinePlaylists,
      state.listeningHistory,
      state.historyDeletedIds,
      state.historyClearedAt,
      state.personalization,
      savedOnlineTracks,
      resolveTrack,
      cacheOnlineTracks,
      recordListen,
      deleteHistoryEntry,
      clearListeningHistory,
      setPersonalizationEnabled,
      dismissRecommendation,
      restoreRecommendation,
      resetTasteProfile,
      toggleOnlineTrackSaved,
      toggleOnlineAlbumSaved,
      toggleOnlineArtistFollowed,
      toggleOnlinePlaylistSaved,
      addTracksToPlaylist,
      clearSearches,
      createPlaylist,
      deletePlaylist,
      recordPlayed,
      recordSearch,
      removeTrackFromPlaylist,
      renamePlaylist,
      setSort,
      setView,
      toggleFavorite,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

/** Read-only access to the catalog plus the listener's persisted library. */
export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used inside <LibraryProvider>.');
  }
  return context;
}
