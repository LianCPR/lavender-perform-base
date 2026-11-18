import type { ProviderAlbum, ProviderArtist, ProviderPlaylist, Track } from '@lavender/shared';

import { ProviderError, isAbortError, isProviderError } from './errors.ts';
import type { MusicProvider, ProviderSearchRequest, ProviderSearchResults } from './types.ts';

function toError(error: unknown): ProviderError {
  if (isProviderError(error)) return error;
  return new ProviderError('unavailable', 'The provider search failed.', { cause: error });
}

function empty(): ProviderSearchResults {
  return { tracks: [], albums: [], artists: [], playlists: [], errors: [] };
}

/** Remove duplicate provider records while preserving result order. */
export function dedupeBy<T>(items: T[], getId: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

export async function searchProvider(
  provider: MusicProvider,
  request: ProviderSearchRequest,
): Promise<ProviderSearchResults> {
  const query = request.query.trim();
  if (!query) return empty();

  const normalized: ProviderSearchRequest = {
    ...request,
    query,
    limit: Math.min(Math.max(request.limit ?? 12, 1), 40),
    offset: Math.max(request.offset ?? 0, 0),
  };

  const tasks: Promise<void>[] = [];
  const results = empty();

  const run = <T>(
    enabled: boolean,
    method: ((request: ProviderSearchRequest) => Promise<T[]>) | undefined,
    assign: (items: T[]) => void,
  ) => {
    if (!enabled || !method) return;
    tasks.push(
      method.call(provider, normalized).then(
        (items) => assign(Array.isArray(items) ? items : []),
        (error: unknown) => {
          if (isAbortError(error)) throw error;
          results.errors.push(toError(error));
        },
      ),
    );
  };

  run(provider.capabilities.search.tracks, provider.searchTracks?.bind(provider), (tracks: Track[]) => {
    results.tracks = dedupeBy(tracks, (track) => track.id);
  });
  run(
    provider.capabilities.search.albums,
    provider.searchAlbums?.bind(provider),
    (albums: ProviderAlbum[]) => {
      results.albums = dedupeBy(albums, (album) => album.id);
    },
  );
  run(
    provider.capabilities.search.artists,
    provider.searchArtists?.bind(provider),
    (artists: ProviderArtist[]) => {
      results.artists = dedupeBy(artists, (artist) => artist.id);
    },
  );
  run(
    provider.capabilities.search.playlists,
    provider.searchPlaylists?.bind(provider),
    (playlists: ProviderPlaylist[]) => {
      results.playlists = dedupeBy(playlists, (playlist) => playlist.id);
    },
  );

  if (tasks.length === 0) {
    throw new ProviderError('unsupported', 'This provider does not support search.', {
      providerId: provider.id,
    });
  }

  await Promise.all(tasks);

  const hasData =
    results.tracks.length > 0 ||
    results.albums.length > 0 ||
    results.artists.length > 0 ||
    results.playlists.length > 0;
  if (!hasData && results.errors.length === tasks.length) {
    throw results.errors[0];
  }
  return results;
}

/** Search several providers, keeping their data merged but distinguishable. */
export async function searchProviders(
  providers: MusicProvider[],
  request: ProviderSearchRequest,
): Promise<ProviderSearchResults> {
  const merged = empty();
  const settled = await Promise.allSettled(
    providers.map((provider) => searchProvider(provider, request)),
  );
  for (const outcome of settled) {
    if (outcome.status === 'rejected') {
      merged.errors.push(toError(outcome.reason));
      continue;
    }
    merged.tracks.push(...outcome.value.tracks);
    merged.albums.push(...outcome.value.albums);
    merged.artists.push(...outcome.value.artists);
    merged.playlists.push(...outcome.value.playlists);
    merged.errors.push(...outcome.value.errors);
  }
  merged.tracks = dedupeBy(merged.tracks, (track) => track.id);
  merged.albums = dedupeBy(merged.albums, (album) => album.id);
  merged.artists = dedupeBy(merged.artists, (artist) => artist.id);
  merged.playlists = dedupeBy(merged.playlists, (playlist) => playlist.id);
  return merged;
}

export interface LocalDuplicateIndex {
  /** normalized `title|artist` keys already in the local library. */
  keys: Set<string>;
}

export function normalizeTitleArtist(title: string, artist: string): string {
  return `${title} ${artist}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildLocalDuplicateIndex(tracks: Track[]): LocalDuplicateIndex {
  return {
    keys: new Set(tracks.map((track) => normalizeTitleArtist(track.title, track.artistName))),
  };
}

/**
 * Split online results into items that already exist locally and new items.
 * A local file and a provider record are never merged: ids stay distinct and
 * the file remains the playable local copy.
 */
export function partitionOnlineDuplicates(
  tracks: Track[],
  index: LocalDuplicateIndex,
): { duplicates: Track[]; unique: Track[] } {
  const duplicates: Track[] = [];
  const unique: Track[] = [];
  for (const track of tracks) {
    if (index.keys.has(normalizeTitleArtist(track.title, track.artistName))) {
      duplicates.push(track);
    } else {
      unique.push(track);
    }
  }
  return { duplicates, unique };
}
