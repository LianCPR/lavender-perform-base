import type { Genre, ID, Playlist, Track } from '@lavender/shared';

import type { ListeningHistoryEntry, TasteProfile } from './types.ts';

export interface TasteInput {
  history: ListeningHistoryEntry[];
  tracks?: Track[];
  albums?: { id: ID; genreId?: ID }[];
  genres?: Genre[];
  playlists?: Playlist[];
  favoriteTrackIds?: string[];
  now?: Date;
}

const DAY_MS = 86_400_000;

function key(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function albumGenreMap(albums: TasteInput['albums'], genres: Genre[]): Map<string, string> {
  const genreNames = new Map(genres.map((genre) => [genre.id, genre.name]));
  const result = new Map<string, string>();
  for (const album of albums ?? []) {
    const name = album.genreId ? genreNames.get(album.genreId) : undefined;
    if (name) result.set(album.id, name);
  }
  return result;
}

function genreFor(entry: ListeningHistoryEntry, albumGenres: Map<string, string>): string | undefined {
  if (entry.genre) return entry.genre;
  if (entry.albumId) return albumGenres.get(entry.albumId);
  return undefined;
}

/**
 * Build an explainable profile from actual listening. No demographic or
 * sensitive inference is made: only artist, genre, mood, play counts and time.
 */
export function buildTasteProfile(input: TasteInput): TasteProfile {
  const history = input.history;
  const now = (input.now ?? new Date()).getTime();
  const albumGenres = albumGenreMap(input.albums, input.genres ?? []);
  const artists = new Map<string, { artistId?: string; name: string; plays: number; listenedSec: number; last: number }>();
  const genres = new Map<string, { plays: number; listenedSec: number }>();
  const moods = new Map<string, { plays: number; listenedSec: number }>();
  const tracks = new Map<
    string,
    { trackId: ID; title: string; artistName: string; plays: number; listenedSec: number; last: number }
  >();
  const historyTrackIds = new Set<string>();
  let totalListenedSec = 0;
  let recentPlays = 0;
  let previousPlays = 0;
  let lastPlayed = 0;

  for (const entry of history) {
    const playedAt = Date.parse(entry.playedAt);
    if (!Number.isFinite(playedAt)) continue;
    const listenedSec = Math.max(0, entry.listenedSec);
    totalListenedSec += listenedSec;
    historyTrackIds.add(entry.trackId);
    if (playedAt >= now - 7 * DAY_MS) recentPlays += 1;
    else if (playedAt >= now - 14 * DAY_MS) previousPlays += 1;
    if (playedAt > lastPlayed) lastPlayed = playedAt;

    const artistKey = key(entry.artistId) || key(entry.artistName);
    const artist = artists.get(artistKey) ?? {
      artistId: entry.artistId,
      name: entry.artistName,
      plays: 0,
      listenedSec: 0,
      last: 0,
    };
    artist.plays += 1;
    artist.listenedSec += listenedSec;
    artist.last = Math.max(artist.last, playedAt);
    artists.set(artistKey, artist);

    const genre = genreFor(entry, albumGenres);
    if (genre) {
      const item = genres.get(genre) ?? { plays: 0, listenedSec: 0 };
      item.plays += 1;
      item.listenedSec += listenedSec;
      genres.set(genre, item);
    }

    if (entry.mood) {
      const item = moods.get(entry.mood) ?? { plays: 0, listenedSec: 0 };
      item.plays += 1;
      item.listenedSec += listenedSec;
      moods.set(entry.mood, item);
    }

    const track = tracks.get(entry.trackId) ?? {
      trackId: entry.trackId,
      title: entry.title,
      artistName: entry.artistName,
      plays: 0,
      listenedSec: 0,
      last: 0,
    };
    track.plays += 1;
    track.listenedSec += listenedSec;
    track.last = Math.max(track.last, playedAt);
    tracks.set(entry.trackId, track);
  }

  const genreTotal = [...genres.values()].reduce((sum, item) => sum + item.listenedSec, 0);
  const trend =
    recentPlays > previousPlays * 1.2 && recentPlays > 0
      ? 'rising'
      : previousPlays > recentPlays * 1.2 && previousPlays > 0
        ? 'cooling'
        : 'steady';

  const playlists = (input.playlists ?? [])
    .map((playlist) => {
      const uniqueIds = new Set(playlist.trackIds);
      let plays = 0;
      for (const entry of history) {
        if (uniqueIds.has(entry.trackId)) plays += 1;
      }
      return { id: playlist.id, name: playlist.name, plays };
    })
    .filter((playlist) => playlist.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5);

  return {
    hasHistory: history.length > 0,
    totalPlays: history.length,
    totalListenedSec,
    distinctArtists: artists.size,
    distinctGenres: genres.size,
    favoriteCount: new Set(input.favoriteTrackIds ?? []).size,
    artists: [...artists.values()]
      .sort((a, b) => b.plays - a.plays || b.listenedSec - a.listenedSec)
      .slice(0, 8)
      .map((artist) => ({
        artistId: artist.artistId,
        name: artist.name,
        plays: artist.plays,
        listenedSec: artist.listenedSec,
        lastPlayedAt: new Date(artist.last).toISOString(),
      })),
    genres: [...genres.entries()]
      .sort((a, b) => b[1].listenedSec - a[1].listenedSec || b[1].plays - a[1].plays)
      .slice(0, 8)
      .map(([name, item]) => ({
        name,
        plays: item.plays,
        listenedSec: item.listenedSec,
        sharePct:
          genreTotal > 0
            ? Math.round((item.listenedSec / genreTotal) * 100)
            : Math.round((item.plays / Math.max(1, history.length)) * 100),
      })),
    moods: [...moods.entries()]
      .sort((a, b) => b[1].listenedSec - a[1].listenedSec)
      .slice(0, 5)
      .map(([name, item]) => ({ name, plays: item.plays, listenedSec: item.listenedSec })),
    tracks: [...tracks.values()]
      .sort((a, b) => b.plays - a.plays || b.listenedSec - a.listenedSec)
      .slice(0, 8)
      .map((track) => ({
        trackId: track.trackId,
        title: track.title,
        artistName: track.artistName,
        plays: track.plays,
        listenedSec: track.listenedSec,
        lastPlayedAt: new Date(track.last).toISOString(),
      })),
    playlists,
    trend: { direction: trend, recentPlays, previousPlays },
    lastPlayedAt: lastPlayed ? new Date(lastPlayed).toISOString() : null,
  };
}
