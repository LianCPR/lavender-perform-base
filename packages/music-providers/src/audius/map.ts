import type {
  ArtworkPalette,
  AudioFormat,
  ProviderAlbum,
  ProviderArtist,
  ProviderPlaylist,
  Track,
} from '@lavender/shared';

export const AUDIUS_PROVIDER_ID = 'audius';
export const AUDIUS_APP_NAME = 'Lavender';

export interface AudiusImage {
  '150x150'?: string;
  '480x480'?: string;
  '1000x1000'?: string;
}

export interface AudiusUser {
  id: string;
  name?: string;
  handle?: string;
  profile_picture?: AudiusImage | null;
  is_verified?: boolean;
  permalink?: string;
}

export interface AudiusTrack {
  id: string;
  title?: string;
  duration?: number;
  genre?: string | null;
  license?: string | null;
  mood?: string | null;
  permalink?: string | null;
  artwork?: AudiusImage | null;
  user?: AudiusUser | null;
  is_streamable?: boolean;
  is_stream_gated?: boolean;
  is_delete?: boolean;
  preview_cid?: string | null;
  orig_filename?: string | null;
  access?: { stream?: boolean; download?: boolean } | null;
  stream_conditions?: unknown;
  album_backlink?: { id?: string; playlist_name?: string } | null;
  release_date?: string | null;
}

export interface AudiusPlaylist {
  id: string;
  playlist_name?: string;
  description?: string | null;
  is_album?: boolean;
  track_count?: number;
  artwork?: AudiusImage | null;
  user?: AudiusUser | null;
  permalink?: string | null;
  release_date?: string | null;
  is_delete?: boolean;
  is_private?: boolean;
  tracks?: AudiusTrack[];
  playlist_contents?: { track_id: string }[];
}

const PALETTES: ArtworkPalette[] = ['lavender', 'haze', 'ocean', 'sage', 'rose', 'dusk', 'plum', 'ember'];

/** Stable palette so a provider item keeps the same placeholder everywhere. */
export function paletteForId(seed: string): ArtworkPalette {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return PALETTES[hash % PALETTES.length] ?? 'haze';
}

export function artworkUrl(image: AudiusImage | null | undefined): string | undefined {
  if (!image) return undefined;
  return image['480x480'] ?? image['1000x1000'] ?? image['150x150'];
}

export function audiusPermalink(permalink: string | null | undefined): string | undefined {
  if (!permalink) return undefined;
  return permalink.startsWith('http') ? permalink : `https://audius.co${permalink}`;
}

export function audiusTrackId(raw: AudiusTrack): string {
  return `${AUDIUS_PROVIDER_ID}:track:${raw.id}`;
}

export function audiusArtistId(userId: string): string {
  return `${AUDIUS_PROVIDER_ID}:artist:${userId}`;
}

export function audiusPlaylistId(playlistId: string): string {
  return `${AUDIUS_PROVIDER_ID}:playlist:${playlistId}`;
}

export function audiusAlbumId(playlistId: string): string {
  return `${AUDIUS_PROVIDER_ID}:album:${playlistId}`;
}

/** Provider-native id from a namespaced id (`audius:track:abc` → `abc`). */
export function nativeId(namespaced: string): string {
  const parts = namespaced.split(':');
  return parts.length >= 3 ? parts.slice(2).join(':') : namespaced;
}

/**
 * Audius returns short-lived signed stream URLs behind its redirect, so we keep
 * the stable endpoint and resolve it at play time.
 */
export function audiusStreamUrl(trackId: string, baseUrl?: string): string {
  const base = (baseUrl ?? 'https://api.audius.co/v1').replace(/\/$/, '');
  return `${base}/tracks/${encodeURIComponent(trackId)}/stream?app_name=${AUDIUS_APP_NAME}`;
}

export function audiusFormat(raw: AudiusTrack): AudioFormat {
  const source = raw.orig_filename ?? '';
  const extension = source.toLowerCase().split('.').pop();
  if (extension === 'mp3') return 'mp3';
  if (extension === 'm4a') return 'm4a';
  if (extension === 'aac') return 'aac';
  if (extension === 'wav') return 'wav';
  if (extension === 'flac') return 'flac';
  return 'mp3';
}

export function audiusRestriction(
  raw: AudiusTrack,
): Track['restriction'] {
  if (raw.is_delete) return 'unavailable';
  if (raw.is_stream_gated) return 'gated';
  if (raw.is_streamable === false) {
    // A preview alone is not full authorized playback for this app.
    return raw.preview_cid ? 'gated' : 'unavailable';
  }
  if (raw.access && raw.access.stream === false) return 'gated';
  return undefined;
}

export function isAudiusStreamable(raw: AudiusTrack): boolean {
  return (
    Boolean(raw.id) &&
    raw.is_delete !== true &&
    raw.is_streamable !== false &&
    raw.is_stream_gated !== true &&
    raw.access?.stream !== false
  );
}

export function mapAudiusTrack(raw: AudiusTrack): Track {
  const user = raw.user;
  const artistName = user?.name?.trim() || 'Audius artist';
  const restriction = audiusRestriction(raw);
  return {
    id: audiusTrackId(raw),
    title: raw.title?.trim() || 'Untitled',
    artistId: user ? audiusArtistId(user.id) : `${AUDIUS_PROVIDER_ID}:artist:unknown`,
    artistName,
    albumId: raw.album_backlink?.id
      ? audiusAlbumId(raw.album_backlink.id)
      : `${AUDIUS_PROVIDER_ID}:release:${raw.id}`,
    albumTitle: raw.album_backlink?.playlist_name?.trim() || 'Audius',
    durationSec: Math.max(0, Math.round(raw.duration ?? 0)),
    palette: paletteForId(raw.id),
    artworkUri: artworkUrl(raw.artwork) ?? artworkUrl(user?.profile_picture ?? undefined),
    provider: AUDIUS_PROVIDER_ID,
    providerTrackId: raw.id,
    externalUrl: audiusPermalink(raw.permalink),
    artistHandle: user?.handle,
    streamable: isAudiusStreamable(raw),
    restriction,
    license: raw.license ?? undefined,
    genre: raw.genre ?? undefined,
    mood: raw.mood ?? undefined,
  };
}

export function mapAudiusArtist(raw: AudiusUser): ProviderArtist {
  return {
    id: audiusArtistId(raw.id),
    provider: AUDIUS_PROVIDER_ID,
    providerArtistId: raw.id,
    name: raw.name?.trim() || raw.handle || 'Audius artist',
    handle: raw.handle,
    palette: paletteForId(raw.id),
    artworkUri: artworkUrl(raw.profile_picture ?? undefined),
    externalUrl: audiusPermalink(raw.permalink),
  };
}

function playlistYear(raw: AudiusPlaylist): number | undefined {
  if (!raw.release_date) return undefined;
  const year = Number(raw.release_date.slice(0, 4));
  return Number.isFinite(year) ? year : undefined;
}

export function mapAudiusPlaylist(raw: AudiusPlaylist): ProviderPlaylist {
  return {
    id: raw.is_album ? audiusAlbumId(raw.id) : audiusPlaylistId(raw.id),
    provider: AUDIUS_PROVIDER_ID,
    providerPlaylistId: raw.id,
    name: raw.playlist_name?.trim() || 'Audius playlist',
    creatorName: raw.user?.name?.trim() || raw.user?.handle || 'Audius',
    trackCount: Math.max(0, raw.track_count ?? raw.tracks?.length ?? 0),
    palette: paletteForId(raw.id),
    artworkUri: artworkUrl(raw.artwork),
    externalUrl: audiusPermalink(raw.permalink),
    isAlbum: Boolean(raw.is_album),
  };
}

export function mapAudiusPlaylistTracks(raw: AudiusPlaylist): Track[] {
  const tracks = raw.tracks ?? [];
  return tracks
    .filter((track) => track.is_delete !== true)
    .map((track) => mapAudiusTrack({ ...track, user: track.user ?? raw.user ?? null }));
}

/** Audius exposes album-like playlists; split them for the UI categories. */
export function splitPlaylists(raw: AudiusPlaylist[]): {
  albums: ProviderAlbum[];
  playlists: ProviderPlaylist[];
} {
  const albums: ProviderAlbum[] = [];
  const playlists: ProviderPlaylist[] = [];
  for (const item of raw) {
    if (item.is_delete || item.is_private) continue;
    const mapped = mapAudiusPlaylist(item);
    if (item.is_album) {
      albums.push({
        id: mapped.id,
        provider: AUDIUS_PROVIDER_ID,
        providerAlbumId: mapped.providerPlaylistId,
        title: mapped.name,
        artistId: audiusArtistId(item.user?.id ?? 'unknown'),
        artistName: mapped.creatorName,
        year: playlistYear(item),
        trackCount: mapped.trackCount,
        palette: mapped.palette,
        artworkUri: mapped.artworkUri,
        externalUrl: mapped.externalUrl,
      });
    } else {
      playlists.push(mapped);
    }
  }
  return { albums, playlists };
}
