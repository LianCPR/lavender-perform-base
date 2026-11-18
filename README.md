# Lavender Music

A personal music streaming and library application — Apple Music's elegance with
Spotify's structure. Built with Expo + TypeScript for iOS and the responsive web
from one shared design system.

> **Status: Phase 09 — Personalization & smart recommendations.**
> The local-first player and optional Supabase accounts still work unchanged.
> Lavender now records measured listening history, builds an explainable taste
> profile, and personalizes Home with dismissible recommendations and daily
> mixes. Everything is local-first; audio is never uploaded.

## Quick start

```bash
npm install

npm run dev        # responsive web app on http://localhost:8081
npm run ios        # iOS app (macOS + Xcode; also: npm run dev:mobile)

npm run typecheck  # all apps and packages
npm run lint
npm test           # personalization, sync and provider tests (node:test)
npm run test:db    # migrations + seed + RLS on throwaway PostgreSQL
npm run build:web  # static web export
```

Sync is optional. Copy `.env.example` to `.env` and add your Supabase project
URL + **anon** key to enable accounts; without them the app runs entirely
local. See [Deployment](docs/deployment.md).

Online search and streaming are enabled by default with Audius and need no
credentials. Set `EXPO_PUBLIC_ONLINE_MUSIC=off` for a purely local build. See
[Provider setup](docs/provider-setup.md).

Open `/design` (sidebar footer → **Design system**, or the palette icon in the
mobile header) for the interactive design-system showcase.

## What is here

```
apps/web        Expo Router + react-native-web, responsive desktop layout
apps/mobile     Expo Router iOS app (iPad gets the sidebar layout)
packages/
  design-system tokens, theme provider (light/dark/system + reduced motion),
                glass materials, elevation
  ui            primitives, buttons, navigation, music UI, feedback states,
                app shell, shared screens
  music-player  real expo-audio engine, queue/shuffle/repeat, session persistence
  music-library demo catalog, local file import + metadata, persisted library, selectors
  music-providers provider-independent online catalog contract + Audius adapter
  personalization measured history, taste profile, recommendation engine
  playlists     pure playlist operations
  shared        domain types, constants, formatting helpers
  backend       Supabase client, auth provider, repositories, sync engine
supabase/       SQL migrations, generated catalog seed, RLS tests
scripts/        db-verify.sh · generate-catalog-seed.mjs
assets/         reserved for artwork, icons, fonts
docs/           architecture · design system · tokens · components ·
                audio · backend · schema · auth · sync · personalization ·
                deployment · workflow
```

## Documentation

- [Architecture](docs/architecture.md) — stack decisions, package boundaries,
  data flow, how later phases extend the foundation.
- [Design system](docs/design-system.md) — principles, theme behaviour, Liquid
  Glass variants, interaction language, responsive rules, conventions.
- [Design tokens](docs/design-tokens.md) — every color, type, spacing, geometry,
  elevation, layout, glass, icon and motion value.
- [Audio & playback](docs/audio.md) — engine architecture, local import, formats,
  persistence, platform limits and what was verified.
- [Online music providers](docs/music-providers.md) — provider architecture,
  capabilities, identity rules and the extension path.
- [Provider capabilities](docs/provider-capabilities.md) — comparison matrix and
  why each evaluated provider is or is not implemented.
- [Provider setup](docs/provider-setup.md) — Audius setup, optional variables,
  future provider prerequisites and secret rules.
- [OAuth & security](docs/oauth-security.md) — credential posture, future OAuth
  design, token storage and callback validation.
- [Online playback](docs/online-playback.md) — stream resolution, restrictions,
  offline behavior and verified platform results.
- [Licensing & restrictions](docs/licensing-and-restrictions.md) — provider
  terms, attribution, caching and commercial-use limits.
- [Components](docs/components.md) — props, states and usage for each component.
- [Backend architecture](docs/backend-architecture.md) — why Supabase, package
  boundaries, local-first data flow, security posture.
- [Database schema](docs/database-schema.md) — tables, ids, indexes, triggers,
  RLS policies and how they map to local models.
- [Authentication](docs/authentication.md) — sign-up/in/out, session restore,
  password reset, storage adapters and limitations.
- [Synchronization](docs/synchronization.md) — what syncs, last-write-wins
  rules, migration of local data, offline behavior, limitations.
- [Deployment](docs/deployment.md) — Supabase setup, env vars, web/native
  release steps, verification checklist, operations.
- [Personalization architecture](docs/personalization-architecture.md) — package
  boundaries, tracker flow, storage and provider composition.
- [Recommendation engine](docs/recommendation-engine.md) — scoring, sections,
  daily mixes, playlists, dismissal and honest fallback.
- [Listening history](docs/listening-history.md) — thresholds, measurement,
  search/delete, sync and limitations.
- [Music taste profile](docs/music-taste-profile.md) — aggregates, trends,
  favorites, playlists and reset behavior.
- [Privacy and data control](docs/privacy-and-data-control.md) — toggles,
  deletion, sync metadata, RLS and what is never collected.
- [Phase 09 testing report](docs/testing-report-phase-09.md) — automated checks,
  browser verification, screenshots and remaining gaps.
- [Workflow](docs/workflow.md) — install/run commands, how to add screens,
  components and packages, QA checklist.

## Accounts and sync

Open **Account** (sidebar footer, or the person icon in the mobile header).
Create an account or sign in; playlists, favorites, recents and preferences
sync in the background with a status indicator and a manual **Sync now**.
Imported files stay on their device and show as "not on this device"
elsewhere. Guest mode is always available and is the default.

## Online music

Search includes an **Online · Audius** scope with tracks, albums, artists and
playlists, clearly separated from local results. Saving an online item adds it
to the unified Library (filter **Online**) as a local bookmark; following an
artist and saving albums/playlists are supported metadata-only actions. Home
shows Audius trending tracks and playlists when the catalog responds.

Playback uses the one shared player, queue, shuffle and repeat. Stream URLs are
resolved at play time because Audius redirects to a short-lived signed URL, so
they are never persisted. Gated, subscription-only, region-restricted or
removed tracks are refused with a clear message rather than simulated. Online
tracks are **not** available offline; imported files keep working when the
provider is unreachable. See [Online playback](docs/online-playback.md).

Provider-account saves, offline downloads and additional providers are not
implemented. Audius is the only enabled source; its limits and the other
providers evaluated are documented in
[Provider capabilities](docs/provider-capabilities.md).

## Personalization

Open **Personalization** from Home’s “Your history” action or Account. Lavender
records a session only after real measured playback crosses a 6–30 second
threshold; seeking and tapping a row do not count. The screen shows your artist,
genre, mood and track profile, searchable history with individual delete,
delete-all and reset controls, and the same recommendation rows used on Home.

Recommendations name their real signal, can be hidden or restored, and refresh
with a new daily seed. Daily mixes are built only after real history exists;
without it the app shows an explicit starting point rather than invented data.
Turn personalized recommendations off to stop recording and hide the profile.

When signed in, history metadata (never audio) syncs additively by session id.
See [Privacy and data control](docs/privacy-and-data-control.md) and
[Listening history](docs/listening-history.md).

## Playing real music

Library → **Import music** adds files from the device (browser storage on web,
a copied document on iOS). Everything after that — Now Playing position and
duration, mini player, queue, shuffle, repeat — is driven by the real audio
engine. The demo catalog stays silent until a file is imported, and says so. Online
streams are a second, clearly labelled source on top of the same engine.

## Design principles

1. **Neutral foundation.** Grayscale surfaces carry the interface; lavender and
   pink appear only on accents, selection, progress, favorites and one hero.
2. **Intentional glass.** Blur is a material hierarchy, not decoration.
3. **Mixed geometry.** Nearly square artwork, softly rounded cards, pill chrome.
4. **Light appearance first.** Light is the initial mode; System and Dark remain available.
5. **Shared by construction.** iOS and web consume the same tokens and components.
