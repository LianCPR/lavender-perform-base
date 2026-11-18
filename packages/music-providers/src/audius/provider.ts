import { ProviderError } from '../errors.ts';
import type {
  MusicProvider,
  ProviderCapabilities,
  ProviderPlaybackRequest,
  ProviderPlaybackSource,
  ProviderSearchRequest,
} from '../types.ts';

import {
  AUDIUS_DOCS_URL,
  fetchAudiusPlaylist,
  fetchAudiusPlaylistSearch,
  fetchAudiusPlaylistTracks,
  fetchAudiusTrack,
  fetchAudiusTracks,
  fetchAudiusTrendingPlaylists,
  fetchAudiusTrendingTracks,
  fetchAudiusUser,
  fetchAudiusUserTracks,
  fetchAudiusUsers,
  getAudiusBaseUrl,
  isAudiusEnabled,
} from './client.ts';
import {
  AUDIUS_PROVIDER_ID,
  audiusFormat,
  audiusStreamUrl,
  mapAudiusArtist,
  mapAudiusPlaylist,
  mapAudiusTrack,
  nativeId,
  paletteForId,
} from './map.ts';

const capabilities: ProviderCapabilities = {
  search: { tracks: true, albums: true, artists: true, playlists: true },
  metadata: { track: true, album: true, artist: true, playlist: true },
  artwork: true,
  playback: 'stream',
  home: true,
  personalization: { saveToProvider: false, userLibrary: false },
  authentication: 'none',
  attribution: { required: true, label: 'Audius', url: 'https://audius.co' },
};

function restrictedMessage(track: { restriction?: string }): string {
  switch (track.restriction) {
    case 'subscription':
      return 'This track needs an Audius subscription. Lavender will not bypass it.';
    case 'gated':
      return 'The artist restricted streaming of this track on Audius.';
    case 'region':
      return 'This track is not available in your region according to Audius.';
    default:
      return 'Audius does not offer an authorized stream for this track.';
  }
}

/**
 * Audius: an open, authorized music catalog.
 *
 * Read endpoints and the stream endpoint work without credentials, which is why
 * this is the provider enabled in this phase. Saving to the listener's Audius
 * account would require OAuth and is deliberately not implemented.
 */
export const audiusProvider: MusicProvider = {
  id: AUDIUS_PROVIDER_ID,
  name: 'Audius',
  description: 'Open music catalog with authorized streaming, operated on the Open Audio Protocol.',
  docsUrl: AUDIUS_DOCS_URL,
  capabilities,

  async searchTracks(request: ProviderSearchRequest) {
    const raw = await fetchAudiusTracks(request.query, {
      limit: request.limit,
      offset: request.offset,
      signal: request.signal,
    });
    return raw.map(mapAudiusTrack);
  },

  async searchAlbums(request: ProviderSearchRequest) {
    const { albums } = await fetchAudiusPlaylistSearch(request.query, {
      limit: Math.min(request.limit ?? 8, 20),
      offset: request.offset,
      signal: request.signal,
    });
    return albums;
  },

  async searchArtists(request: ProviderSearchRequest) {
    const raw = await fetchAudiusUsers(request.query, {
      limit: Math.min(request.limit ?? 8, 20),
      offset: request.offset,
      signal: request.signal,
    });
    return raw.map(mapAudiusArtist);
  },

  async searchPlaylists(request: ProviderSearchRequest) {
    const { playlists } = await fetchAudiusPlaylistSearch(request.query, {
      limit: request.limit,
      offset: request.offset,
      signal: request.signal,
    });
    return playlists;
  },

  async getTrack(providerTrackId: string, options) {
    const raw = await fetchAudiusTrack(nativeId(providerTrackId), options?.signal);
    return mapAudiusTrack(raw);
  },

  async getAlbum(providerAlbumId: string, options) {
    const raw = await fetchAudiusPlaylist(nativeId(providerAlbumId), options?.signal);
    const rawTracks = await fetchAudiusPlaylistTracks(raw.id, {
      limit: 100,
      signal: options?.signal,
    });
    const mapped = mapAudiusPlaylist(raw);
    return {
      album: {
        id: mapped.id,
        provider: mapped.provider,
        providerAlbumId: mapped.providerPlaylistId,
        title: mapped.name,
        artistId: `${AUDIUS_PROVIDER_ID}:artist:${raw.user?.id ?? 'unknown'}`,
        artistName: mapped.creatorName,
        year: raw.release_date ? Number(raw.release_date.slice(0, 4)) : undefined,
        trackCount: mapped.trackCount,
        palette: mapped.palette,
        artworkUri: mapped.artworkUri,
        externalUrl: mapped.externalUrl,
      },
      tracks: rawTracks.map((track) =>
        mapAudiusTrack({ ...track, user: track.user ?? raw.user ?? null }),
      ),
    };
  },

  async getArtist(providerArtistId: string, options) {
    const user = await fetchAudiusUser(nativeId(providerArtistId), options?.signal);
    const tracks = await fetchAudiusUserTracks(user.id, { limit: 20, signal: options?.signal });
    return {
      artist: mapAudiusArtist(user),
      tracks: tracks.map((track) => mapAudiusTrack({ ...track, user: track.user ?? user })),
    };
  },

  async getPlaylist(providerPlaylistId: string, options) {
    const raw = await fetchAudiusPlaylist(nativeId(providerPlaylistId), options?.signal);
    const rawTracks = await fetchAudiusPlaylistTracks(raw.id, {
      limit: 100,
      signal: options?.signal,
    });
    return {
      playlist: mapAudiusPlaylist(raw),
      tracks: rawTracks.map((track) =>
        mapAudiusTrack({ ...track, user: track.user ?? raw.user ?? null }),
      ),
    };
  },

  async getHome(options) {
    const [tracksResult, playlistsResult] = await Promise.allSettled([
      fetchAudiusTrendingTracks({ limit: 12, signal: options?.signal }),
      fetchAudiusTrendingPlaylists({ limit: 6, signal: options?.signal }),
    ]);

    if (tracksResult.status === 'rejected' && playlistsResult.status === 'rejected') {
      throw tracksResult.reason;
    }

    const sections = [];
    if (tracksResult.status === 'fulfilled') {
      sections.push({
        id: 'audius-trending',
        title: 'Trending on Audius',
        subtitle: 'Open catalog picks, updated weekly',
        tracks: tracksResult.value.map(mapAudiusTrack),
        playlists: [],
      });
    }
    if (playlistsResult.status === 'fulfilled') {
      sections.push({
        id: 'audius-playlists',
        title: 'Audius playlists',
        subtitle: 'Community collections from the open catalog',
        tracks: [],
        playlists: playlistsResult.value.playlists,
      });
    }
    return sections;
  },

  async resolvePlayback({ track, signal }: ProviderPlaybackRequest): Promise<ProviderPlaybackSource> {
    if (!isAudiusEnabled()) {
      throw new ProviderError('unsupported', 'Online music is turned off in this build.', {
        providerId: AUDIUS_PROVIDER_ID,
      });
    }
    if (track.provider !== AUDIUS_PROVIDER_ID || !track.providerTrackId) {
      throw new ProviderError('unsupported', 'This track did not come from Audius.', {
        providerId: AUDIUS_PROVIDER_ID,
      });
    }

    // Re-read the track so deleted/gated content cannot be played from a stale
    // search result, and so the short-lived stream redirect is fresh.
    const raw = await fetchAudiusTrack(track.providerTrackId, signal);
    const fresh = mapAudiusTrack(raw);
    if (!fresh.streamable) {
      throw new ProviderError('restricted', restrictedMessage(fresh), {
        providerId: AUDIUS_PROVIDER_ID,
      });
    }

    return {
      uri: audiusStreamUrl(track.providerTrackId, getAudiusBaseUrl()),
      mimeType: 'audio/mpeg',
      format: audiusFormat(raw),
      providerTrackId: track.providerTrackId,
      externalUrl: fresh.externalUrl,
    };
  },
};

/** Palette helper exported for provider cards that need a stable fallback. */
export function audiusPalette(seed: string) {
  return paletteForId(seed);
}
