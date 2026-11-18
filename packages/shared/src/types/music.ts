import type { ArtworkPalette } from './artwork';

export type ID = string;

export interface Artist {
  id: ID;
  name: string;
  palette: ArtworkPalette;
}

export interface Album {
  id: ID;
  title: string;
  artistId: ID;
  artistName: string;
  year: number;
  trackCount: number;
  palette: ArtworkPalette;
  /** Primary genre, used for genre browsing and search. */
  genreId?: ID;
}

/** Container format of an imported audio file. */
export type AudioFormat = 'mp3' | 'm4a' | 'aac' | 'wav' | 'flac' | 'unknown';

/**
 * The playable source of a track. Catalog demo tracks have no audio; tracks the
 * listener imports always do.
 */
export interface TrackAudio {
  /** https:, file:, blob: or data: URI, resolved at runtime. */
  uri: string;
  mimeType?: string;
  format?: AudioFormat;
}

export interface Track {
  id: ID;
  title: string;
  artistId: ID;
  artistName: string;
  albumId: ID;
  albumTitle: string;
  durationSec: number;
  palette: ArtworkPalette;
  favorite?: boolean;
  /** Playable audio. Missing for the metadata-only demo catalog. */
  audio?: TrackAudio;
  /** Embedded or imported cover art (data URL or file URI). */
  artworkUri?: string;
  /** True for files imported from the device. */
  imported?: boolean;
  /** Set for tracks that come from an authorized online provider. */
  provider?: string;
  /** Provider-native track id; `id` is namespaced with the provider. */
  providerTrackId?: string;
  /** Public provider page, used for attribution and "open original". */
  externalUrl?: string;
  /** Provider artist handle, when the provider exposes one. */
  artistHandle?: string;
  /** False when the provider says this track has no authorized stream. */
  streamable?: boolean;
  /** Why a provider track cannot be played, when known. */
  restriction?: 'subscription' | 'gated' | 'region' | 'unavailable';
  /** License string reported by the provider, for attribution. */
  license?: string;
  /** Provider or catalog genre, used only for personalization. */
  genre?: string;
  /** Provider or catalog mood, used only for personalization. */
  mood?: string;
}

/** A provider album. Online albums are references; their tracks load on demand. */
export interface ProviderAlbum {
  id: ID;
  provider: string;
  providerAlbumId: string;
  title: string;
  artistId: ID;
  artistName: string;
  year?: number;
  trackCount: number;
  palette: ArtworkPalette;
  artworkUri?: string;
  externalUrl?: string;
}

export interface ProviderArtist {
  id: ID;
  provider: string;
  providerArtistId: string;
  name: string;
  handle?: string;
  palette: ArtworkPalette;
  artworkUri?: string;
  externalUrl?: string;
}

export interface ProviderPlaylist {
  id: ID;
  provider: string;
  providerPlaylistId: string;
  name: string;
  creatorName: string;
  trackCount: number;
  palette: ArtworkPalette;
  artworkUri?: string;
  externalUrl?: string;
  isAlbum?: boolean;
}

/** Identifies where a playable source came from, for UI and diagnostics. */
export interface PlaybackOrigin {
  provider: string;
  providerTrackId: string;
  externalUrl?: string;
}

export interface Playlist {
  id: ID;
  name: string;
  description?: string;
  trackIds: ID[];
  palette: ArtworkPalette;
  /** ISO date string. */
  createdAt: string;
  /** Curated by the app rather than created by the listener. */
  curated?: boolean;
}

export interface Genre {
  id: ID;
  name: string;
  palette: ArtworkPalette;
}

/** A small labeled collection used by the Home and Browse screens. */
export interface Collection {
  id: ID;
  title: string;
  subtitle: string;
  palette: ArtworkPalette;
  /** Tracks queued when a demo listening collection is selected. */
  trackIds?: ID[];
}

/**
 * A listening context (Focus, Workout, Night Drive…). Moods are curated
 * collections of catalog tracks rather than a separate media type.
 */
export interface Mood {
  id: ID;
  name: string;
  description?: string;
  palette: ArtworkPalette;
  trackIds: ID[];
}
