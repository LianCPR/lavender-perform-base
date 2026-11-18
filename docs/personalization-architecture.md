# Personalization architecture

Phase 09 adds a local-first personalization layer on top of the Phase 07 library
and Phase 08 provider work. It records what was actually played, derives an
explainable taste profile, and turns that profile into dismissible Home rows and
daily mixes. It does not add a second player, library, auth system or database.

## Layers

```
@lavender/shared
  Track.genre / Track.mood

@lavender/personalization (pure)
  history.ts     measured sessions, thresholds, remote merge
  taste.ts       artist / genre / mood / track / playlist aggregates
  recommend.ts   transparent scoring, sections, daily mixes, playlists

@lavender/music-library
  LibraryProvider: persisted history, settings, tombstones, clear cutoff
  libraryStorage v5: sanitized local state

@lavender/ui
  PersonalizationProvider: player → history tracker, profile + model
  PersonalizationScreen: history, taste, recommendations, privacy
  PersonalizedSections: Home rows, daily mixes, hide/refresh

@lavender/backend
  listening_history table + repository
  SyncHost / runSyncPass: additive history sync, tombstones, clear cutoff
```

`@lavender/personalization` depends only on `@lavender/shared`. It has no React,
network, player, storage or provider imports, so every rule is unit-testable and
can be reused by a future native surface or server job.

## Provider composition

```
AuthProvider
└── ThemeProvider
    └── LibraryProvider          (history + settings persisted locally)
        └── PlayerHost           (catalog/provider playback resolution)
            └── PersonalizationProvider
                └── SyncHost     (metadata sync, including history)
                    └── AppShell + Stack
```

`PersonalizationProvider` is inside `PlayerHost`, so it can observe the one
shared player. `SyncHost` is inside it only for composition convenience; sync
reads history through `LibrarySyncSnapshot` and never through the UI context.

## Data flow

1. A row calls `player.play(track, queue)`.
2. `PersonalizationProvider` starts a session only while `isPlaying` is true.
3. It counts small forward position deltas (≤ 3 s), so seeks, pauses, buffering
   and failed streams do not inflate a listen.
4. When the measured time crosses `listenThreshold(duration)`, the session is
   committed to `LibraryProvider.recordListen`. It is updated at most every 15 s
   and once more when the track ends or changes.
5. `LibraryProvider` persists v5 state under `lavender.library`, sanitizes it on
   read, and caps it at 300 sessions.
6. `buildTasteProfile` derives counts from those sessions.
7. `buildRecommendations` scores the local catalog and returns sections, daily
   mixes and matching playlists.
8. Home and `/personalization` render the same model. Hiding a row persists its
   id in the device-local settings.
9. When signed in, `SyncHost` detects history changes, debounces a pass, and
   `runSyncPass` unions sessions with `listening_history` by session id.

## Storage

`LibraryState` is version 5 and sanitizes every read. Phase 09 adds:

```ts
listeningHistory: ListeningHistoryEntry[]; // newest first, max 300
historyDeletedIds: string[];               // local tombstones, max 200
historyClearedAt: string | null;           // newest local clear
personalization: {
  enabled: boolean;
  dismissedRecommendations: string[];
};
```

Every history entry is metadata only: track id, title, artist/album labels,
duration, measured listen, source (`local` / `online`), optional provider ids,
genre, mood, palette, remote artwork URL and completion. Audio, local paths,
blob URIs and `data:` artwork are never stored. Older v4 state loads with empty
history and personalization enabled.

## Boundaries and failure behavior

- With no history, recommendations are an explicitly labelled starting point,
  not fake personalization.
- With no provider/network, local history and recommendations still work; online
  stream failures never become listens.
- Disabling personalization stops recording and hides the taste profile and
  recommendation model. Existing history remains until deleted.
- History sync is additive and longest-listen-wins. A failure keeps the local
  history; the next sync retries idempotently.
- No copyrighted audio is downloaded or copied for analysis.
