# Lavender Music — Licensing & Restrictions

This document records the legal and technical limits of each evaluated provider
and how Lavender complies. It is an engineering summary, not legal advice.
Provider terms change; verify the linked documents before shipping or enabling a
provider.

## 1. Non-negotiable rules

- Only use documented, authorized APIs and playback sources.
- Never scrape Spotify, Apple Music, YouTube or any other service.
- Never bypass DRM, paywalls, subscriptions, geographic blocks or artist gating.
- Never extract or download protected audio, or use unofficial download
  endpoints.
- Never present metadata-only access as playable audio.
- Respect provider attribution, caching and storage limits.
- Keep provider credentials out of the client and repository.

Lavender enforces these in code: gated/non-streamable tracks are refused, stream
URLs are not persisted, no audio is downloaded, and no provider account is
written without OAuth.

## 2. Audius (implemented)

**Documents**

- API docs: <https://docs.audius.co/api>
- API terms: <https://audius.co/documents/ApiTerms.pdf>
- Terms of Use / Open Music License overview:
  <https://audius.co/documents/TermsOfUse.pdf>
- SDK/plans: <https://docs.audius.co/sdk/>

**What is permitted**

- Read/search/trending/metadata and streaming of streamable tracks through the
  documented API (`/tracks/{id}/stream`).
- Free plan: 10 requests/second, 500,000 requests/month. Lavender spaces requests
  by 130 ms, caps page size, retries one 429 with `Retry-After`, and does not
  bulk-harvest the catalog.
- Tracks are published under the Audius Open Music License or one of six
  Creative Commons licenses chosen by the creator. API access is on by default
  unless the artist opts out; gated/private tracks must be respected.

**Attribution and links**

- Search shows "Online · Audius", "Powered by Audius · Open catalog" and links to
  <https://audius.co>.
- Rows and Now Playing show the `AUDIUS` badge; Now Playing offers "Open
  original" to the track page.
- Track metadata keeps the creator name and handle.

**Caching**

- API Terms permit only session-based caching to the extent necessary to operate
  the app; cached content must become unavailable when the session ends.
- Lavender stores online **metadata** for at most 80 tracks (queue/library
  continuity) and saves ids/metadata for explicit local bookmarks. It stores no
  audio and no stream URLs. This is metadata-only and bounded; it should be
  reviewed if the app moves to a persistent multi-session cache.
- Deleting a saved item removes its id; cached metadata ages out under the cap.

**Restrictions**

- Subscription-gated, artist-gated, region-restricted, deleted or
  non-streamable tracks are refused with an explanation. No preview is presented
  as a full track.
- Audius API Terms govern commercial use of the API/OML; this project does not
  assert commercial clearance beyond those terms.
- Write operations (favorite/upload/playlist) require an API key and OAuth; not
  implemented.

## 3. Spotify (evaluated, not implemented)

**Documents**

- Developer Policy: <https://developer.spotify.com/policy>
- Developer Terms: <https://developer.spotify.com/terms>
- Scopes: <https://developer.spotify.com/documentation/web-api/concepts/scopes>
- Web Playback SDK:
  <https://developer.spotify.com/documentation/web-playback-sdk>

**Key restrictions**

- Streaming sound recordings is Premium-only; the `streaming` scope is for the
  Web Playback SDK and requires a Premium account.
- Streaming applications may not be commercial (limited exceptions exist for
  non-streaming apps).
- Metadata/cover art must be attributed with Spotify marks and linked back;
  they may not be offered as a standalone service.
- Do not store Spotify content indefinitely; local caching is limited to
  temporary metadata/cover art, and conditional downloads only for Premium.
- Development-mode apps are limited to allowlisted users and quota; do not
  assume production access.
- No client secret in the app; token exchange/refresh server-side.

**Status**: no credentials, no SDK, no playback. Spotify is documented as
unavailable, not partially integrated.

## 4. Apple Music (evaluated, not implemented)

**Documents**

- Apple Music API: <https://developer.apple.com/documentation/applemusicapi>
- MusicKit: <https://developer.apple.com/documentation/MusicKit>
- Developer tokens:
  <https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens>
- User authentication:
  <https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit>

**Key restrictions**

- Requires Apple Developer Program membership, a MusicKit media identifier and
  private key. Developer tokens are signed JWTs (ES256, max six months) and must
  be generated server-side.
- Personalized data needs a Music User Token, bound to the app/device; it must
  not be shared.
- Catalog playback goes through MusicKit and requires an active Apple Music
  subscription; purchased/synced library content is the documented exception.
- No raw audio files for a custom engine; no downloading or extracting content.
- Availability depends on the user's storefront and subscription; Apple's
  agreements govern caching and content use.

**Status**: not implemented; no Apple credentials or MusicKit integration.

## 5. YouTube (evaluated, not implemented)

**Documents**

- Data API: <https://developers.google.com/youtube/v3>
- API Services Terms: <https://developers.google.com/youtube/terms/api-services-terms-of-service>
- Developer Policies: <https://developers.google.com/youtube/terms/developer-policies>
- Quota: <https://developers.google.com/youtube/v3/determine_quota_cost>

**Key restrictions**

- The API provides metadata, not audio streams. Developers must not separate,
  isolate or modify audio/video components, promote audio separately, allow
  background play, or offer downloads.
- Playback must use the official IFrame player with the required visible
  behavior; a custom audio player is not permitted.
- Default quota: 10,000 units/day plus 100 `search.list` calls/day; extensions
  require a compliance audit.
- API keys are project credentials; OAuth is for private user data.

**Status**: incompatible with the shared audio engine; not integrated.

## 6. Jamendo (evaluated, not implemented)

**Documents**

- API docs: <https://developer.jamendo.com/v3.0/docs>
- Authentication: <https://developer.jamendo.com/v3.0/authentication>
- Plans: <https://developer.jamendo.com/v3.0Api>

**Key restrictions**

- `client_id` required for every call; OAuth2 for user writes.
- Free non-commercial app plan: up to 35,000 requests/month. Commercial use
  requires a Jamendo license/agreement.
- Tracks are Creative Commons; `audiodownload_allowed` says whether downloads
  may be offered, and stream/download URLs must not be used beyond the license.
- Attribution follows the track's CC license.

**Status**: viable future open catalog, but no application id/licensing review in
this phase.

## 7. Deezer (evaluated, not implemented)

**Documents**

- Developer portal: <https://developers.deezer.com/>
- Guidelines: <https://developers.deezer.com/guidelines>
- Terms: <https://developers.deezer.com/termsofuse>

**Key restrictions**

- Public catalog reads use an application id; user data uses OAuth.
- Third-party playback without a partnership is limited to 30-second previews
  (unlogged/freemium users are also clip-limited in Deezer's client).
- Full playback requires a partnership/premium integration.
- Catalog availability is country-dependent; terms prohibit unauthorized
  storage/redistribution.

**Status**: preview-only, so it cannot satisfy the full authorized playback goal
for this phase.

## 8. Internet Archive (evaluated, not implemented)

**Documents**

- Developer portal: <https://archive.org/developers/>
- Metadata API: <https://archive.org/developers/metadata.html>
- Search API: <https://archive.org/help/aboutsearch.htm>

**Key restrictions**

- Items carry their own `licenseurl`/`rights`; public domain and Creative Commons
  items are common, but each item must be checked.
- No normalized music catalog or per-track API; files are served directly.
- Advanced Search returns up to 10,000 sorted paged results; deeper paging uses
  the scraping API (not needed here).

**Status**: possible public-domain adapter; not implemented because per-item
license validation and a track model are still required.

## 9. Screened out

| Service | Reason |
| --- | --- |
| Bandcamp | No public API; scraping prohibited. |
| SoundCloud | Restricted API access; widget-based playback, not a raw stream. |
| Tidal | Partner-only API; no self-serve access. |
| Any "downloader"/stream ripper | Unauthorized; prohibited by this project. |

## 10. Caching and retention summary

| Data | Where | Retention | Contains audio? |
| --- | --- | --- | --- |
| Online track metadata | `lavender.library` → `onlineTracks` | Max 80, replaced as new tracks are seen | No |
| Saved online ids | `savedOnlineTrackIds` | Until unsaved | No |
| Saved albums/artists/playlists | Library JSON | Until unsaved | No |
| Artwork | Provider CDN URL only | URL until item ages out | No |
| Stream URL | In memory only | Playback session | No |
| Provider tokens | Not stored (no OAuth) | — | — |
| Imported local audio | IndexedDB / app documents | Until removed by listener | Yes (local only) |

No provider audio is cached for offline use. The app does not claim that online
tracks are available offline.

## 11. Geographic, subscription and session restrictions

- **Geographic**: availability is decided by the provider. Lavender surfaces
  provider 404/403/restriction errors and never bypasses geo-blocks. Audius may
  report a region restriction; it is shown as such.
- **Subscription**: Spotify streaming requires Premium; Apple catalog playback
  requires an Apple Music subscription; Deezer full playback requires a
  partner/premium integration. Lavender does not simulate these entitlements or
  instruct users to circumvent them.
- **Session expiry**: with no OAuth in this phase, there is no provider session
  to expire. If one is added later, an expired/revoked token must produce a
  reconnect action and must not fall back to unauthenticated workarounds.
- **Commercial use**: only Audius is enabled; its API Terms/OML apply. Do not
  assume any provider's catalog is cleared for commercial use without a
  separate agreement.

## 12. Attribution already implemented

- Search: "Online · Audius", "Authorized provider results", "Powered by Audius ·
  Open catalog" (links to audius.co).
- Rows/cards: `AUDIUS` badge and provider name.
- Now Playing: provider label, "Authorized stream" and "Open original" link.
- Library: saved section labelled "Saved from Audius" and explains streaming.
- Home: "Trending on Audius" plus a footnote that availability/licensing is
  controlled by the provider.

If a future provider requires a specific logo or link placement, add it behind
`capabilities.attribution` before enabling playback.
