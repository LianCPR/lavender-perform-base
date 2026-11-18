import type { Album, Artist, Genre, ID, Playlist, Track } from '@lavender/shared';

import type { MusicCatalog } from './demoCatalog';

export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  genres: Genre[];
  total: number;
}

const EMPTY_RESULTS: SearchResults = {
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  genres: [],
  total: 0,
};

function includes(value: string | undefined, query: string): boolean {
  return Boolean(value?.toLowerCase().includes(query));
}

/**
 * Local, case-insensitive search across the whole catalog plus the listener's
 * own playlists. Pure and synchronous: no network, no external search API.
 */
export function searchCatalog(
  catalog: MusicCatalog,
  playlists: Playlist[],
  rawQuery: string,
  limit = 24,
): SearchResults {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return EMPTY_RESULTS;

  const genreNames = new Map<ID, string>(catalog.genres.map((genre) => [genre.id, genre.name]));

  const genres = catalog.genres.filter((genre) => includes(genre.name, query));

  const albums = catalog.albums.filter(
    (album) =>
      includes(album.title, query) ||
      includes(album.artistName, query) ||
      includes(album.genreId ? genreNames.get(album.genreId) : undefined, query),
  );

  const albumIdsForGenre = new Set(
    albums.map((album) => album.id).filter((id, index, all) => all.indexOf(id) === index),
  );

  const tracks = catalog.tracks
    .filter(
      (track) =>
        includes(track.title, query) ||
        includes(track.artistName, query) ||
        includes(track.albumTitle, query) ||
        albumIdsForGenre.has(track.albumId),
    )
    .slice(0, limit);

  const artists = catalog.artists.filter(
    (artist) =>
      includes(artist.name, query) ||
      catalog.tracks.some((track) => track.artistId === artist.id && includes(track.title, query)),
  );

  const playlistMatches = playlists.filter(
    (playlist) => includes(playlist.name, query) || includes(playlist.description, query),
  );

  return {
    tracks,
    albums,
    artists,
    playlists: playlistMatches,
    genres,
    total:
      tracks.length + albums.length + artists.length + playlistMatches.length + genres.length,
  };
}
