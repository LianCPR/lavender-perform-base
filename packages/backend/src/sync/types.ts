import type { ListeningHistoryEntry } from '@lavender/personalization';
import type { AudioFormat, ID, Playlist } from '@lavender/shared';

export type SyncDirection = 'local' | 'remote' | 'none';

export interface PlaylistStamp {
  updatedAt: string;
  deletedAt: string | null;
}

export interface SyncSections {
  favorites: string;
  recents: string;
  preferences: string;
}

/** Device-local bookkeeping for last-write-wins sync. Never uploaded as-is. */
export interface SyncMeta {
  version: 1;
  userId: string | null;
  migratedAt: string | null;
  sections: SyncSections;
  playlists: Record<ID, PlaylistStamp>;
  /** Imported tracks deleted on this device, awaiting their cloud cleanup. */
  removedImports: Record<ID, string>;
  playback: string;
  lastSyncedAt: string | null;
}

export interface RemoteFavorite {
  trackKey: ID;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RemoteRecent {
  trackKey: ID;
  playedAt: string;
  updatedAt: string;
}

export interface RemotePreferences {
  sort: 'recent' | 'title' | 'artist';
  view: 'grid' | 'list';
  themeMode: 'system' | 'light' | 'dark';
  updatedAt: string;
}

export interface RemotePlaylist {
  id: ID;
  name: string;
  description: string | null;
  palette: Playlist['palette'];
  trackIds: ID[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RemotePlayback {
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  lastTrackKey: string | null;
  positionSec: number;
  updatedAt: string;
}

/** Imported-file metadata available in the cloud, without the file itself. */
export interface CloudTrack {
  key: ID;
  title: string;
  artistName: string;
  albumTitle: string;
  durationSec: number;
  palette: string;
  format: AudioFormat | null;
  fileName: string | null;
  addedAt: string | null;
}

export interface RemoteListeningEntry extends ListeningHistoryEntry {
  deletedAt: string | null;
  updatedAt: string;
}

export interface RemoteSnapshot {
  favorites: RemoteFavorite[];
  recents: RemoteRecent[];
  listeningHistory: RemoteListeningEntry[];
  preferences: RemotePreferences | null;
  playlists: RemotePlaylist[];
  cloudTracks: CloudTrack[];
  playback: RemotePlayback | null;
}

export interface LocalPlaylistChange {
  /** Playlist ids removed on this device, with the removal timestamp. */
  deleted: Record<ID, string>;
}

export interface MergedPlaylists {
  playlists: Playlist[];
  stamps: Record<ID, PlaylistStamp>;
  push: Playlist[];
  remove: ID[];
  direction: SyncDirection;
}

export interface MergedValue<T> {
  value: T;
  updatedAt: string;
  direction: SyncDirection;
}

export type SyncStatus =
  | 'disabled'
  | 'signed-out'
  | 'idle'
  | 'syncing'
  | 'offline'
  | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  /** Local changes waiting for the next push. */
  pending: boolean;
  migrated: boolean;
  cloudTrackCount: number;
}

export const EPOCH = '1970-01-01T00:00:00.000Z';

export function createSyncMeta(userId: string | null): SyncMeta {
  return {
    version: 1,
    userId,
    migratedAt: null,
    sections: { favorites: EPOCH, recents: EPOCH, preferences: EPOCH },
    playlists: {},
    removedImports: {},
    playback: EPOCH,
    lastSyncedAt: null,
  };
}
