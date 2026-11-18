import type { ArtworkPalette, ID, Playlist, Track } from '@lavender/shared';

export type ListeningSource = 'local' | 'online';

/**
 * One completed listening session, stored as metadata only.
 *
 * Local audio is never uploaded and is not part of this record. `trackId`
 * points at the same track the player used, so the library can re-resolve a
 * playable file or an authorized provider stream later.
 */
export interface ListeningHistoryEntry {
  id: ID;
  trackId: ID;
  title: string;
  artistId?: string;
  artistName: string;
  albumId?: string;
  albumTitle: string;
  durationSec: number;
  /** Measured playback time, excluding pauses and seeks. */
  listenedSec: number;
  /** ISO timestamp for when the session started. */
  playedAt: string;
  source: ListeningSource;
  provider?: string;
  providerTrackId?: string;
  genre?: string;
  mood?: string;
  palette: ArtworkPalette;
  /** Remote provider artwork URL only; local data/blob URIs are not stored. */
  artworkUri?: string;
  completed: boolean;
}

export interface TasteArtist {
  artistId?: string;
  name: string;
  plays: number;
  listenedSec: number;
  lastPlayedAt: string;
}

export interface TasteGenre {
  name: string;
  plays: number;
  listenedSec: number;
  sharePct: number;
}

export interface TasteMood {
  name: string;
  plays: number;
  listenedSec: number;
}

export interface TasteTrack {
  trackId: ID;
  title: string;
  artistName: string;
  plays: number;
  listenedSec: number;
  lastPlayedAt: string;
}

export interface TastePlaylist {
  id: ID;
  name: string;
  plays: number;
}

export interface TasteTrend {
  /** Recent seven days compared with the previous seven days. */
  direction: 'rising' | 'steady' | 'cooling';
  recentPlays: number;
  previousPlays: number;
}

export interface TasteProfile {
  hasHistory: boolean;
  totalPlays: number;
  totalListenedSec: number;
  distinctArtists: number;
  distinctGenres: number;
  favoriteCount: number;
  artists: TasteArtist[];
  genres: TasteGenre[];
  moods: TasteMood[];
  tracks: TasteTrack[];
  playlists: TastePlaylist[];
  trend: TasteTrend;
  lastPlayedAt: string | null;
}

export interface RecommendationSection {
  id: string;
  title: string;
  subtitle: string;
  tracks: Track[];
}

export interface DailyMix {
  id: string;
  title: string;
  subtitle: string;
  palette: ArtworkPalette;
  tracks: Track[];
}

export interface RecommendedPlaylist {
  playlist: Playlist;
  reason: string;
}

export interface RecommendationModel {
  /** True only when real listening history exists. */
  personalized: boolean;
  sections: RecommendationSection[];
  dailyMixes: DailyMix[];
  playlists: RecommendedPlaylist[];
}

export interface RecommendationCatalog {
  tracks: Track[];
  albums: { id: ID; genreId?: ID; artistId?: string }[];
  artists: { id: ID; name: string }[];
  playlists: Playlist[];
  genres: { id: ID; name: string; palette: ArtworkPalette }[];
  moods?: { id: ID; name: string; trackIds: ID[] }[];
}
