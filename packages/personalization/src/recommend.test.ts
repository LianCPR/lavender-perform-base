import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Track } from '@lavender/shared';

import { createHistoryEntry } from './history.ts';
import { buildRecommendations, similarTracks } from './recommend.ts';
import { buildTasteProfile } from './taste.ts';

const catalog = {
  tracks: [
    { id: 't1', title: 'Soft Focus', artistId: 'a1', artistName: 'Aurora Veil', albumId: 'al1', albumTitle: 'Soft Focus', durationSec: 200, palette: 'lavender' as const },
    { id: 't2', title: 'Half Light', artistId: 'a1', artistName: 'Aurora Veil', albumId: 'al1', albumTitle: 'Soft Focus', durationSec: 200, palette: 'lavender' as const },
    { id: 't3', title: 'Midnight Bloom', artistId: 'a2', artistName: 'Nova Lune', albumId: 'al2', albumTitle: 'Midnight Bloom', durationSec: 200, palette: 'dusk' as const },
    { id: 't4', title: 'Blue Hour', artistId: 'a2', artistName: 'Nova Lune', albumId: 'al2', albumTitle: 'Midnight Bloom', durationSec: 200, palette: 'dusk' as const },
    { id: 't5', title: 'Glasshouse', artistId: 'a3', artistName: 'Kito Nakamura', albumId: 'al3', albumTitle: 'Glasshouse', durationSec: 200, palette: 'sage' as const },
    { id: 't6', title: 'North of Here', artistId: 'a4', artistName: 'Elysian Field', albumId: 'al4', albumTitle: 'North of Here', durationSec: 200, palette: 'ocean' as const },
  ],
  albums: [
    { id: 'al1', genreId: 'g1', artistId: 'a1' },
    { id: 'al2', genreId: 'g2', artistId: 'a2' },
    { id: 'al3', genreId: 'g1', artistId: 'a3' },
    { id: 'al4', genreId: 'g3', artistId: 'a4' },
  ],
  artists: [
    { id: 'a1', name: 'Aurora Veil' },
    { id: 'a2', name: 'Nova Lune' },
    { id: 'a3', name: 'Kito Nakamura' },
    { id: 'a4', name: 'Elysian Field' },
  ],
  playlists: [
    {
      id: 'p1',
      name: 'Midnight',
      trackIds: ['t3', 't4'],
      palette: 'dusk' as const,
      createdAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  genres: [
    { id: 'g1', name: 'Chill', palette: 'lavender' as const },
    { id: 'g2', name: 'Electronic', palette: 'dusk' as const },
    { id: 'g3', name: 'Jazz', palette: 'ocean' as const },
  ],
  moods: [
    { id: 'm1', name: 'Focus', trackIds: ['t1', 't5'] },
    { id: 'm2', name: 'Night Drive', trackIds: ['t3', 't4'] },
  ],
};

const emptyProfile = buildTasteProfile({ history: [], albums: catalog.albums, genres: catalog.genres });

test('without history, recommendations are an honest starter and never claim personalization', () => {
  const model = buildRecommendations({ catalog, profile: emptyProfile, history: [], now: new Date('2026-02-15T12:00:00Z') });
  assert.equal(model.personalized, false);
  assert.equal(model.sections[0]?.id, 'for-you');
  assert.match(model.sections[0]?.subtitle ?? '', /until we know/i);
  assert.equal(model.dailyMixes.length, 0);
  assert.equal(model.playlists.length, 0);
});

test('real history produces personalized sections and daily mixes', () => {
  const played = createHistoryEntry(
    { ...catalog.tracks[2]!, genre: 'Electronic', mood: 'Night Drive' },
    { id: 'h1', listenedSec: 120, playedAt: '2026-02-14T20:00:00.000Z' },
  );
  const profile = buildTasteProfile({
    history: [played],
    albums: catalog.albums,
    genres: catalog.genres,
    now: new Date('2026-02-15T12:00:00Z'),
  });
  const model = buildRecommendations({
    catalog,
    profile,
    history: [{ trackId: played.trackId, artistName: played.artistName, playedAt: played.playedAt }],
    now: new Date('2026-02-15T12:00:00Z'),
  });
  assert.equal(model.personalized, true);
  assert.ok(model.sections.some((section) => section.id === 'favorite-genres'));
  assert.ok(model.sections.some((section) => section.id === 'more-like-this'));
  assert.ok(model.sections.find((section) => section.id === 'favorite-genres')?.tracks.every((track) => track.artistName === 'Nova Lune' || track.artistName === 'Aurora Veil'));
  assert.ok(model.dailyMixes.length >= 2);
  assert.equal(model.dailyMixes[0]?.id, 'daily-mix-genre');
  assert.ok((model.dailyMixes[0]?.tracks.length ?? 0) > 0);
  assert.equal(model.playlists[0]?.playlist.id, 'p1');
});

test('dismissed recommendation sections are removed from the model', () => {
  const played = createHistoryEntry(
    { ...catalog.tracks[0]!, genre: 'Chill' },
    { id: 'h1', listenedSec: 120, playedAt: '2026-02-14T20:00:00.000Z' },
  );
  const profile = buildTasteProfile({ history: [played], albums: catalog.albums, genres: catalog.genres });
  const model = buildRecommendations({
    catalog,
    profile,
    history: [{ trackId: played.trackId, artistName: played.artistName, playedAt: played.playedAt }],
    dismissed: ['for-you', 'daily-mix-genre'],
  });
  assert.equal(model.sections.some((section) => section.id === 'for-you'), false);
  assert.equal(model.dailyMixes.some((mix) => mix.id === 'daily-mix-genre'), false);
});

test('disabled personalization returns no recommendations at all', () => {
  const played = createHistoryEntry(catalog.tracks[0]!, { id: 'h1', listenedSec: 120 });
  const profile = buildTasteProfile({ history: [played], albums: catalog.albums, genres: catalog.genres });
  const model = buildRecommendations({ catalog, profile, history: [], enabled: false });
  assert.deepEqual(model, { personalized: false, sections: [], dailyMixes: [], playlists: [] });
});

test('similar tracks prioritise the same artist and genre', () => {
  const similar = similarTracks(catalog.tracks[0] as Track, catalog, 3);
  assert.equal(similar[0]?.artistName, 'Aurora Veil');
  assert.ok(similar.some((track) => track.artistName === 'Kito Nakamura'));
  assert.ok(similar.every((track) => track.id !== 't1'));
});

test('the same day and seed produce a stable order', () => {
  const played = createHistoryEntry(catalog.tracks[0]!, { id: 'h1', listenedSec: 120 });
  const profile = buildTasteProfile({ history: [played], albums: catalog.albums, genres: catalog.genres });
  const args = {
    catalog,
    profile,
    history: [{ trackId: played.trackId, artistName: played.artistName, playedAt: played.playedAt }],
    seed: 4,
    now: new Date('2026-02-15T12:00:00Z'),
  };
  assert.deepEqual(
    buildRecommendations(args).sections.map((section) => section.tracks.map((track) => track.id)),
    buildRecommendations(args).sections.map((section) => section.tracks.map((track) => track.id)),
  );
});
