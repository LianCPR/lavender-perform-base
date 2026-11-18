import type { Album, Artist, ID, Playlist, Track } from '@lavender/shared';

import type { MusicCatalog } from './demoCatalog';

export function albumById(catalog: MusicCatalog, id: ID): Album | undefined {
  return catalog.albums.find((album) => album.id === id);
}

export function artistById(catalog: MusicCatalog, id: ID): Artist | undefined {
  return catalog.artists.find((artist) => artist.id === id);
}

export function trackById(catalog: MusicCatalog, id: ID): Track | undefined {
  return catalog.tracks.find((track) => track.id === id);
}

export function playlistById(playlists: Playlist[], id: ID): Playlist | undefined {
  return playlists.find((playlist) => playlist.id === id);
}

export function albumsForArtist(catalog: MusicCatalog, artistId: ID): Album[] {
  return catalog.albums.filter((album) => album.artistId === artistId);
}

export function tracksForArtist(catalog: MusicCatalog, artistId: ID): Track[] {
  return catalog.tracks.filter((track) => track.artistId === artistId);
}

export function tracksForAlbum(catalog: MusicCatalog, albumId: ID): Track[] {
  return catalog.tracks.filter((track) => track.albumId === albumId);
}

export function tracksByIdMap(catalog: MusicCatalog): Record<ID, Track> {
  return catalog.tracks.reduce<Record<ID, Track>>((map, track) => {
    map[track.id] = track;
    return map;
  }, {});
}

/** Resolve ids in order, skipping ids that are no longer in the catalog. */
export function tracksForIds(catalog: MusicCatalog, ids: ID[]): Track[] {
  return ids
    .map((id) => trackById(catalog, id))
    .filter((track): track is Track => Boolean(track));
}

/** Playlist tracks in stored order, skipping ids that are no longer present. */
export function tracksForPlaylist(catalog: MusicCatalog, playlist: Playlist): Track[] {
  return tracksForIds(catalog, playlist.trackIds);
}

export function albumsForIds(catalog: MusicCatalog, ids: ID[]): Album[] {
  return ids
    .map((id) => albumById(catalog, id))
    .filter((album): album is Album => Boolean(album));
}

export function albumsForGenre(catalog: MusicCatalog, genreId: ID): Album[] {
  return catalog.albums.filter((album) => album.genreId === genreId);
}
