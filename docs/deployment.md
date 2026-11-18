# Deployment

The backend is optional infrastructure. These steps are for turning sync on;
skipping them leaves a fully working local app.

## 1. Create the Supabase project

1. Create a project at <https://supabase.com/dashboard> (choose a region near
   listeners).
2. From **Project Settings → API**, copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   Do **not** copy the `service_role` key into any app file, `.env`, or chat.

## 2. Apply migrations and seed

With the Supabase CLI (installed via `npx supabase`):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

`db push` applies `supabase/migrations/*` in order. Then load the shared demo
catalog once (it uses deterministic ids and `on conflict do nothing`, so it is
safe to re-run):

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

`SUPABASE_DB_URL` is the pooled/direct Postgres connection string from
**Project Settings → Database**. Alternatively paste `supabase/seed.sql` into
the SQL editor. Regenerate it after changing the demo catalog with:

```bash
npm run seed:catalog   # scripts/generate-catalog-seed.mjs
```

The seed only inserts catalog metadata (`genres`, `artists`, `albums`,
`tracks` with `owner_id null`). It never creates users or personal rows.

## 3. Configure auth URLs

In **Authentication → URL Configuration**:

- **Site URL**: the production web origin, e.g. `https://music.example.com`.
- **Redirect URLs** (add all that apply):
  - `http://localhost:8081/account`
  - `https://music.example.com/account`
  - `lavendermusic://account` (native scheme)

In **Authentication → Providers → Email**:

- Enable email/password.
- Decide whether **Confirm email** is on. With it on, sign-up returns no
  session and the app tells the listener to confirm; with it off, sign-in is
  immediate.
- For production password resets, configure custom SMTP (the built-in sender is
  rate-limited and meant for testing).

## 4. Configure the app

Copy `.env.example` to `.env` and fill in the two public values:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_AUTH_REDIRECT_URL=lavendermusic://account
```

- `.env` is git-ignored (`.env`, `.env.*`, with `.env.example` allowed).
- Restart the dev server after changing env values; Expo inlines them.
- For native builds, provide the same `EXPO_PUBLIC_*` values through EAS
  environment variables/secrets. They are public by definition (they ship in
  the bundle); never add server secrets there.

## 5. Web deployment

```bash
npm run build:web      # static export to apps/web/dist
```

Deploy `apps/web/dist` to any static host. The export is a single-page app, so
configure a rewrite of all paths to `index.html` (for `/library`, `/account`,
`/design`, …). Serve over HTTPS: auth redirects and cookies assume a secure
origin.

The anon key and project URL are embedded in the JS bundle — that is expected.
Security comes from RLS, not from hiding the key.

## 6. Native builds

- `app.json` already declares the `lavendermusic` scheme used for redirects.
- Build with EAS or a local dev build (`npx expo run:ios`); the app needs a
  native build, not Expo Go, for the URL polyfill/auth storage combination to
  match production.
- Imported audio files live in the app's document directory; they are never
  uploaded. Reinstalling the app removes them.

## 7. Verify

Local checks (no Supabase project needed):

```bash
npm run typecheck
npm run lint
npm test                 # pure sync merge tests (node:test)
npm run test:db          # migrations + seed + RLS on a throwaway PostgreSQL
npm run build:web
```

`test:db` needs PostgreSQL binaries; on Windows:

```bash
PGBIN="/c/Program Files/PostgreSQL/18/bin" npm run test:db
```

With a configured project, manually verify:

1. Sign up on web → confirm email (if enabled) → sign in.
2. Import a file, favorite a track, create/reorder a playlist, change
   sort/view. Account → status becomes `idle` and **Sync now** succeeds.
3. Sign in as a second account in a private window: it must see none of the
   first account's playlists/favorites (RLS), and its own data syncs.
4. Password reset: request the email, open the link on web, set a new password,
   sign in with it.
5. Sign out: the local library remains, sync shows `signed-out`.
6. Two-device check (two browsers/profiles): create a playlist on A, sync,
   sync on B → it appears with the same track order. Delete it on B, sync, sync
   on A → it disappears.

## What has been verified

In this workspace:

- `npm run test:db` — migrations, seed, sign-up trigger (including display
  name), cross-user isolation, ownership policies, playlist ordering RPC and
  denied writes all pass against PostgreSQL 18 with a stubbed `auth` schema.
- `npm test` — 9 merge/sync rule tests pass.
- `npm run typecheck`, `npm run lint`, `npm run build:web` pass.
- Web guest mode and the Account screen render correctly (`disabled` state).

**Not verified here:** live Supabase registration/login/reset, hosted RLS and
sync, network failure recovery against a real project, native iOS auth and
deep-link recovery, and cross-device sync. There is no Supabase project or
credentials in this environment. Treat those as deployment-time checks.

## Operations

- **Schema changes:** add a new migration, update
  `packages/backend/src/database.types.ts` and `supabase/tests/rls.sql`, run
  `npm run test:db`, then `npx supabase db push`. Migrations are forward-only;
  take a database backup before destructive changes and write a companion
  down-migration if a rollback plan is required.
- **Key rotation:** rotate the anon key in the dashboard and redeploy the app
  with the new value. Rotating the service-role key does not affect clients
  (they never use it). Never commit either key.
- **Free-tier pause:** an inactive Supabase project can be paused; the app then
  behaves as offline (`error`/`offline` status) while local playback continues.
- **Logs:** auth and Postgres errors are visible in the Supabase dashboard. The
  client surfaces a concise message and keeps the detailed error text in
  `SyncState.error` for the Account screen.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Account says “Backend not configured” | `.env` missing/invalid; restart the dev server. |
| `new row violates row-level security policy` | Writing a row with a `user_id`/`owner_id` other than the session user, or an `anon` request. |
| `playlist not found or not owned by caller` | `replace_playlist_tracks` called for a playlist owned by another account or soft-deleted. |
| Reset email link lands on the wrong page | Redirect URL not allow-listed in Supabase auth settings. |
| Emails never arrive | Default SMTP limits; configure custom SMTP for production. |
| Sync status `error` but playback fine | Backend/network problem; local library is unaffected — retry with **Sync now**. |
