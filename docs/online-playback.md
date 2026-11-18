# Lavender Music — Online Playback

Online playback uses the same player, queue and UI as local files. There is no
per-provider player. A provider adapter resolves an authorized source and hands
its URI to the existing `expo-audio` engine.

## 1. Pipeline

```
Online row / card
  │ library.cacheOnlineTracks(queue) + library.recordPlayed(track)
  ▼
PlayerProvider.play(track, queue)
  │ one shared queue/shuffle/repeat state
  ▼
PlayerHost.resolveProviderTrack(track)
  │ only when track.provider is set
  ▼
provider.resolvePlayback({ track })
  │ 1. GET /tracks/{providerTrackId}   (fresh metadata)
  │ 2. check streamable / gated / deleted
  │ 3. return stable stream endpoint + external link
  ▼
engine.replace({ uri }) → the single expo-audio player
  ▼
Mini player + Now Playing (same context, same position)
```

For local files the resolver is skipped and `Track.audio.uri` is used exactly as
in Phase 06.

## 2. Why the stream URL is resolved at play time

Audius' stream endpoint redirects to a signed media URL that expires quickly
(observed around five minutes). Persisting it would produce "expired URL"
failures after restore or a long pause. Therefore:

- Only the stable endpoint is constructed:
  `https://api.audius.co/v1/tracks/{id}/stream?app_name=Lavender`.
- Each play and resume re-resolves through `resolvePlayback`, which also
  re-reads the track so deleted/gated content cannot be played from a stale
  search result.
- `Track.audio` is never written to the library or player session for online
  tracks; library sanitisers strip it.

## 3. Shared playback features

| Feature | Online behavior |
| --- | --- |
| Play / pause | Same engine and `PlayerStatus`. |
| Seek | Same slider/engine; works once the stream is seekable. |
| Next / previous | Same queue ordering. |
| Queue | Online tracks join `onlineTracks` and stay resolvable after caching. |
| Shuffle / repeat | Unchanged; `nextIndexFor` owns ordering. |
| Now Playing | Provider label, "Authorized stream", open-original link and remote artwork. |
| Mini player | Same shared state; provider track shown while browsing. |
| Session restore | Queue/ids restore paused; each online track re-resolves on play. |

There is no simulated success path. If resolution fails, no playback state is
reported as playing.

## 4. Restrictions and error handling

The adapter refuses a track when:

- `is_streamable === false` (no authorized full stream), or a preview-only item;
- `is_stream_gated === true` / `access.stream === false` (artist or provider
  gating, including subscription-only content);
- the track was deleted or the provider returns 404;
- the track belongs to a different provider id.

Messages are specific and honest:

| Case | Message |
| --- | --- |
| Subscription gate | "This track needs an Audius subscription. Lavender will not bypass it." |
| Artist-gated | "The artist restricted streaming of this track on Audius." |
| Region (when supplied) | "This track is not available in your region according to Audius." |
| No authorized stream | "Audius does not offer an authorized stream for this track." |
| Removed | "This item was removed or made private at the provider." |
| Network/outage | Offline/provider-unavailable copy with retry where sensible. |

The UI displays the reason in the player/Now Playing area and keeps the app
usable. A retry action re-resolves the source; "Open original" links to the
provider page. This was exercised in the browser with a non-streamable search
result: it showed the authorized-stream message and did not advance position.

## 5. Offline and local-first behavior

- Online tracks are **online-only**. No provider in Phase 08 authorizes offline
  downloads, so the app never claims offline availability and never downloads
  audio.
- Cached metadata (max 80 tracks) lets the library and queue render, but playback
  requires a connection and an authorized source.
- If the session expires, the provider is unreachable or the app is offline,
  resolution fails with a clear error. Imported local files keep playing; online
  items remain visible with the failure message.
- The Library `Online` filter states: "Online tracks need a connection and are
  never available offline unless the provider explicitly allows it."
- With `EXPO_PUBLIC_ONLINE_MUSIC=off`, online playback resolution is refused and
  no online UI is mounted.

## 6. Artwork and metadata during playback

- Remote artwork URIs are rendered by `Artwork`/`ArtworkCard`; failures fall back
  to the deterministic palette.
- Artwork is not downloaded into the library. Only the URL is stored.
- Duration comes from the provider metadata and is corrected by the engine's
  real duration when available.
- Now Playing shows the provider name, `AUDIUS` badge, "Authorized stream" and an
  external link; the library/queue rows keep provider badges so online items are
  never mistaken for local files.

## 7. Platform notes

- **Web (verified)**: Chromium loaded a real Audius stream (`audio/mpeg`, HTTP
  206 range), the Now Playing position advanced, and pause/resume reused the
  same engine. A direct-stream smoke test retrieved 1,024 bytes with 206.
- **iOS (not verified)**: `expo-audio` receives the same HTTPS stream URI, but
  no simulator/device was available. Background audio, lock-screen metadata and
  interruption behavior for provider streams remain unverified. Native network
  policy (`ATS`) allows HTTPS; no provider SDK is required for Audius.
- **CORS**: Audius API returns permissive CORS for the browser; a future
  provider without CORS needs a backend proxy (and must keep secrets there).

## 8. Future provider adapters

If a provider cannot return a raw authorized URL:

- **Spotify** requires its Web Playback SDK (web) or App Remote SDK (mobile) and
  a Premium account. Those are separate playback transports, not a URI for the
  shared engine; supporting them means a deliberate adapter and UI that clearly
  communicates the requirement.
- **Apple Music** uses MusicKit/AVPlayer with a subscription; it does not expose
  files for a custom engine.
- **YouTube** must use the official IFrame video player; separating audio or
  background playback is prohibited, so it cannot join the shared audio engine.
- **Preview-only providers** (for example Deezer without a partnership) may only
  be presented as clips, never as full playback.

Until such an adapter exists and is authorized, the UI must not show those
providers as connected or playable.

## 9. Verification checklist

- [x] Real stream resolved for a streamable Audius track.
- [x] Position advanced in the web UI; shared Now Playing/mini player consistent.
- [x] Queue contained provider tracks with IDs preserved.
- [x] Non-streamable track refused with an explanatory message.
- [x] Local playback unaffected when online resolution fails.
- [x] Library/queue keep online vs local identities distinct.
- [ ] iOS device/simulator playback (not available in this environment).
- [ ] Offline download/playback (not authorized by the provider; not built).
- [ ] Background audio/lock screen for provider streams on iOS (unverified).
