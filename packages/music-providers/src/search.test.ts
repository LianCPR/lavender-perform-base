import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Track } from '@lavender/shared';

import { ProviderError } from './errors.ts';
import type { MusicProvider } from './types.ts';
import {
  buildLocalDuplicateIndex,
  dedupeBy,
  partitionOnlineDuplicates,
  searchProvider,
  searchProviders,
} from './search.ts';

function track(id: string, title: string, artistName = 'Nova Lune'): Track {
  return {
    id,
    title,
    artistId: 'a',
    artistName,
    albumId: 'b',
    albumTitle: 'Album',
    durationSec: 100,
    palette: 'haze',
  };
}

function fakeProvider(overrides: Partial<MusicProvider> = {}): MusicProvider {
  return {
    id: 'fake',
    name: 'Fake',
    description: 'test',
    docsUrl: 'https://example.test',
    capabilities: {
      search: { tracks: true, albums: true, artists: true, playlists: true },
      metadata: { track: true, album: true, artist: true, playlist: true },
      artwork: true,
      playback: 'stream',
      home: false,
      personalization: { saveToProvider: false, userLibrary: false },
      authentication: 'none',
      attribution: { required: true, label: 'Fake', url: 'https://example.test' },
    },
    searchTracks: async () => [track('p1', 'One'), track('p1', 'One duplicate'), track('p2', 'Two')],
    searchAlbums: async () => [],
    searchArtists: async () => [],
    searchPlaylists: async () => [],
    ...overrides,
  };
}

test('blank queries do not call the provider', async () => {
  let called = false;
  const provider = fakeProvider({
    searchTracks: async () => {
      called = true;
      return [];
    },
  });
  const results = await searchProvider(provider, { query: '   ' });
  assert.equal(called, false);
  assert.deepEqual(results.tracks, []);
});

test('deduplicates provider records and keeps partial results', async () => {
  const provider = fakeProvider({
    searchArtists: async () => {
      throw new ProviderError('rate_limited', 'slow down', { providerId: 'fake' });
    },
  });
  const results = await searchProvider(provider, { query: 'nova', limit: 10 });
  assert.equal(results.tracks.length, 2);
  assert.equal(results.tracks[0]?.id, 'p1');
  assert.equal(results.errors.length, 1);
  assert.equal(results.errors[0]?.code, 'rate_limited');
});

test('throws only when every category fails', async () => {
  const provider = fakeProvider({
    searchTracks: async () => {
      throw new ProviderError('offline', 'offline');
    },
    searchAlbums: async () => {
      throw new ProviderError('offline', 'offline');
    },
    searchArtists: async () => {
      throw new ProviderError('offline', 'offline');
    },
    searchPlaylists: async () => {
      throw new ProviderError('offline', 'offline');
    },
  });
  await assert.rejects(() => searchProvider(provider, { query: 'x' }), /offline/);
});

test('unsupported providers reject search', async () => {
  const provider = fakeProvider({
    capabilities: {
      ...fakeProvider().capabilities,
      search: { tracks: false, albums: false, artists: false, playlists: false },
    },
    searchTracks: undefined,
    searchAlbums: undefined,
    searchArtists: undefined,
    searchPlaylists: undefined,
  });
  await assert.rejects(() => searchProvider(provider, { query: 'x' }), /does not support search/);
});

test('merges multiple providers without duplicating ids', async () => {
  const a = fakeProvider({ id: 'a' });
  const b = fakeProvider({ id: 'b' });
  const results = await searchProviders([a, b], { query: 'nova' });
  assert.deepEqual(
    results.tracks.map((item) => item.id),
    ['p1', 'p2'],
  );
});

test('local duplicates are detected but never merged into provider ids', () => {
  const local = [track('local-1', 'Night Signal', 'Nova Lune')];
  const index = buildLocalDuplicateIndex(local);
  const { duplicates, unique } = partitionOnlineDuplicates(
    [
      track('audius:track:x', 'night  signal', 'NOVA LUNE'),
      track('audius:track:y', 'Different Song', 'Nova Lune'),
    ],
    index,
  );
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0]?.id, 'audius:track:x');
  assert.equal(unique.length, 1);
  assert.equal(unique[0]?.id, 'audius:track:y');
});

test('dedupeBy preserves order', () => {
  assert.deepEqual(
    dedupeBy([{ id: 'b' }, { id: 'a' }, { id: 'b' }], (item) => item.id).map((item) => item.id),
    ['b', 'a'],
  );
});
