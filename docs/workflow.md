# Lavender Music — Workflow

## Requirements

- Node.js ≥ 20 (verified on Node 22.23.2, npm 12)
- npm 10+ (workspaces are npm workspaces)
- iOS: macOS with Xcode + iOS Simulator (or Expo Go on a device)

## Install

```bash
npm install
```

One install at the repo root installs both apps and all packages — do not run
`npm install` inside `apps/*` or `packages/*`.

## Run

```bash
# Responsive web app (http://localhost:8081)
npm run dev            # alias of dev:web
npm run dev:web

# iOS app (Metro on :8082, opens the simulator)
npm run ios
npm run dev:mobile     # Expo dev server; press i for iOS, a for Android, w for web

# Checks
npm run typecheck      # every package + app
npm run lint
npm run qa             # typecheck + lint
npm test               # personalization + sync + provider tests
npm run test:sync      # backend sync merge tests only
npm test --workspace @lavender/music-providers  # provider unit tests only
npm test --workspace @lavender/personalization  # history/taste/recommendation tests only
npm run test:db        # migrations + seed + RLS on a throwaway PostgreSQL
npm run seed:catalog   # regenerate supabase/seed.sql from the demo catalog

# Static web export
npm run build:web
```

`test:db` expects PostgreSQL binaries on PATH or in `PGBIN` (e.g.
`PGBIN="/c/Program Files/PostgreSQL/18/bin" npm run test:db`). It creates a
throwaway cluster under `.local-pg/` and stops it afterwards.

Online music is on by default through Audius. No key is needed; set
`EXPO_PUBLIC_ONLINE_MUSIC=off` for a local-only build. A live smoke test of the
provider (network required, not part of `npm test`):

```bash
node scripts/verify-audius.mjs
```

## Optional backend

Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` +
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon key only — never the service-role key)
to enable accounts and sync. See [Deployment](deployment.md).

Both apps default to Metro port `8081`; Expo automatically picks the next free
port (usually `8082`) for the second server, so they can run side by side.

## Adding a package

1. Create `packages/<name>/package.json` with `"main": "src/index.ts"` and
   `"types": "src/index.ts"`.
2. Add a `tsconfig.json` extending `../../tsconfig.base.json` with
   `"include": ["src"]` and a `typecheck` script.
3. Add the path alias to the root `tsconfig.base.json` **and** to both app
   `tsconfig.json` files, plus a `"*"` dependency in the apps that use it.
4. Import it as `@lavender/<name>`.

## Adding a provider

1. Read [music-providers.md](music-providers.md) and
   [provider-capabilities.md](provider-capabilities.md); confirm the provider's
   official terms permit the intended playback and caching.
2. Add a client + mapper under `packages/music-providers/src/<provider>/` and
   declare truthful capabilities.
3. Register it in `packages/music-providers/src/index.ts`; select it with
   `EXPO_PUBLIC_ONLINE_PROVIDER`.
4. Keep secrets out of `EXPO_PUBLIC_*`; OAuth/token work belongs in the backend
   per [oauth-security.md](oauth-security.md).
5. Add mapper/search tests and documentation before enabling the provider.

Never present a provider as connected or playable without an authorized source.

## Adding a screen

1. Add the route file in `apps/web/src/app/<name>.tsx` and
   `apps/mobile/src/app/<name>.tsx` (thin: imports the screen from `@lavender/ui`).
2. Implement the screen in `packages/ui/src/screens/<Name>Screen.tsx` using
   `Screen`, `SectionHeader` and the grid primitives.
3. If it is a primary destination, add it to `APP_NAV_ITEMS` in
   `packages/ui/src/navigation.ts` (both the tab bar and sidebar read it).
4. Export the screen from `packages/ui/src/index.ts`.

## Adding a component

- Only add to `packages/ui` when more than one screen needs it.
- Compose `GlassSurface` instead of writing new blur code.
- Read colors/spacing/radius/typography from `useTheme()`; never hardcode a hex,
  px radius or font size.
- If the API differs per platform, create `Foo.tsx` (native) and `Foo.web.tsx`
  with **identical props and exported types**.
- Every interactive component needs `accessibilityRole`, a label, and a pressed
  state.

## Changing tokens

1. Primitive hex values: `packages/design-system/src/tokens/palette.ts`.
2. Semantic mapping: `packages/design-system/src/theme/colors.ts`.
3. Glass materials: `packages/design-system/src/theme/glass.ts`.
4. Artwork gradients: `packages/design-system/src/theme/artwork.ts`.
5. Typography/spacing/radius/motion: `packages/design-system/src/tokens/*`.

Never bypass tokens in a component; if a value is missing, add a token.

## QA checklist for a phase

```bash
npm run typecheck
npm run lint
npm run build:web        # static export must succeed before hosting work
```

Then verify manually:

- Light, dark and system themes (sidebar/tab theme control).
- Compact (≤ 767px), tablet (768–1023px) and desktop (≥ 1024px) layouts.
- Navigation between all four primary routes on web (`/`, `/browse`, `/search`,
  `/library`) and the contextual Now Playing route (`/now-playing`).
- Home Mini Player and Now Playing display the same `PlayerProvider` track,
  progress and play/pause state.
- Mini player and tab bar never overlap scrollable content.
- Online: search shows provider results separately from local ones; a saved
  online item appears under Library → Online; a streamable track advances its
  position; a non-streamable track shows an error instead of playing.
- Offline/local-only: with `EXPO_PUBLIC_ONLINE_MUSIC=off` (or the network
  blocked), local import and playback still work and online failures are
  contained.
- Personalization: play a 30-second real track past its threshold; Recently
  Played and the history row show the measured listen; a 3-second tone does not.
  Recommendations name a real artist/genre; hiding a row persists across reload.
- Privacy: turning personalization off stops recording, hides the taste profile
  and recommendation rows, and leaves history available for deletion. Delete one
  and delete-all return the app to the honest “Start here” state.
- No `console.error` in the browser or Metro logs.

Platform checks that cannot run on Windows: `npm run ios` needs macOS/Xcode. The
mobile app's TypeScript and Expo config are still validated by `typecheck` and
`expo-doctor` on any OS.

## Conventions

- TypeScript strict; no `any`, no non-null assertions in app code.
- Imports use workspace names (`@lavender/ui`), never relative `../../packages`.
- Files: components `PascalCase.tsx`, hooks `useThing.ts`, tokens lowercase.
- One exported concept per file; no barrel files inside a package except its
  `src/index.ts`.
- Phase scope lives in `docs/architecture.md`; do not add Phase 02+ code early.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Unable to resolve @lavender/ui` | Run `npm install` at the repo root; check the package's `main` and the app's `tsconfig` paths. |
| Metro serves stale package code | Restart Metro with `--clear` (`npx expo start --clear` inside the app). |
| `useTheme must be used inside <ThemeProvider>` | The screen is rendered outside the root layout; wrap it in `apps/*/src/app/_layout.tsx`. |
| Glass looks flat on Chrome | `backdrop-filter` requires a non-opaque element behind it; make sure the content behind the surface is rendered (not a plain white page). |
| Online search says the provider is unavailable | Check the network and `EXPO_PUBLIC_AUDIUS_API_BASE`; run `node scripts/verify-audius.mjs`. Local music is unaffected. |
| An online row refuses to play | The track may be gated, subscription-only, region-restricted or removed. Lavender does not bypass provider restrictions. |
| Expo SDK version mismatch | Use `npx expo install --check` inside the app; dependency versions are pinned to SDK 58. |
