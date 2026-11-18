import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Playlist } from '@lavender/shared';

import {
  isNewer,
  maxTimestamp,
  mergeIdSet,
  mergePlaylists,
  mergePreferences,
  timestamp,
  toLibraryTrack,
} from './merge.ts';
import type { PlaylistStamp, RemotePlaylist } from './types.ts';

const playlist = (id: string, name: string, trackIds: string[] = []): Playlist => ({
  id,
  name,
  trackIds,
  palette: 'lavender',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const remotePlaylist = (
  id: string,
  name: string,
  updatedAt: string,
  extra: Partial<RemotePlaylist> = {},
): RemotePlaylist => ({
  id,
  name,
  description: null,
  palette: 'lavender',
  trackIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt,
  deletedAt: null,
  ...extra,
});

test('timestamps compare safely', () => {
  assert.equal(timestamp('not-a-date'), 0);
  assert.equal(isNewer('2026-02-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'), true);
  assert.equal(isNewer('2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z'), false);
  assert.equal(maxTimestamp([null, '2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z']), '2026-03-01T00:00:00.000Z');
});

test('playlists: remote copy newer than the local stamp wins', () => {
  const local = [playlist('p1', 'Local name')];
  const stamps: Record<string, PlaylistStamp> = {
    p1: { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
  };
  const merged = mergePlaylists(local, stamps, [
    remotePlaylist('p1', 'Cloud name', '2026-02-01T00:00:00.000Z', { trackIds: ['a', 'b'] }),
  ]);
  assert.equal(merged.playlists[0]?.name, 'Cloud name');
  assert.deepEqual(merged.playlists[0]?.trackIds, ['a', 'b']);
  assert.equal(merged.direction, 'remote');
  assert.equal(merged.push.length, 0);
});

test('playlists: local edits newer than the remote copy are pushed', () => {
  const local = [playlist('p1', 'Edited here', ['x', 'y'])];
  const stamps: Record<string, PlaylistStamp> = {
    p1: { updatedAt: '2026-03-01T00:00:00.000Z', deletedAt: null },
  };
  const merged = mergePlaylists(local, stamps, [
    remotePlaylist('p1', 'Old cloud name', '2026-02-01T00:00:00.000Z'),
  ]);
  assert.equal(merged.playlists[0]?.name, 'Edited here');
  assert.equal(merged.push.length, 1);
  assert.equal(merged.push[0]?.id, 'p1');
  assert.equal(merged.direction, 'local');
});

test('playlists: remote tombstone removes the local copy', () => {
  const merged = mergePlaylists(
    [playlist('p1', 'Gone')],
    { p1: { updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null } },
    [
      remotePlaylist('p1', 'Gone', '2026-02-01T00:00:00.000Z', {
        deletedAt: '2026-02-01T00:00:00.000Z',
      }),
    ],
  );
  assert.equal(merged.playlists.length, 0);
  assert.equal(merged.direction, 'remote');
  assert.equal(merged.stamps.p1?.deletedAt, '2026-02-01T00:00:00.000Z');
});

test('playlists: local deletions are pushed and beat older remote edits', () => {
  const merged = mergePlaylists(
    [],
    {},
    [remotePlaylist('p1', 'Old', '2026-01-01T00:00:00.000Z')],
    { deleted: { p1: '2026-02-01T00:00:00.000Z' } },
  );
  assert.deepEqual(merged.remove, ['p1']);
  assert.equal(merged.playlists.length, 0);
});

test('playlists: never-synced local playlists are pushed', () => {
  const merged = mergePlaylists([playlist('new', 'Brand new')], {}, []);
  assert.equal(merged.push.length, 1);
  assert.equal(merged.stamps.new?.deletedAt, null);
  assert.equal(merged.direction, 'local');
});

test('favorites and recents use set-level last-write-wins', () => {
  const newerRemote = mergeIdSet(
    ['a'],
    '2026-01-01T00:00:00.000Z',
    ['b', 'c'],
    '2026-02-01T00:00:00.000Z',
  );
  assert.deepEqual(newerRemote.value, ['b', 'c']);
  assert.equal(newerRemote.direction, 'remote');

  const newerLocal = mergeIdSet(
    ['a'],
    '2026-03-01T00:00:00.000Z',
    ['b'],
    '2026-02-01T00:00:00.000Z',
  );
  assert.deepEqual(newerLocal.value, ['a']);
  assert.equal(newerLocal.direction, 'local');
});

test('preferences prefer the newer side and keep the timestamp', () => {
  const remoteWin = mergePreferences(
    { sort: 'recent', view: 'grid', themeMode: 'system', updatedAt: '2026-01-01T00:00:00.000Z' },
    { sort: 'artist', view: 'list', themeMode: 'dark', updatedAt: '2026-02-01T00:00:00.000Z' },
  );
  assert.equal(remoteWin.value.sort, 'artist');
  assert.equal(remoteWin.direction, 'remote');

  const localWin = mergePreferences(
    { sort: 'title', view: 'grid', themeMode: 'system', updatedAt: '2026-03-01T00:00:00.000Z' },
    null,
  );
  assert.equal(localWin.value.sort, 'title');
  assert.equal(localWin.direction, 'local');
});

test('cloud imported metadata never carries a playable file', () => {
  const track = toLibraryTrack({
    key: 'imported-1',
    title: 'Cloud song',
    artistName: 'Unknown artist',
    albumTitle: 'Imported music',
    durationSec: 12,
    palette: 'haze',
    format: 'wav',
    fileName: 'song.wav',
    addedAt: '2026-02-01T00:00:00.000Z',
  });
  assert.equal(track.id, 'imported-1');
  assert.equal(track.imported, true);
  assert.equal('audio' in track, false);
});
