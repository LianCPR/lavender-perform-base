import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  audiusStreamUrl,
  isAudiusStreamable,
  mapAudiusArtist,
  mapAudiusPlaylist,
  mapAudiusTrack,
  nativeId,
  paletteForId,
  splitPlaylists,
  type AudiusTrack,
} from './map.ts';

const baseTrack: AudiusTrack = {
  id: 'abc123',
  title: 'Night Signal',
  duration: 214.4,
  permalink: '/nova-lune/night-signal',
  artwork: {
    '150x150': 'https://img.test/150.jpg',
    '480x480': 'https://img.test/480.jpg',
    '1000x1000': 'https://img.test/1000.jpg',
  },
  user: {
    id: 'artist1',
    name: 'Nova Lune',
    handle: 'novalune',
    profile_picture: { '150x150': 'https://img.test/artist.jpg' },
  },
  is_streamable: true,
  is_stream_gated: false,
  is_delete: false,
  access: { stream: true },
  license: 'CC BY 4.0',
};

test('maps a streamable track with stable provider identity', () => {
  const track = mapAudiusTrack(baseTrack);
  assert.equal(track.id, 'audius:track:abc123');
  assert.equal(track.provider, 'audius');
  assert.equal(track.providerTrackId, 'abc123');
  assert.equal(track.artistId, 'audius:artist:artist1');
  assert.equal(track.artistName, 'Nova Lune');
  assert.equal(track.artistHandle, 'novalune');
  assert.equal(track.durationSec, 214);
  assert.equal(track.artworkUri, 'https://img.test/480.jpg');
  assert.equal(track.externalUrl, 'https://audius.co/nova-lune/night-signal');
  assert.equal(track.streamable, true);
  assert.equal(track.restriction, undefined);
  assert.equal(track.license, 'CC BY 4.0');
  assert.equal(track.audio, undefined, 'provider metadata never fabricates audio');
});

test('flags gated and unavailable tracks instead of pretending they play', () => {
  const gated = mapAudiusTrack({ ...baseTrack, is_stream_gated: true, access: { stream: false } });
  assert.equal(gated.streamable, false);
  assert.equal(gated.restriction, 'gated');

  const unavailable = mapAudiusTrack({ ...baseTrack, is_streamable: false, access: { stream: true } });
  assert.equal(unavailable.streamable, false);
  assert.equal(unavailable.restriction, 'unavailable');

  assert.equal(isAudiusStreamable(baseTrack), true);
  assert.equal(isAudiusStreamable({ ...baseTrack, is_delete: true }), false);
});

test('uses the stable stream endpoint and extracts native ids', () => {
  assert.equal(
    audiusStreamUrl('abc123'),
    'https://api.audius.co/v1/tracks/abc123/stream?app_name=Lavender',
  );
  assert.equal(nativeId('audius:track:abc123'), 'abc123');
  assert.equal(nativeId('audius:playlist:Dv9QV'), 'Dv9QV');
});

test('artists and playlists map into provider references', () => {
  const artist = mapAudiusArtist({
    id: 'artist1',
    name: 'Nova Lune',
    handle: 'novalune',
    permalink: '/novalune',
    profile_picture: { '480x480': 'https://img.test/a480.jpg' },
  });
  assert.equal(artist.id, 'audius:artist:artist1');
  assert.equal(artist.externalUrl, 'https://audius.co/novalune');
  assert.equal(artist.artworkUri, 'https://img.test/a480.jpg');

  const playlist = mapAudiusPlaylist({
    id: 'pl1',
    playlist_name: 'Late Light',
    track_count: 7,
    artwork: { '150x150': 'https://img.test/p150.jpg' },
    user: { id: 'artist1', name: 'Nova Lune' },
  });
  assert.equal(playlist.id, 'audius:playlist:pl1');
  assert.equal(playlist.creatorName, 'Nova Lune');
  assert.equal(playlist.trackCount, 7);
});

test('album-like playlists are separated from community playlists', () => {
  const { albums, playlists } = splitPlaylists([
    {
      id: 'album1',
      playlist_name: 'Room Tone',
      is_album: true,
      track_count: 9,
      release_date: '2024-05-01T00:00:00Z',
      user: { id: 'artist1', name: 'Nova Lune' },
    },
    { id: 'pl1', playlist_name: 'Community mix', is_album: false, user: { id: 'u2', name: 'Listener' } },
    { id: 'private', playlist_name: 'Private', is_private: true },
  ]);
  assert.equal(albums.length, 1);
  assert.equal(albums[0]?.id, 'audius:album:album1');
  assert.equal(albums[0]?.year, 2024);
  assert.equal(playlists.length, 1);
  assert.equal(playlists[0]?.id, 'audius:playlist:pl1');
});

test('placeholder palettes are deterministic per id', () => {
  assert.equal(paletteForId('abc123'), paletteForId('abc123'));
  assert.ok(['lavender', 'haze', 'ocean', 'sage', 'rose', 'dusk', 'plum', 'ember'].includes(paletteForId('x')));
});
