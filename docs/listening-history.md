# Listening history

Listening history is a measured playback log, not a list of tapped rows.

## When a listen counts

```
threshold = min(30, max(6, round(track.durationSec × 0.40)))
```

A session is committed only when measured playback reaches that threshold. This
means a 3-second test tone (threshold 6 s) can never become history; a 30-second
track needs 12 seconds; a four-minute track needs 30 seconds.

While playing, the tracker adds only forward position deltas of 0–3 seconds. A
seek, pause, buffering stall, failed provider stream or repeat jump larger than
3 seconds adds nothing. The first commit happens at the threshold, then the same
session is updated at most every 15 seconds and when it ends/changes. A session is
identified by its start time, so updates replace rather than duplicate it.

## Recorded fields

- session id, track id, title, artist/album labels
- duration, measured `listenedSec`, `playedAt`
- source: `local` or `online`
- optional provider/provider track id
- optional genre/mood, palette and remote artwork URL
- `completed` when ≥ 85% of the track was heard

Never recorded: audio data, local file paths, blob URIs, `data:` artwork, provider
access tokens or stream URLs.

## Local lifecycle

`LibraryProvider` persists history in `lavender.library` v5:

- newest first, capped at 300 sessions;
- individual deletes add a tombstone (capped at 200);
- “Delete all history” clears the list, tombstones, and writes
  `historyClearedAt`;
- resetting the taste profile performs the same clear but keeps favorites,
  playlists and the on/off setting;
- sanitization drops malformed/NaN sessions and any local artwork URI.

The `/personalization` screen lists sessions with source, timestamp and measured
time. Search covers title, artist, album, genre and mood. Each row can be played
or deleted; “Delete all history” requires confirmation.

## Sync

When signed in, `listening_history` stores one row per `(user_id, session id)`.
Sync is additive:

- local-only sessions are pushed;
- remote sessions are unioned by id;
- if both sides have the same id, the longer `listenedSec` wins;
- local and remote tombstones prevent deleted sessions reappearing;
- after a local clear, remote rows older than `historyClearedAt` are deleted and
  filtered out;
- audio is never uploaded.

Rows have no foreign key to `tracks`, so history survives a provider track being
removed or an imported file no longer existing on this device. RLS requires
`user_id = auth.uid()` for every operation.

## Verified behavior

In the web app, a real 30-second local file recorded a measured listen (committed
at the 12-second threshold, updated to 30 seconds). A real Audius stream recorded
an `online` source session around 45 seconds. Playing the 3-second test tone
produced no new session. Deleting one session removed it and wrote a tombstone;
“Delete all history” emptied the list, set the clear cutoff, and the UI returned
to the honest “Start here” fallback.

## Limitations

- A suspended browser tab or backgrounded native app may stop receiving position
  updates; only measured time is counted.
- A clear is local-first. Other signed-in devices remove older remote rows during
  sync, but a device that still holds old local sessions can upload them again if
  it syncs later; account-wide clear markers are not implemented.
- iOS tracking and UI were not exercised on a device/simulator; TypeScript, Expo
  config and web behavior were.
- Live Supabase history sync was not run because the project has no configured
  Supabase credentials. The migration and RLS policies pass the local PostgreSQL
  verification.
