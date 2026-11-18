# Privacy and data control

Personalization is opt-in by default only in the sense that it starts enabled;
the user can turn it off at any time from `/personalization`. All analysis is
local-first.

## Controls

| Control | Effect |
| --- | --- |
| Personalized recommendations switch | Stops recording new sessions, hides the taste profile and recommendation rows, and disables refresh. Existing history stays until deleted. |
| Delete one session | Removes it locally and records a sync tombstone. |
| Delete all history | Empties local history and sets `historyClearedAt`; derived profile and recommendations reset to the honest fallback. Remote rows older than the cutoff are removed during sync. |
| Reset taste profile | Same history clear plus dismissal reset, while keeping favorites, playlists and the on/off setting. |
| Restore suggestions | Clears section/mix dismissals; only shown when the user hid every row. |

The on/off setting and dismissals are device-local (`lavender.library` v5) and
are not uploaded as preferences.

## What is never collected

- Audio bytes, local file paths, blob URLs or `data:` artwork.
- Provider access tokens, stream URLs or credentials.
- Demographic, location, biometric or other sensitive inferences.
- Listening data from other users; RLS scopes every history row to `auth.uid()`.

Only track metadata, measured seconds, timestamps, source and optional provider
ids/genre/mood are stored. The same rule applies locally and in Supabase.

## Accounts and guest mode

Guests can use all playback, import, history and recommendation features; their
history stays in local storage. Signing in adds metadata sync. Signing out leaves
the local library intact and stops uploads. A different account gets fresh sync
bookkeeping, and the server policies prevent cross-account reads or writes.

## Offline behavior

The tracker needs no network. Local files continue to play and record when
offline. Online tracks cannot play offline and therefore never create a listen.
A failed sync keeps the local history and reports the status in Account; the next
pass retries idempotently.

## Security

- `listening_history` has RLS enabled and a single `user_id = auth.uid()` policy
  for select/insert/update/delete.
- The client uses the anon key only; no service-role key is present in the app.
- History rows have no track foreign key, so deleting catalog/provider metadata
  does not cascade personal data unexpectedly.
- Sync tombstones and clears are idempotent; repeated passes do not duplicate
  sessions.

## Known limits

- A local clear deletes older remote rows, but another device that still holds
  old local history could re-upload it later. There is no account-wide clear
  marker yet.
- Live two-account isolation in a hosted Supabase project was not exercised; the
  migration and RLS policy were verified against the local PostgreSQL stub.
- iOS privacy UI and native storage adapters were not tested on a simulator.
