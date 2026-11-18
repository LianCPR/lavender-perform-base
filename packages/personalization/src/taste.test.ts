import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Album, Genre, Playlist } from '@lavender/shared';

import { createHistoryEntry } from './history.ts';
import { buildTasteProfile } from './taste.ts';

const genres: Genre[] = [
  { id: 'gn-electronic', name: 'Electronic', palette: 'lavender' },
  { id: 'gn-jazz', name: 'Jazz', palette: 'ocean' },
];
const albums: Album[] = [
  { id: 'al-electronic', title: 'Midnight Bloom', artistId: 'ar-nova', artistName: 'Nova Lune', year: 2026, trackCount: 2, palette: 'dusk', genreId: 'gn-electronic' },
  { id: 'al-jazz', title: 'North of Here', artistId: 'ar-elysian', artistName: 'Elysian Field', year: 2022, trackCount: 2, palette: 'ocean', genreId: 'gn-jazz' },
];
const playlists: Playlist[] = [
  { id: 'pl-night', name: 'Night Drive', trackIds: ['tr-electronic'], palette: 'dusk', createdAt: '2025-01-01T00:00:00.000Z' },
];
const now = new Date('2026-02-15T12:00:00.000Z');

function entry(id: string, trackId: string, artist: string, albumId: string, playedAt: string, listenedSec = 90) {
  return createHistoryEntry(
    {
      id: trackId,
      title: `Song ${id}`,
      artistId: artist.toLowerCase().replace(/\s/g, '-'),
      artistName: artist,
      albumId,
      albumTitle: 'Album',
      durationSec: 180,
      palette: 'dusk',
    },
    { id, listenedSec, playedAt },
  );
}

test('profile uses real history for artists, genres, tracks and playlists', () => {
  const history = [
    entry('a', 'tr-electronic', 'Nova Lune', 'al-electronic', '2026-02-14T21:00:00.000Z', 120),
    entry('b', 'tr-electronic', 'Nova Lune', 'al-electronic', '2026-02-13T21:00:00.000Z', 100),
    entry('c', 'tr-jazz', 'Elysian Field', 'al-jazz', '2026-02-12T21:00:00.000Z', 60),
  ];
  const profile = buildTasteProfile({ history, albums, genres, playlists, now, favoriteTrackIds: ['x', 'y'] });

  assert.equal(profile.hasHistory, true);
  assert.equal(profile.totalPlays, 3);
  assert.equal(profile.favoriteCount, 2);
  assert.equal(profile.artists[0]?.name, 'Nova Lune');
  assert.equal(profile.artists[0]?.plays, 2);
  assert.equal(profile.genres[0]?.name, 'Electronic');
  assert.equal(profile.genres[0]?.sharePct, 79);
  assert.equal(profile.tracks[0]?.trackId, 'tr-electronic');
  assert.equal(profile.playlists[0]?.name, 'Night Drive');
  assert.equal(profile.playlists[0]?.plays, 2);
});

test('trend compares the last seven days with the previous seven', () => {
  const rising = buildTasteProfile({
    history: [
      entry('r1', 'tr-electronic', 'Nova Lune', 'al-electronic', '2026-02-14T21:00:00.000Z'),
      entry('r2', 'tr-electronic', 'Nova Lune', 'al-electronic', '2026-02-13T21:00:00.000Z'),
      entry('r3', 'tr-jazz', 'Elysian Field', 'al-jazz', '2026-02-12T21:00:00.000Z'),
      entry('p1', 'tr-jazz', 'Elysian Field', 'al-jazz', '2026-02-05T21:00:00.000Z'),
    ],
    albums,
    genres,
    now,
  });
  assert.equal(rising.trend.direction, 'rising');
  assert.equal(rising.trend.recentPlays, 3);
  assert.equal(rising.trend.previousPlays, 1);
});

test('empty history is not dressed up as a profile', () => {
  const profile = buildTasteProfile({ history: [], albums, genres, now });
  assert.equal(profile.hasHistory, false);
  assert.equal(profile.totalPlays, 0);
  assert.equal(profile.artists.length, 0);
  assert.equal(profile.genres.length, 0);
  assert.equal(profile.trend.direction, 'steady');
});

test('explicit genres on online history win over album lookup', () => {
  const online = createHistoryEntry(
    {
      id: 'audius:track:1',
      title: 'Open Sky',
      artistId: 'audius:artist:1',
      artistName: 'Open Artist',
      albumId: 'audius:release:1',
      albumTitle: 'Open',
      durationSec: 200,
      palette: 'sage',
      provider: 'audius',
      providerTrackId: '1',
      genre: 'Lo-fi',
      mood: 'Study',
    },
    { listenedSec: 100, playedAt: '2026-02-14T10:00:00.000Z' },
  );
  const profile = buildTasteProfile({ history: [online], now });
  assert.equal(profile.genres[0]?.name, 'Lo-fi');
  assert.equal(profile.moods[0]?.name, 'Study');
});
