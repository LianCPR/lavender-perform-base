/* eslint-disable no-undef */
// Live smoke test for the Audius endpoints Lavender uses.
// Run: node scripts/verify-audius.mjs
// Requires network access. No credentials are used (read-only public API).

const BASE = 'https://api.audius.co/v1';
const APP = 'Lavender';
const query = process.argv[2] ?? 'lofi';

async function json(path) {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}app_name=${APP}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${path} → HTTP ${response.status}`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const [tracks, artists, playlists, trending] = await Promise.all([
  json(`/tracks/search?query=${encodeURIComponent(query)}&limit=3`),
  json(`/users/search?query=${encodeURIComponent(query)}&limit=2`),
  json(`/playlists/search?query=${encodeURIComponent(query)}&limit=3`),
  json('/tracks/trending?time=week&limit=3'),
]);

assert(tracks.data?.length > 0, 'track search returned nothing');
assert(artists.data?.length > 0, 'artist search returned nothing');
assert(playlists.data?.length > 0, 'playlist search returned nothing');
assert(trending.data?.length > 0, 'trending returned nothing');

const streamable = [...tracks.data, ...trending.data].find((track) => track.is_streamable);
assert(streamable, 'no streamable track in the sample');

const stream = await fetch(`${BASE}/tracks/${streamable.id}/stream?app_name=${APP}`, {
  headers: { Range: 'bytes=0-1023' },
});
assert([200, 206].includes(stream.status), `stream returned HTTP ${stream.status}`);
assert((stream.headers.get('content-type') ?? '').startsWith('audio/'), 'stream is not audio');
const bytes = (await stream.arrayBuffer()).byteLength;
assert(bytes > 0, 'stream body was empty');

const playlist = playlists.data[0];
const playlistTracks = await json(`/playlists/${playlist.id}/tracks?limit=5`);
assert(Array.isArray(playlistTracks.data), 'playlist tracks response is not a list');

console.log('Audius verification passed');
console.log(
  JSON.stringify(
    {
      query,
      tracks: tracks.data.length,
      artists: artists.data.length,
      playlists: playlists.data.length,
      trending: trending.data.length,
      streamedTrack: { id: streamable.id, title: streamable.title, bytes },
      playlistTracks: playlistTracks.data.length,
    },
    null,
    2,
  ),
);
