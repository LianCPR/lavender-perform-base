# Lavender Music — Online Music Providers (Phase 08)

Phase 08 adds an optional, provider-independent online catalog on top of the
local-first player. The first authorized source is **Audius**; the architecture
is ready for other providers, but no other provider is registered or presented
as supported.

The local library remains the default. With no network connection, with online
music disabled, or when a provider fails, imported files and every Phase 01–07
screen keep working.

## 1. Goals and non-goals

**Goals**

- One common contract for authorized catalogs, with capability detection.
- Search, metadata, artwork and playback mapped into the existing `Track` model.
- Online results and saved online items visibly separate from local files.
- The existing queue, shuffle, repeat, Now Playing and mini player are reused.
- Provider code isolated from screens and from the local library.
- No secrets in the client, no scraping, no DRM or subscription bypass.

**Non-goals in this phase**

- Provider account linking (OAuth) and saving to a provider account.
- Offline downloads of provider content.
- Multiple simultaneous providers; one active provider per build.
- Provider-specific players. Playback adapters produce an authorized source for
  the one shared `expo-audio` engine.
- Syncing online saves through Supabase. Online saves are device-local for now.

## 2. Package layout

```
packages/music-providers/
├── src/
│   ├── types.ts          MusicProvider, capabilities, DTOs, playback source
│   ├── errors.ts         ProviderError, codes, user-facing copy
│   ├── registry.ts       register/get/list providers, active provider, on/off
│   ├── search.ts         fan-out search, dedupe, partial failures, local duplicates
│   ├── index.ts          public exports + Audius auto-registration
│   └── audius/
│       ├── client.ts     REST calls, throttling, 429 retry, error mapping
│       ├── map.ts        Audius → shared types, stable ids, stream URL, restrictions
│       ├── provider.ts   MusicProvider implementation + capability declaration
│       └── map.test.ts   mapper tests
└── src/search.test.ts    search/dedupe/duplicate-index tests
```

Dependency direction:

```
shared ← music-providers ← ui ← apps
                 ↑
          music-player (Track/ProviderPlaybackSource only)
```

`music-providers` depends only on `@lavender/shared`. It does not import UI,
library or player code. `packages/ui` owns the hooks and screens that consume a
provider. Provider adapters therefore stay replaceable and testable in Node.

## 3. Contracts

| Contract | Where | Responsibility |
| --- | --- | --- |
| `MusicProvider` | `types.ts` | Provider identity, docs URL, capabilities and optional operations. |
| `ProviderRegistry` | `registry.ts` | Registers providers, resolves the active provider, obeys the build flag. |
| `ProviderCapabilities` | `types.ts` | Search/metadata flags, artwork, playback kind, Home, personalization, auth and attribution. |
| `ProviderSearchService` | `search.ts` | Calls supported search methods, dedupes by stable id, keeps partial results. |
| `ProviderPlaybackAdapter` | `resolvePlayback` on `MusicProvider` | Resolves a fresh, authorized playable source for one track. |
| `ProviderMetadataMapper` | `audius/map.ts` | Maps provider payloads into `Track`, `ProviderAlbum`, `ProviderArtist`, `ProviderPlaylist`. |

`MusicProvider` methods are optional. `capabilities` is the single source of
truth: the UI checks it before rendering a search category, Home section, save
control or playback action. A provider can implement metadata without playback;
that is a legitimate configuration, not an error.

```ts
playback: 'stream' | 'preview' | 'none';
personalization: { saveToProvider: boolean; userLibrary: boolean };
authentication: 'none' | 'api_key' | 'oauth_pkce';
```

`ProviderPlaybackSource` carries a short-lived `uri`, MIME type, format and the
provider id. It is passed to the existing player; the player never knows which
provider produced it.

## 4. Active provider and configuration

`getActiveProvider()` returns one provider per build, or `null`:

| Variable | Default | Effect |
| --- | --- | --- |
| `EXPO_PUBLIC_ONLINE_MUSIC` | enabled | `off` disables online search, Home sections and playback resolution. Local music is untouched. |
| `EXPO_PUBLIC_ONLINE_PROVIDER` | `audius` | Selects a registered provider id. |
| `EXPO_PUBLIC_AUDIUS_API_BASE` | `https://api.audius.co/v1` | Override for a compatible proxy or test host. |

These are public build-time variables, never secrets. No provider API secret is
read by the client. See [provider-setup.md](provider-setup.md) and
[oauth-security.md](oauth-security.md).

## 5. Identity and duplicate rules

Every provider item has two identifiers:

- `Track.id` — namespaced, stable across sessions: `audius:track:<native id>`.
- `Track.providerTrackId` — the provider's own id, used in lookups and streams.

Albums, artists and playlists follow the same convention with
`providerAlbumId`, `providerArtistId`, `providerPlaylistId`. `Track.provider`
records the source. A local file never receives a provider value.

Rules:

- Two provider records are duplicates only when their namespaced ids match.
- Two tracks with the same title and artist are **not** assumed identical.
- Online results whose normalized `title + artist` match a local track are
  flagged and hidden from the online list with a note; the local file is kept as
  the playable, offline copy. Nothing is merged silently.
- Provider tracks cached for playback live in `LibraryState.onlineTracks`
  (max 80) without audio. Saved online items are separate lists of ids and
  metadata.

This is implemented in `search.ts` (`buildLocalDuplicateIndex`,
`partitionOnlineDuplicates`) and tested in `search.test.ts`.

## 6. Search flow

```
SearchScreen query ──► useOnlineSearch (350 ms debounce)
                         │ AbortController per query
                         ▼
                 searchProvider(provider, {query, limit, offset})
                         │ runs supported categories in parallel
                         ▼
              tracks / albums / artists / playlists + errors[]
                         │ dedupe by id, partial failures kept
                         ▼
                 OnlineSearchPanel (All / Local / Online chips)
```

- Online search starts at two characters and loads 10 results per page.
- `Load more` uses offsets supported by the provider; in-flight requests are
  aborted when the query changes.
- A category failure keeps the other categories. Total failure throws a
  `ProviderError`; the panel shows an `ErrorState` with retry when retryable.
- Rate-limit responses (HTTP 429) are retried once after `Retry-After`
  (bounded); a second 429 becomes `rate_limited` copy.
- The panel always labels results with the provider and attribution, and never
  mixes them into local sections.

## 7. Metadata and artwork

Audius payloads are mapped into the shared domain model:

- Track: title, artist, album, duration, artwork, permalink, handle, license,
  streamable flag and restriction reason.
- Album/playlist: album-like Audius playlists are separated from community
  playlists; playlist detail loads `/playlists/{id}/tracks` because the playlist
  object does not include tracks.
- Artist: profile, handle, artwork and top tracks (`/users/{id}/tracks`).
- Artwork: provider CDN URLs are used directly (480×480 fallback chain). No
  artwork bytes are persisted in library JSON.
- Placeholder palettes are deterministic per provider id, so a card keeps its
  look before/if artwork fails to load.

Metadata is cached only for tracks seen/saved in the current library, with a
cap of 80. Stream URLs are always dropped before persistence.

## 8. Playback adapter

The only playback path is:

```
player.startTrack(track)
  → PlayerHost resolveProviderTrack(track)
  → provider.resolvePlayback({track})
  → GET /tracks/{id} (fresh metadata and restriction check)
  → stable stream endpoint /tracks/{id}/stream?app_name=Lavender
  → audio.uri supplied to the one expo-audio engine
```

The stream URL is resolved at play time because the provider redirects to a
short-lived signed URL. The player uses the same queue, seek, next/previous,
shuffle and repeat logic as local files. See
[online-playback.md](online-playback.md).

If a track is not streamable, gated, or the provider refuses, the adapter throws
a `ProviderError('restricted' | 'unsupported' | ...)`. The UI shows the reason
and never marks the track as playing.

## 9. Unified library behavior

| Action | Storage | Notes |
| --- | --- | --- |
| Play an online track | `onlineTracks` metadata (no audio) | Keeps queue/recents resolvable after tab changes. |
| Save a track | `savedOnlineTrackIds` + cached metadata | Local bookmark, not a save at Audius. |
| Save an album/playlist or follow an artist | `savedOnlineAlbums`, `savedOnlinePlaylists`, `followedOnlineArtists` | Metadata only; no provider write. |
| Remove a saved online track | id list + cached metadata pruned by the 80-item cap | Does not delete anything at the provider. |

Saved online tracks join `LibraryProvider`'s merged catalog so Library, Search
and queue selectors can find them, but they keep `provider`/`providerTrackId`
and render with a provider badge. The Library `Online` filter explains that
online items stream and need a connection.

Provider-account saves (`personalization.saveToProvider`) remain `false`.

## 10. Errors

`ProviderError` codes: `offline`, `rate_limited`, `unauthorized`, `forbidden`,
`not_found`, `unsupported`, `restricted`, `unavailable`, `invalid_response`.

`describeProviderError()` maps each to a title, plain-language message and
whether retry is offered. Network failures distinguish offline when the browser
reports it; HTTP statuses map to the closest code; malformed JSON becomes
`invalid_response`. Provider failures are contained to their panel/sheet and
never crash the shell or stop local playback.

## 11. Adding a provider

1. Add `src/<provider>/client.ts` for requests and `<provider>/map.ts` for DTO
   mapping. Never expose raw provider payloads outside the package.
2. Declare accurate `capabilities`, `authentication` and `attribution`.
3. Implement only the supported methods; leave the rest undefined.
4. Return namespaced ids and stable `provider*Id` fields.
5. Register the provider in `src/index.ts`; keep one active provider per build.
6. Add mapper/search tests; no live network calls in unit tests.
7. Add setup and restrictions to the docs before enabling it.
8. Gate every UI control on capabilities, not on the provider name.

OAuth-based providers must also follow
[oauth-security.md](oauth-security.md); do not add a client secret to the app.

## 12. Verification

- `packages/music-providers` has 13 Node tests covering mapping, restriction
  flags, stream endpoint construction, playlist/album splitting, dedupe,
  partial failures and local duplicate detection.
- `node scripts/verify-audius.mjs` performs live read/search/trending/playlist
  and stream checks (requires network; not part of CI).
- Browser checks: online search, real playback with position advancing, saved
  online library, Home trending, non-streamable error copy.
- Full `typecheck`, `lint`, `test` and `build:web` pass. iOS playback and native
  provider behavior were not tested; see the Phase 08 report.
