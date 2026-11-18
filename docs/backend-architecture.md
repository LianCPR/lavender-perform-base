# Backend architecture

Phase 07 adds an optional hosted backend to Lavender. The app still runs as a
fully local music player; signing in turns on metadata sync between devices.

## Decision: Supabase (Postgres + GoTrue)

**Chosen:** Supabase, as requested/preferred. One platform provides:

- managed PostgreSQL with SQL migrations we own,
- email/password authentication (GoTrue) with password reset and confirmation,
- row-level security enforced by the database, not the client,
- a JS client (`@supabase/supabase-js`) that works in Expo web and React Native.

**Considered and rejected for this phase**

| Option | Why not now |
| --- | --- |
| Firebase | Document store; the normalized relational schema (playlists ↔ ordered tracks, catalog) is a better fit for SQL, and RLS is more precise than security rules. |
| Custom Node/Express API | Adds a server to deploy, secure and keep online for metadata that PostgreSQL can serve directly through RLS. More moving parts, no benefit at this scale. |
| Local-only IndexedDB/SQLite | Already what Phase 06 does; it cannot sync devices. |
| Multiple backends | Explicitly avoided: one provider keeps auth, database and policies coherent. |

No second backend platform is introduced. Audio files are *not* uploaded to
Supabase Storage, deliberately (see [Synchronization](synchronization.md)).

## Shape of the system

```
React screens (ui)                     no SQL, no Supabase imports
  └─ AuthProvider / SyncHost (ui)      auth state + sync orchestration
       └─ @lavender/backend            client, repositories, sync engine
            ├─ supabase-js             auth + PostgREST calls (RLS-scoped)
            └─ sync/merge.ts           pure merge rules (unit tested)
                 ↕
            Supabase: Postgres + GoTrue
```

`packages/backend/src`:

| Path | Responsibility |
| --- | --- |
| `env.ts` | Reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; `isBackendConfigured()` gates every backend path. |
| `client.ts` | Memoized `SupabaseClient<Database>`; returns `null` when unconfigured so guest mode never crashes. |
| `database.types.ts` | Hand-maintained row/insert/update/functions types matching the migrations. |
| `auth/` | `AuthProvider`, storage adapters, validation/error messages. |
| `repositories/` | Every SQL call: `library`, `playlists`, `playback`, `tracks`. |
| `sync/` | `engine.ts` (one pass), `merge.ts` (pure LWW rules), `storage.ts` (sync bookkeeping), `types.ts`, `local.ts` (structural local slices). |
| `index.ts` | Public API consumed by `packages/ui` and the apps. |

There are **no database queries in UI components**. Screens call hooks
(`useAuth`, `useSync`, `useLibrary`); `SyncHost` is the only component that
talks to the backend package, and the backend package is the only place that
talks to Supabase.

### Why the sync engine is not React

The engine is an async function (`runSyncPass`) over plain data:

```ts
runSyncPass({ client, userId, meta, local, playback, applyLibrary, applyPlayback })
```

That keeps merge logic testable with `node:test` and prevents dependency
cycles: `@lavender/music-library` and `@lavender/music-player` do not depend on
the backend. The React shell (`SyncHost` in `packages/ui`) reads the library
and player snapshots, calls the engine, and applies patches back.

### Runtime composition

Web (`apps/web/src/app/_layout.tsx`) and native
(`apps/mobile/src/app/_layout.tsx`) mount:

```
SafeAreaProvider
  AuthProvider            session restore + auth actions
    ThemeProvider
      LibraryProvider     device-local library (source of truth here)
        PlayerHost        expo-audio engine
          SyncHost        local-change detection + runSyncPass
            AppShell / Stack
```

Native registers its storage adapters (library, player, sync, auth) in
`apps/mobile/src/storage.ts` and imports the URL polyfill before anything else.

## Local-first boundaries

- The device is authoritative for **what exists on this device**: imported
  files, their URIs and playback.
- The cloud is authoritative only for **metadata shared across devices**:
  playlists, favorites, recents, library preferences and playback preferences.
- Guest mode is the default. Without env vars, `getSupabaseClient()` returns
  `null`, `SyncHost` reports `disabled`, and nothing attempts network access.
- Every write happens locally first and is persisted in device storage; sync
  is a best-effort follow-up. A sync failure never rolls back a local edit.

## Security posture

- Only the **anon public key** ships in the app. The service-role key is never
  referenced by client code, never put in `.env.example`, and must only be used
  by server-side tooling (CLI/psql) for seeding.
- All tables have RLS enabled; policies scope rows to `auth.uid()`. `anon` has
  no table privileges at all.
- Passwords are handled exclusively by GoTrue; the app database has no password
  column.
- Ownership is always derived from the session user id, never from a
  client-supplied `user_id` (repositories pass the authenticated id or rely on
  RLS `with check`).

## What this phase does not include

- Audio upload/streaming from Supabase Storage, or a streaming provider.
- Realtime subscriptions (sync is on demand/debounced, not a socket).
- Saved albums / followed artists UI (tables and policies exist; nothing writes
  them yet).
- Theme-mode sync (the `theme_mode` column exists, but the app keeps theme
  local and writes `'system'`).
- Multi-user collaboration on playlists.

See [Database schema](database-schema.md), [Authentication](authentication.md),
[Synchronization](synchronization.md) and [Deployment](deployment.md).
