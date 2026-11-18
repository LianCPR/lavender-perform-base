# Lavender Music — Architecture

Phases 01–05 established the foundation, shared design system, Home Screen, Now
Playing, and Browse, Search and Library. Phase 06 added real local playback and
imports; Phase 07 added optional Supabase accounts, sync and RLS; Phase 08 added
a provider-independent online catalog with Audius search, metadata and streaming.
Phase 09 adds measured listening history, an explainable taste profile, smart
recommendations and privacy controls. The app remains local-first: without an
account, network or provider it works exactly as before.

## Technology decisions

| Decision | Choice | Why |
| --- | --- | --- |
| App framework | **Expo SDK 58** (React Native 0.88, React 19.3) | One component tree and one design system for iOS and the web, with native materials on iOS. |
| Navigation | **Expo Router** (file-based routes in `src/app`) | Deep links, browser history and typed route conventions on both platforms. |
| Language | **TypeScript** (strict) | Shared domain types across app, UI and future engine packages. |
| Web rendering | **React Native Web** via Metro | Same components, no parallel CSS codebase. Web-specific behaviour lives in `.web.tsx` files. |
| Repo layout | **npm workspaces monorepo** | Packages are consumed from TypeScript source (`main: src/index.ts`), so design tokens can never drift between the two apps. |
| Styling | Token-driven inline styles (`StyleSheet`) | No styling runtime: tokens are typed, colocated and shared. CSS-only behaviour is limited to `backdrop-filter` on web. |
| Glass | `expo-blur` on native, `backdrop-filter` on web, one token set | Native materials on iOS; authentic translucency in the browser; identical hierarchy on both. |
| Icons | `@expo/vector-icons` (Ionicons) | Single dependency, works on iOS and web, no custom font pipeline. |
| Fonts | Platform system font (SF Pro / Segoe / system-ui) | Matches the Apple Music reference, nothing to download, no FOUT. |

Deliberately **not** installed in Phase 01: state libraries, networking clients,
databases, auth SDKs, animation frameworks, component libraries.

## Project structure

```
lavender-music/
├── apps/
│   ├── web/                  # Expo Router + react-native-web (responsive, desktop-first)
│   │   ├── app.json          # web-only config, output: single
│   │   ├── metro.config.js   # monorepo watchFolders / nodeModulesPaths
│   │   ├── tsconfig.json
│   │   └── src/app/          # providers + shared home/browse/search/library/design/now-playing routes
│   └── mobile/               # Expo Router iOS app (also runs on Android/web for previews)
│       ├── app.json          # bundleIdentifier, iPad support, userInterfaceStyle: automatic
│       ├── metro.config.js
│       ├── tsconfig.json
│       └── src/app/          # same shared route map, mobile composition
├── packages/
│   ├── design-system/        # tokens (color/type/spacing/geometry/layout/glass/
│   │                         #   icons/motion), theme builder, elevation,
│   │                         #   ThemeProvider, useTheme/useReducedMotion
│   ├── ui/                   # primitives (Text/Surface/Divider/Spacer/Icon),
│   │   ├── browse/           #   genre + mood tiles, discovery section wrapper
│   │   ├── buttons/          #   button family + ButtonBase
│   │   ├── feedback/         #   loading/empty/error/skeleton, empty library
│   │   ├── interaction/      #   Interactive (hover/press/focus/disabled)
│   │   ├── library/          #   filter row, sort menu, playlist grid
│   │   ├── music/            #   cards, rows, collection + playlist detail sheets
│   │   ├── online/           #   online search hook/panel, provider Home, detail sheet,
│   │   │                     #   saved-online Library section
│   │   ├── overlays/         #   Sheet (glass modal) + TextPromptSheet
│   │   ├── search/           #   SearchBar, SearchResultRow
│   │   ├── screens/          #   shared screens incl. design-system showcase
│   │   └── ...               #   glass chrome, app shell, navigation
│   ├── music-player/         # real expo-audio engine, queue/shuffle/repeat, session persistence
│   ├── music-library/        # catalog, search, persisted LibraryProvider, selectors,
│   │                         #   libraryStorage (web localStorage + native seam)
│   ├── music-providers/      # provider contract + registry, Audius client/mapper,
│   │                         #   search fan-out, provider errors
│   ├── personalization/      # pure history thresholds/merge, taste profile,
│   │                         #   recommendation scoring and daily mixes
│   ├── playlists/            # pure playlist operations
│   ├── backend/              # Supabase client, auth provider, repositories,
│   │                         #   sync engine + pure merge rules
│   └── shared/               # domain types, constants, formatting utilities
├── supabase/
│   ├── migrations/           # schema, functions, RLS (source of truth)
│   ├── seed.sql              # generated demo catalog metadata
│   └── tests/                # local PostgreSQL stub + RLS verification
├── scripts/                  # db-verify.sh, generate-catalog-seed.mjs
├── assets/
│   ├── artwork/              # reserved for real cover art
│   ├── icons/                # reserved for app icons / brand marks
│   └── fonts/                # reserved (system font is used in Phase 01)
└── docs/
    ├── architecture.md
    ├── design-system.md
    ├── design-tokens.md
    ├── components.md
    ├── backend-architecture.md
    ├── database-schema.md
    ├── authentication.md
    ├── synchronization.md
    ├── music-providers.md
    ├── provider-capabilities.md
    ├── provider-setup.md
    ├── oauth-security.md
    ├── online-playback.md
    ├── licensing-and-restrictions.md
    ├── personalization-architecture.md
    ├── recommendation-engine.md
    ├── listening-history.md
    ├── music-taste-profile.md
    ├── privacy-and-data-control.md
    ├── testing-report-phase-09.md
    ├── deployment.md
    └── workflow.md
```

### Dependency direction

```
shared  ←  design-system  ←  music-providers  ←  ui  ←  apps
   ↑            ↑                                  ↑
music-library ───┘                                 │
personalization ───────────────────────────────────┤
music-player ──────────────────────────────────────┤
playlists ─────────────────────────────────────────┤
backend ───────────────────────────────────────────┘   (ui → backend;
                                                        backend never imports
                                                        ui, library or player)
```

- `shared` has no dependencies and holds domain types (`Track`, `Album`,
  `Playlist`, `ArtworkPalette`).
- `design-system` depends on `shared` for the palette type and on React Native
  for `Platform`/`useColorScheme`.
- `ui` depends on the design system, the domain packages and Expo Router (peer).
  It owns every reusable component and the presentation-level screens.
- `music-providers` depends only on `shared`. It owns provider contracts,
  registry, mapping and network clients; UI consumes its capabilities and never
  imports provider-specific payloads.
- `personalization` depends only on `shared`. It is pure domain logic for
  measured history, taste aggregation and transparent recommendations; storage,
  playback and network remain in their existing packages.
- Apps depend on `ui` only. They own routing, `app.json`, Metro configuration
  and native composition — that is what makes `apps/web` and `apps/mobile`
  replaceable without touching the design system. Each app has a thin `design.tsx`
  route that mounts the shared `DesignSystemScreen`.

### Design system as a layer

The design system is a layer inside the existing architecture, not a separate
app or stylesheet:

- `packages/design-system` owns every value (tokens) and the theme resolver
  (scheme + reduced motion). Nothing else defines colors, type, spacing, radii,
  shadows, breakpoints or glass materials.
- `packages/ui` owns behaviour: one pressable primitive (`Interactive`), one
  blur implementation (`GlassSurface`), one typography implementation (`Text`),
  and the components composed from them.
- Both apps mount the same screens, so `/design` demonstrates exactly the
  components shipping on iOS and web.

### Why screens live in `packages/ui`

The four foundation screens are shared between iOS and web on purpose: they are
responsive, not mobile-only. Apps stay thin route files, which keeps one visual
implementation instead of two drifting copies. When a phase needs genuinely
platform-specific screens, the app can add a `.web.tsx`/native override inside
its own `src/app` without touching the shared screens.

## Runtime composition

`apps/*/src/app/_layout.tsx` is the only place providers are wired:

```
SafeAreaProvider
└── AuthProvider           (optional Supabase session; guest mode when unconfigured)
    └── ThemeProvider      (mode: system | light | dark → resolved AppScheme)
        └── LibraryProvider (catalog + persisted favorites/playlists/recents/prefs)
            └── PlayerHost  (binds the player to the library + active provider)
                └── PlayerProvider (single expo-audio engine + playback state)
                    └── PersonalizationProvider (measured history + taste/model)
                        └── SyncHost (metadata sync + status; no-op without an account)
                            └── AppShell (navigation + mini player + background)
                            └── Stack (Expo Router screens)
```

- **ThemeProvider** resolves the scheme and exposes tokens via `useTheme()`.
- **LibraryProvider** owns all listener state: favorites, user-created playlists,
  recently played tracks, recent searches, sort/view preferences, measured
  listening history and personalization settings. It reads once on mount and
  writes through `libraryStorage`.
  - Web persists to `localStorage['lavender.library']` (JSON, versioned and
    sanitized on read). A native adapter can be registered with
    `setLibraryStorage({ read, write })` without changing the provider.
  - Curated catalog playlists stay read-only; only listener playlists are
    editable. Search is a pure function (`searchCatalog`) over the same catalog
    plus the merged playlist list.
- **PlayerHost** supplies `resolveTrack`, the merged track list and the active
  provider's playback resolver to the player, keeping `music-player`
  independent of both `music-library` and `music-providers`.
- **PlayerProvider** holds `currentTrack`, `isPlaying`, real position/duration,
  queue, shuffle, repeat and volume, and owns the one `expo-audio` player
  (`engine.ts`). The Home Mini Player and Now Playing read the same context, so
  a queue change updates both surfaces immediately. See
  [audio.md](audio.md) for the engine, import pipeline and platform limits.
- **PersonalizationProvider** observes the player, records measured sessions
  after the listening threshold, and derives the taste profile and recommendation
  model. It writes only through `LibraryProvider`. Home and `/personalization`
  consume the same model; hiding a row is a persisted local setting.
- Playback session is persisted to `localStorage['lavender.player']` (native:
  document-directory JSON) and restored paused, without autoplay.
- **AppShell** is the responsive frame: flush minimal sidebar on desktop, glass rail on tablet, floating glass tab bar on phone,
  plus the floating mini player.

## Data flow for a tap

1. A card, search result or row calls `player.play(track, queue)` or
   `player.selectQueueTrack(index)` — always with a queue from the catalog.
2. `PlayerProvider` updates the active track and queue. Local tracks use their
   stored URI; online tracks are resolved through the provider adapter first.
3. `AppShell` and `NowPlayingScreen` read that same context and update together.
4. `AppShell` records the current track into `LibraryProvider` (recently played)
   once per track change, while `PersonalizationProvider` separately measures
   listening and commits a history session only after the threshold.
5. Browse/Search open detail sheets; Library edits playlists through pure
   `@lavender/playlists` operations, and the provider persists the result.
6. `LibraryProvider` derives nothing; Home and `/personalization` call the pure
   taste and recommendation functions, so the rules stay inspectable and
   testable.

Audio comes from imported local files, persisted as IndexedDB blobs on web and
copied documents on iOS. Persistence is the local library state, the playback
session and the theme preference (stored in
`@lavender/design-system/themeStorage`). Metadata sync is opt-in: `SyncHost`
compares library snapshots and calls `runSyncPass`, which only talks to
Supabase when a session exists.

## Extending for later phases

| Area | Where it plugs in |
| --- | --- |
| Audio engine | Implemented in `music-player/engine.ts` on `expo-audio`; new sources only need to supply `Track.audio.uri`. |
| Library ingestion | Replace `demoCatalog` with a repository inside `music-library`; keep `libraryStorage` for local state and add a native adapter. |
| Backend | Implemented: `supabase/` owns schema/functions/RLS; `packages/backend` owns client, repositories and the sync engine. Screens stay UI-only. |
| Auth & subscriptions | Implemented: `AuthProvider` wraps both roots; `/account` hosts the flows. New auth features belong in `packages/backend/src/auth`. |
| Streaming | Implemented: `MusicProvider` + registry in `music-providers`, Audius adapter, `PlayerHost` resolver. Additional providers declare capabilities and register without changing screens. See [music-providers.md](music-providers.md). |
| Personalization | Implemented: pure rules in `personalization`, local persistence and settings in `music-library`, listener/model in `ui`, history table and sync in `backend`. New signals belong in the pure package before any UI change. |

Rules of thumb:

- Add a token before adding a style value.
- Add a component to `packages/ui` only when two screens (or both apps) need it.
- Never import an app route from a package; navigation is data (`href`).
- Keep platform forks to `.web.tsx` / `.native.tsx` files with identical props.
