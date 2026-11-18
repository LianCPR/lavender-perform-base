import type {
  AudioFormat,
  ProviderAlbum,
  ProviderArtist,
  ProviderPlaylist,
  Track,
} from '@lavender/shared';

import type { ProviderError } from './errors.ts';

export interface ProviderSearchCapabilities {
  tracks: boolean;
  albums: boolean;
  artists: boolean;
  playlists: boolean;
}

export interface ProviderMetadataCapabilities {
  track: boolean;
  album: boolean;
  artist: boolean;
  playlist: boolean;
}

export interface ProviderCapabilities {
  search: ProviderSearchCapabilities;
  metadata: ProviderMetadataCapabilities;
  artwork: boolean;
  /** `stream` = full authorized playback, `preview` = short clips only. */
  playback: 'stream' | 'preview' | 'none';
  /** Provider exposes discovery/trending content for the Home screen. */
  home: boolean;
  /** Saving to an account at the provider (requires user auth), not local save. */
  personalization: {
    saveToProvider: boolean;
    userLibrary: boolean;
  };
  authentication: 'none' | 'api_key' | 'oauth_pkce';
  attribution: {
    required: boolean;
    label: string;
    url: string;
  };
}

export interface ProviderSearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface ProviderLookupOptions {
  signal?: AbortSignal;
}

export interface ProviderHomeSection {
  id: string;
  title: string;
  subtitle?: string;
  tracks: Track[];
  playlists: ProviderPlaylist[];
}

export interface ProviderPlaylistDetail {
  playlist: ProviderPlaylist;
  tracks: Track[];
}

export interface ProviderAlbumDetail {
  album: ProviderAlbum;
  tracks: Track[];
}

export interface ProviderArtistDetail {
  artist: ProviderArtist;
  tracks: Track[];
}

export interface ProviderPlaybackRequest {
  track: Track;
  signal?: AbortSignal;
}

export interface ProviderPlaybackSource {
  uri: string;
  mimeType?: string;
  format?: AudioFormat;
  providerTrackId: string;
  externalUrl?: string;
}

/**
 * The common surface for authorized online catalogs.
 *
 * Methods are optional because not every provider supports every capability;
 * `capabilities` is the single source of truth the UI reads before exposing a
 * feature. Provider-specific code never leaks outside this package.
 */
export interface MusicProvider {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  capabilities: ProviderCapabilities;

  searchTracks?(request: ProviderSearchRequest): Promise<Track[]>;
  searchAlbums?(request: ProviderSearchRequest): Promise<ProviderAlbum[]>;
  searchArtists?(request: ProviderSearchRequest): Promise<ProviderArtist[]>;
  searchPlaylists?(request: ProviderSearchRequest): Promise<ProviderPlaylist[]>;

  getTrack?(providerTrackId: string, options?: ProviderLookupOptions): Promise<Track | null>;
  getAlbum?(providerAlbumId: string, options?: ProviderLookupOptions): Promise<ProviderAlbumDetail>;
  getArtist?(
    providerArtistId: string,
    options?: ProviderLookupOptions,
  ): Promise<ProviderArtistDetail>;
  getPlaylist?(
    providerPlaylistId: string,
    options?: ProviderLookupOptions,
  ): Promise<ProviderPlaylistDetail>;

  getHome?(options?: ProviderLookupOptions): Promise<ProviderHomeSection[]>;
  resolvePlayback?(request: ProviderPlaybackRequest): Promise<ProviderPlaybackSource>;
}

export interface ProviderSearchResults {
  tracks: Track[];
  albums: ProviderAlbum[];
  artists: ProviderArtist[];
  playlists: ProviderPlaylist[];
  /** Per-category failures; a partial success still returns data. */
  errors: ProviderError[];
}
