import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Track } from '@lavender/shared';

import {
  createHistoryEntry,
  listenThreshold,
  mergeHistoryEntries,
  mergeRemoteHistory,
  qualifiesListen,
  searchHistory,
} from './history.ts';

const track: Track = {
  id: 'tr-one',
  title: 'Night Signal',
  artistId: 'ar-one',
  artistName: 'Nova Lune',
  albumId: 'al-one',
  albumTitle: 'Midnight Bloom',
  durationSec: 200,
  palette: 'dusk',
  genre: 'Electronic',
  mood: 'Night Drive',
  artworkUri: 'data:image/png;base64,secret',
};

test('very short plays do not count as listens', () => {
  assert.equal(listenThreshold(3), 6);
  assert.equal(listenThreshold(200), 30);
  assert.equal(qualifiesListen(3, 3), false);
  assert.equal(qualifiesListen(200, 29), false);
  assert.equal(qualifiesListen(200, 30), true);
  assert.equal(qualifiesListen(20, 8), true);
});

test('history entries keep source metadata but never local audio or data artwork', () => {
  const entry = createHistoryEntry(track, { listenedSec: 45, id: 'session-1', playedAt: '2026-01-01T00:00:00.000Z' });
  assert.equal(entry.id, 'session-1');
  assert.equal(entry.source, 'local');
  assert.equal(entry.genre, 'Electronic');
  assert.equal(entry.mood, 'Night Drive');
  assert.equal(entry.artworkUri, undefined);
  assert.equal(entry.completed, false);

  const online = createHistoryEntry(
    { ...track, id: 'audius:track:abc', provider: 'audius', providerTrackId: 'abc', artworkUri: 'https://img.test/cover.jpg' },
    { listenedSec: 180 },
  );
  assert.equal(online.source, 'online');
  assert.equal(online.provider, 'audius');
  assert.equal(online.artworkUri, 'https://img.test/cover.jpg');
  assert.equal(online.completed, true);
});

test('same session updates replace rather than duplicate', () => {
  const first = createHistoryEntry(track, { listenedSec: 30, id: 's1', playedAt: '2026-01-01T00:00:00.000Z' });
  const updated = { ...first, listenedSec: 90 };
  const second = createHistoryEntry(track, { listenedSec: 40, id: 's2', playedAt: '2026-01-02T00:00:00.000Z' });
  const merged = mergeHistoryEntries([first], [updated, second]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((entry) => entry.id === 's1')?.listenedSec, 90);
  assert.equal(merged[0]?.id, 's2');
});

test('remote history merges additively, longest listen wins and tombstones stay deleted', () => {
  const local = [
    createHistoryEntry(track, { listenedSec: 30, id: 's1', playedAt: '2026-01-01T00:00:00.000Z' }),
    createHistoryEntry(track, { listenedSec: 40, id: 's2', playedAt: '2026-01-02T00:00:00.000Z' }),
  ];
  const remote = [
    { ...local[0]!, listenedSec: 45 },
    createHistoryEntry(track, { listenedSec: 50, id: 's3', playedAt: '2026-01-03T00:00:00.000Z' }),
    createHistoryEntry(track, { listenedSec: 60, id: 'deleted', playedAt: '2026-01-04T00:00:00.000Z' }),
  ];
  const merged = mergeRemoteHistory({ local, remote, deletedIds: ['deleted'] });
  assert.deepEqual(merged.history.map((entry) => entry.id), ['s3', 's2', 's1']);
  assert.equal(merged.history.find((entry) => entry.id === 's1')?.listenedSec, 45);
  assert.deepEqual(merged.push.map((entry) => entry.id), ['s2']);
});

test('local history after a clear is pushed and older remote entries are ignored', () => {
  const old = createHistoryEntry(track, { listenedSec: 30, id: 'old', playedAt: '2026-01-01T00:00:00.000Z' });
  const fresh = createHistoryEntry(track, { listenedSec: 30, id: 'fresh', playedAt: '2026-01-10T00:00:00.000Z' });
  const merged = mergeRemoteHistory({
    local: [fresh],
    remote: [old],
    clearedAt: '2026-01-05T00:00:00.000Z',
  });
  assert.deepEqual(merged.history.map((entry) => entry.id), ['fresh']);
  assert.deepEqual(merged.push.map((entry) => entry.id), ['fresh']);
});

test('history search covers title, artist, album, genre and mood', () => {
  const entry = createHistoryEntry(track, { listenedSec: 45 });
  assert.equal(searchHistory([entry], 'nova').length, 1);
  assert.equal(searchHistory([entry], 'midnight').length, 1);
  assert.equal(searchHistory([entry], 'electronic').length, 1);
  assert.equal(searchHistory([entry], 'missing').length, 0);
});
