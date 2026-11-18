import { MAX_HISTORY_ENTRIES, MAX_HISTORY_TOMBSTONES, type ListeningHistoryEntry } from '@lavender/personalization';
import { Platform } from 'react-native';
import type {
  AudioFormat,
  ID,
  Playlist,
  ProviderAlbum,
  ProviderArtist,
  ProviderPlaylist,
  Track,
} from '@lavender/shared';

const STORAGE_KEY = 'lavender.library';
const VERSION = 5;
const MAX_DISMISSED_RECOMMENDATIONS = 100;
/** Upper bound for provider metadata kept for offline browsing and queue restore. */
export const MAX_ONLINE_TRACKS = 80;

/**
 * A track the listener imported, plus the durable key of its stored audio.
 * The playable URI is resolved at runtime and deliberately not persisted.
 */
export interface ImportedTrackRecord {
  track: Track;
  storageKey: string;
  fileName: string;
  mimeType: string;
  format: AudioFormat;
  /** ISO date string. */
  addedAt: string;
}

/** Keep the recent lists short: they are a shortcut, not a history log. */
export const MAX_RECENT_TRACKS = 24;
export const MAX_RECENT_SEARCHES = 6;

export type LibrarySort = 'recent' | 'title' | 'artist';
export type LibraryView = 'grid' | 'list';

export interface LibraryPreferences {
  /** Ordering for library collections. */
  sort: LibrarySort;
  /** Grid or list presentation for albums, artists and playlists. */
  view: LibraryView;
}

export interface LibraryState {
  version: number;
  favoriteTrackIds: ID[];
  /** Playlists the listener created; curated demo playlists stay in the catalog. */
  playlists: Playlist[];
  /** Files imported from the device. */
  importedTracks: ImportedTrackRecord[];
  /**
   * Metadata for imported tracks that exist in the cloud but not on this
   * device. Never carries audio; they render as "not on this device".
   */
  cloudTracks: Track[];
  recentTrackIds: ID[];
  recentSearches: string[];
  preferences: LibraryPreferences;
  /** Provider track metadata seen on this device (no stream URLs persisted). */
  onlineTracks: Track[];
  /** Online tracks the listener explicitly saved to the unified library. */
  savedOnlineTrackIds: ID[];
  savedOnlineAlbums: ProviderAlbum[];
  followedOnlineArtists: ProviderArtist[];
  savedOnlinePlaylists: ProviderPlaylist[];
  /** Measured listening sessions; metadata only, never audio. */
  listeningHistory: ListeningHistoryEntry[];
  /** Locally deleted session ids awaiting (idempotent) cloud tombstoning. */
  historyDeletedIds: string[];
  /** Newest local clear; older remote history must not reappear. */
  historyClearedAt: string | null;
  personalization: {
    enabled: boolean;
    dismissedRecommendations: string[];
  };
}

export const initialLibraryState: LibraryState = {
  version: VERSION,
  favoriteTrackIds: [],
  playlists: [],
  importedTracks: [],
  cloudTracks: [],
  recentTrackIds: [],
  recentSearches: [],
  preferences: { sort: 'recent', view: 'grid' },
  onlineTracks: [],
  savedOnlineTrackIds: [],
  savedOnlineAlbums: [],
  followedOnlineArtists: [],
  savedOnlinePlaylists: [],
  listeningHistory: [],
  historyDeletedIds: [],
  historyClearedAt: null,
  personalization: { enabled: true, dismissedRecommendations: [] },
};

/**
 * A place to keep the listener's library. The provider only needs
 * `read`/`write`, so native storage (AsyncStorage, SQLite, preferences) can be
 * registered with `setLibraryStorage` without touching the provider.
 */
export interface LibraryStorage {
  read(): LibraryState | null;
  write(state: LibraryState): void;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isSort(value: unknown): value is LibrarySort {
  return value === 'recent' || value === 'title' || value === 'artist';
}

function isView(value: unknown): value is LibraryView {
  return value === 'grid' || value === 'list';
}

function sanitizePlaylist(value: unknown): Playlist | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Playlist>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null;
  if (!isStringArray(candidate.trackIds) || typeof candidate.palette !== 'string') return null;
  return {
    id: candidate.id,
    name: candidate.name,
    description: typeof candidate.description === 'string' ? candidate.description : undefined,
    trackIds: candidate.trackIds,
    palette: candidate.palette as Playlist['palette'],
    createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    curated: false,
  };
}

/** Defensive parse: stored data may be older, partial or hand-edited. */
function sanitizeImportedTrack(value: unknown): ImportedTrackRecord | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ImportedTrackRecord>;
  const track = candidate.track as Partial<Track> | undefined;
  if (!track || typeof track.id !== 'string' || typeof track.title !== 'string') return null;
  if (typeof candidate.storageKey !== 'string') return null;
  const audio = track.audio;
  return {
    track: {
      id: track.id,
      title: track.title,
      artistId: typeof track.artistId === 'string' ? track.artistId : 'imported',
      artistName: typeof track.artistName === 'string' ? track.artistName : 'Unknown artist',
      albumId: typeof track.albumId === 'string' ? track.albumId : 'imported',
      albumTitle: typeof track.albumTitle === 'string' ? track.albumTitle : 'Imported music',
      durationSec: typeof track.durationSec === 'number' ? track.durationSec : 0,
      palette: (track.palette ?? 'haze') as Track['palette'],
      imported: true,
      artworkUri: typeof track.artworkUri === 'string' ? track.artworkUri : undefined,
      audio: audio && typeof audio.uri === 'string'
        ? { uri: audio.uri, mimeType: audio.mimeType, format: audio.format }
        : undefined,
    },
    storageKey: candidate.storageKey,
    fileName: typeof candidate.fileName === 'string' ? candidate.fileName : 'imported',
    mimeType: typeof candidate.mimeType === 'string' ? candidate.mimeType : 'audio/*',
    format: (candidate.format ?? 'unknown') as AudioFormat,
    addedAt: typeof candidate.addedAt === 'string' ? candidate.addedAt : new Date().toISOString(),
  };
}

function sanitizeCloudTrack(value: unknown): Track | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Track>;
  if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return null;
  return {
    id: candidate.id,
    title: candidate.title,
    artistId: typeof candidate.artistId === 'string' ? candidate.artistId : 'imported',
    artistName: typeof candidate.artistName === 'string' ? candidate.artistName : 'Unknown artist',
    albumId: typeof candidate.albumId === 'string' ? candidate.albumId : 'imported',
    albumTitle: typeof candidate.albumTitle === 'string' ? candidate.albumTitle : 'Imported music',
    durationSec: typeof candidate.durationSec === 'number' ? candidate.durationSec : 0,
    palette: (candidate.palette ?? 'haze') as Track['palette'],
    imported: true,
    artworkUri: typeof candidate.artworkUri === 'string' ? candidate.artworkUri : undefined,
    // Audio is deliberately dropped: a cloud metadata row has no local file.
    audio: undefined,
  };
}

function sanitizeOnlineTrack(value: unknown): Track | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Track>;
  if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return null;
  if (typeof candidate.provider !== 'string' || typeof candidate.providerTrackId !== 'string') {
    return null;
  }
  return {
    id: candidate.id,
    title: candidate.title,
    artistId: typeof candidate.artistId === 'string' ? candidate.artistId : 'online',
    artistName: typeof candidate.artistName === 'string' ? candidate.artistName : 'Online artist',
    albumId: typeof candidate.albumId === 'string' ? candidate.albumId : 'online',
    albumTitle: typeof candidate.albumTitle === 'string' ? candidate.albumTitle : 'Audius',
    durationSec: typeof candidate.durationSec === 'number' ? candidate.durationSec : 0,
    palette: (candidate.palette ?? 'haze') as Track['palette'],
    artworkUri: typeof candidate.artworkUri === 'string' ? candidate.artworkUri : undefined,
    provider: candidate.provider,
    providerTrackId: candidate.providerTrackId,
    externalUrl: typeof candidate.externalUrl === 'string' ? candidate.externalUrl : undefined,
    artistHandle: typeof candidate.artistHandle === 'string' ? candidate.artistHandle : undefined,
    streamable: typeof candidate.streamable === 'boolean' ? candidate.streamable : undefined,
    restriction: candidate.restriction,
    license: typeof candidate.license === 'string' ? candidate.license : undefined,
    // Stream URLs are short-lived and never persisted.
    audio: undefined,
  };
}

function sanitizeProviderAlbum(value: unknown): ProviderAlbum | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProviderAlbum>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.providerAlbumId !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return null;
  }
  return {
    id: candidate.id,
    provider: typeof candidate.provider === 'string' ? candidate.provider : 'audius',
    providerAlbumId: candidate.providerAlbumId,
    title: candidate.title,
    artistId: typeof candidate.artistId === 'string' ? candidate.artistId : 'online',
    artistName: typeof candidate.artistName === 'string' ? candidate.artistName : 'Online artist',
    year: typeof candidate.year === 'number' ? candidate.year : undefined,
    trackCount: typeof candidate.trackCount === 'number' ? candidate.trackCount : 0,
    palette: (candidate.palette ?? 'haze') as ProviderAlbum['palette'],
    artworkUri: typeof candidate.artworkUri === 'string' ? candidate.artworkUri : undefined,
    externalUrl: typeof candidate.externalUrl === 'string' ? candidate.externalUrl : undefined,
  };
}

function sanitizeProviderArtist(value: unknown): ProviderArtist | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProviderArtist>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.providerArtistId !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }
  return {
    id: candidate.id,
    provider: typeof candidate.provider === 'string' ? candidate.provider : 'audius',
    providerArtistId: candidate.providerArtistId,
    name: candidate.name,
    handle: typeof candidate.handle === 'string' ? candidate.handle : undefined,
    palette: (candidate.palette ?? 'haze') as ProviderArtist['palette'],
    artworkUri: typeof candidate.artworkUri === 'string' ? candidate.artworkUri : undefined,
    externalUrl: typeof candidate.externalUrl === 'string' ? candidate.externalUrl : undefined,
  };
}

function sanitizeHistoryEntry(value: unknown): ListeningHistoryEntry | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ListeningHistoryEntry>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.trackId !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.artistName !== 'string' ||
    typeof candidate.playedAt !== 'string'
  ) {
    return null;
  }
  const playedAt = Date.parse(candidate.playedAt);
  if (Number.isNaN(playedAt)) return null;
  const durationSec = typeof candidate.durationSec === 'number' ? Math.max(0, candidate.durationSec) : 0;
  const listenedSec =
    typeof candidate.listenedSec === 'number'
      ? Math.max(0, Math.min(durationSec > 0 ? durationSec : candidate.listenedSec, candidate.listenedSec))
      : 0;
  return {
    id: candidate.id,
    trackId: candidate.trackId,
    title: candidate.title,
    artistId: typeof candidate.artistId === 'string' ? candidate.artistId : undefined,
    artistName: candidate.artistName,
    albumId: typeof candidate.albumId === 'string' ? candidate.albumId : undefined,
    albumTitle: typeof candidate.albumTitle === 'string' ? candidate.albumTitle : 'Unknown album',
    durationSec,
    listenedSec,
    playedAt: candidate.playedAt,
    source: candidate.source === 'online' ? 'online' : 'local',
    provider: typeof candidate.provider === 'string' ? candidate.provider : undefined,
    providerTrackId:
      typeof candidate.providerTrackId === 'string' ? candidate.providerTrackId : undefined,
    genre: typeof candidate.genre === 'string' ? candidate.genre : undefined,
    mood: typeof candidate.mood === 'string' ? candidate.mood : undefined,
    palette: (candidate.palette ?? 'haze') as ListeningHistoryEntry['palette'],
    artworkUri:
      typeof candidate.artworkUri === 'string' && /^https?:\/\//i.test(candidate.artworkUri)
        ? candidate.artworkUri
        : undefined,
    completed: candidate.completed === true,
  };
}

function sanitizeProviderPlaylist(value: unknown): ProviderPlaylist | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ProviderPlaylist>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.providerPlaylistId !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null;
  }
  return {
    id: candidate.id,
    provider: typeof candidate.provider === 'string' ? candidate.provider : 'audius',
    providerPlaylistId: candidate.providerPlaylistId,
    name: candidate.name,
    creatorName: typeof candidate.creatorName === 'string' ? candidate.creatorName : 'Audius',
    trackCount: typeof candidate.trackCount === 'number' ? candidate.trackCount : 0,
    palette: (candidate.palette ?? 'haze') as ProviderPlaylist['palette'],
    artworkUri: typeof candidate.artworkUri === 'string' ? candidate.artworkUri : undefined,
    externalUrl: typeof candidate.externalUrl === 'string' ? candidate.externalUrl : undefined,
    isAlbum: candidate.isAlbum === true ? true : undefined,
  };
}

function sanitize(value: unknown): LibraryState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<LibraryState>;

  return {
    version: VERSION,
    favoriteTrackIds: isStringArray(candidate.favoriteTrackIds) ? candidate.favoriteTrackIds : [],
    playlists: Array.isArray(candidate.playlists)
      ? candidate.playlists
          .map(sanitizePlaylist)
          .filter((playlist): playlist is Playlist => Boolean(playlist))
      : [],
    importedTracks: Array.isArray(candidate.importedTracks)
      ? candidate.importedTracks
          .map(sanitizeImportedTrack)
          .filter((record): record is ImportedTrackRecord => Boolean(record))
      : [],
    cloudTracks: Array.isArray(candidate.cloudTracks)
      ? candidate.cloudTracks
          .map(sanitizeCloudTrack)
          .filter((track): track is Track => Boolean(track))
      : [],
    recentTrackIds: isStringArray(candidate.recentTrackIds)
      ? candidate.recentTrackIds.slice(0, MAX_RECENT_TRACKS)
      : [],
    recentSearches: isStringArray(candidate.recentSearches)
      ? candidate.recentSearches.slice(0, MAX_RECENT_SEARCHES)
      : [],
    preferences: {
      sort: isSort(candidate.preferences?.sort) ? candidate.preferences.sort : 'recent',
      view: isView(candidate.preferences?.view) ? candidate.preferences.view : 'grid',
    },
    onlineTracks: Array.isArray(candidate.onlineTracks)
      ? candidate.onlineTracks
          .map(sanitizeOnlineTrack)
          .filter((track): track is Track => Boolean(track))
          .slice(-MAX_ONLINE_TRACKS)
      : [],
    savedOnlineTrackIds: isStringArray(candidate.savedOnlineTrackIds)
      ? candidate.savedOnlineTrackIds
      : [],
    savedOnlineAlbums: Array.isArray(candidate.savedOnlineAlbums)
      ? candidate.savedOnlineAlbums
          .map(sanitizeProviderAlbum)
          .filter((album): album is ProviderAlbum => Boolean(album))
      : [],
    followedOnlineArtists: Array.isArray(candidate.followedOnlineArtists)
      ? candidate.followedOnlineArtists
          .map(sanitizeProviderArtist)
          .filter((artist): artist is ProviderArtist => Boolean(artist))
      : [],
    savedOnlinePlaylists: Array.isArray(candidate.savedOnlinePlaylists)
      ? candidate.savedOnlinePlaylists
          .map(sanitizeProviderPlaylist)
          .filter((playlist): playlist is ProviderPlaylist => Boolean(playlist))
      : [],
    listeningHistory: Array.isArray(candidate.listeningHistory)
      ? candidate.listeningHistory
          .map(sanitizeHistoryEntry)
          .filter((entry): entry is ListeningHistoryEntry => Boolean(entry))
          .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
          .slice(0, MAX_HISTORY_ENTRIES)
      : [],
    historyDeletedIds: isStringArray(candidate.historyDeletedIds)
      ? candidate.historyDeletedIds.slice(0, MAX_HISTORY_TOMBSTONES)
      : [],
    historyClearedAt:
      typeof candidate.historyClearedAt === 'string' && !Number.isNaN(Date.parse(candidate.historyClearedAt))
        ? candidate.historyClearedAt
        : null,
    personalization: {
      enabled: candidate.personalization?.enabled !== false,
      dismissedRecommendations: isStringArray(candidate.personalization?.dismissedRecommendations)
        ? [...new Set(candidate.personalization.dismissedRecommendations)].slice(
            0,
            MAX_DISMISSED_RECOMMENDATIONS,
          )
        : [],
    },
  };
}

/** Web adapter: `localStorage`, so the library survives a reload. */
const webStorage: LibraryStorage = {
  read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? sanitize(JSON.parse(raw)) : null;
    } catch {
      // Blocked storage or corrupted JSON: start from the empty library.
      return null;
    }
  },
  write(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Persisting is best-effort; the in-memory library still applies.
    }
  },
};

let registered: LibraryStorage | null = null;

/** Register a device-local adapter for native platforms once storage exists. */
export function setLibraryStorage(storage: LibraryStorage | null): void {
  registered = storage;
}

function activeStorage(): LibraryStorage | null {
  if (registered) return registered;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return webStorage;
  return null;
}

/** The persisted library, or `null` when nothing valid is stored. */
export function readStoredLibrary(): LibraryState | null {
  return activeStorage()?.read() ?? null;
}

/** Persist the library; a no-op where no storage adapter is available. */
export function writeStoredLibrary(state: LibraryState): void {
  activeStorage()?.write(state);
}
