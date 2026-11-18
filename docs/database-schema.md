# Database schema

Migrations live in `supabase/migrations/` and are the source of truth:

| File | Contents |
| --- | --- |
| `20261116090000_initial_schema.sql` | extensions, enums, tables, indexes, `updated_at` triggers |
| `20261116090100_functions.sql` | `handle_new_user`, `replace_playlist_tracks`, `track_keys_exist`, auth trigger |
| `20261116090200_rls.sql` | RLS enablement, policies, grants/revokes |

`supabase/seed.sql` is generated from the demo catalog by
`scripts/generate-catalog-seed.mjs` (deterministic UUIDs, safe to re-run:
`on conflict do nothing`). `supabase/tests/` holds the local verification
harness, not Supabase migrations.

## Identity model

`auth.users` is owned by Supabase GoTrue. Three satellites point at it with
`on delete cascade`:

- `profiles` — `id` (= auth uid), `display_name` (1–80 chars), `avatar_url`,
  timestamps. Seeded by the `handle_new_user` trigger, which also copies
  `raw_user_meta_data.display_name` supplied at sign-up.
- `user_preferences` — one row per user: `library_sort`
  (`recent|title|artist`), `library_view` (`grid|list`), `theme_mode`
  (`system|light|dark`), timestamps.
- `playback_state` — one row per user: `shuffle`, `repeat_mode`
  (`off|all|one`), `volume` (0–1), `last_track_key`, `position_sec`,
  `queue_keys` (JSON array), timestamps.

All three are created automatically for every new account; clients can read and
update their own rows but never insert someone else's.

## Catalog metadata

Normalized so a track is described once and referenced by a stable key.

- `genres` — `id uuid`, unique `name`.
- `artists` — `id uuid`, unique `name`.
- `albums` — `id uuid`, `artist_id`, `title`, `year` (1900–2200), `genre_id`,
  `artwork_url`; unique `(artist_id, title)`.
- `tracks` — **primary key `client_key text`** (1–200 chars). This is the
  cross-device identity: catalog slugs (`artist-album-title`) for curated
  tracks and `imported-*` ids for listener imports. Columns: `title`,
  `artist_id`, `album_id`, display fallbacks `artist_name`/`album_title`,
  `duration_sec`, `artwork_url`, `palette`, `source`
  (`catalog|local_import|provider`), `audio_format`
  (`mp3|m4a|aac|wav|flac|unknown`), `provider`, `provider_track_id`,
  `owner_id` (`null` = shared catalog, auth uid = listener's import metadata),
  timestamps.
  Indexes: `owner_id`, `album_id`, `artist_id`, and a partial unique index on
  `(provider, provider_track_id)`.
- `user_imports` — which imported-file metadata belongs to a listener:
  `(user_id, track_key)` primary key, `file_name`, `mime_type`, `added_at`.
  **No audio bytes, no local URI.** The file itself stays on the device.

## Personal library

Every collection is scoped by `user_id` and, where removals must travel, keeps
a `deleted_at` tombstone plus `updated_at`.

- `library_favorites` — `(user_id, track_key)` PK, `created_at`, `updated_at`,
  `deleted_at`. Partial index on active rows.
- `recently_played` — `(user_id, track_key)` PK, `played_at`, `updated_at`;
  index `(user_id, played_at desc)`. The client keeps at most 24 entries.
- `saved_albums` — `(user_id, album_id)` PK + tombstone. Schema-only for now.
- `followed_artists` — `(user_id, artist_id)` PK + tombstone. Schema-only.

## Playlists

- `playlists` — `id text` primary key (1–120 chars). Client-generated and
  stable, so a playlist created offline keeps the same id when uploaded.
  Columns: `user_id`, `name` (1–120), `description` (≤500), `palette`,
  `created_at`, `updated_at`, `deleted_at`. Partial index on active user rows.
- `playlist_tracks` — `(playlist_id, track_key)` PK, `position` (≥0),
  `added_at`; index `(playlist_id, position)` for ordered reads. `position` is
  rewritten as a whole by the RPC below, so there are no gaps or duplicate
  positions per playlist.

## Triggers and functions

- `set_updated_at()` — `before update` trigger on every mutable table.
- `handle_new_user()` — `after insert on auth.users`, `security definer`,
  creates profile/preferences/playback rows (idempotent).
- `replace_playlist_tracks(p_playlist_id text, p_track_keys text[])` —
  `security invoker` RPC: verifies the caller owns a non-deleted playlist,
  deletes and re-inserts ordered tracks, bumps `updated_at`. Atomic, so an
  interrupted sync cannot leave a half-ordered playlist. Granted to
  `authenticated` only.
- `track_keys_exist(p_keys text[])` — returns which keys exist (catalog or own
  imports); used to filter references before writes. Granted to `authenticated`.

## Row Level Security

RLS is enabled on every table. Summary:

| Table | Policy |
| --- | --- |
| `profiles` | select/insert/update only when `id = auth.uid()` |
| `user_preferences`, `playback_state` | all when `user_id = auth.uid()` |
| `genres`, `artists`, `albums` | select for authenticated (read-only catalog) |
| `tracks` | select when `owner_id is null` (catalog) or own; insert/update/delete only own rows |
| `user_imports`, `library_favorites`, `saved_albums`, `followed_artists`, `recently_played` | all when `user_id = auth.uid()` |
| `playlists` | all when `user_id = auth.uid()` |
| `playlist_tracks` | select/insert/update/delete when the parent playlist belongs to `auth.uid()` |

`grant usage on schema public` and table DML go to `authenticated`; all table
privileges are revoked from `anon`. The seed script runs as the database owner,
which bypasses RLS for catalog rows (`owner_id is null`).

## Mapping to local models

| Local (Phase 06) | Cloud |
| --- | --- |
| `Playlist { id, name, palette, trackIds }` | `playlists` + ordered `playlist_tracks` |
| `favoriteTrackIds` | `library_favorites` (set-level sync) |
| `recentTrackIds` | `recently_played` (set-level sync, 24 max) |
| `preferences.sort / view` | `user_preferences.library_sort / library_view` |
| `importedTracks[]` metadata | `tracks` (`source='local_import'`, `owner_id`) + `user_imports` |
| playback session (shuffle/repeat/volume/position) | `playback_state` |
| track `audio.uri` | **never stored in the cloud** |

## Changing the schema

1. Add a new timestamped file under `supabase/migrations/`; never edit an
   applied migration on a shared project.
2. Update `packages/backend/src/database.types.ts` (row/insert/update types and
   function signatures).
3. Update `supabase/tests/rls.sql` with the new access rules.
4. Run `npm run test:db` (applies migrations + seed + RLS tests to a throwaway
   local PostgreSQL cluster).
5. Apply with `supabase db push` (see [Deployment](deployment.md)).
