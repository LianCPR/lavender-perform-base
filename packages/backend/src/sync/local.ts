import type { ListeningHistoryEntry } from '@lavender/personalization';
import type { AudioFormat, ID, Playlist, Track } from '@lavender/shared';

/** Structural view of the device-local library; avoids coupling to the provider. */
export interface LocalImport {
  track: Track;
  fileName: string;
  mimeType: string;
  format: AudioFormat;
  addedAt: string;
}

export interface LocalPreferences {
  sort: 'recent' | 'title' | 'artist';
  view: 'grid' | 'list';
}

export interface LocalLibrarySlice {
  favoriteTrackIds: ID[];
  recentTrackIds: ID[];
  playlists: Playlist[];
  preferences: LocalPreferences;
  imports: LocalImport[];
  listeningHistory: ListeningHistoryEntry[];
  historyDeletedIds: string[];
  historyClearedAt: string | null;
}

/** What the sync engine may write back into the local library. */
export interface SyncedLibraryPatch {
  favoriteTrackIds?: ID[];
  recentTrackIds?: ID[];
  playlists?: Playlist[];
  preferences?: LocalPreferences;
  /** Metadata-only tracks known in the cloud but not on this device. */
  cloudTracks?: Track[];
  listeningHistory?: ListeningHistoryEntry[];
}

export interface PlaybackSlice {
  currentTrackId: ID | null;
  queueIds: ID[];
  positionSec: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
}

export function hasLocalContent(slice: LocalLibrarySlice): boolean {
  return (
    slice.favoriteTrackIds.length > 0 ||
    slice.recentTrackIds.length > 0 ||
    slice.playlists.length > 0 ||
    slice.imports.length > 0 ||
    slice.listeningHistory.length > 0
  );
}
