# Lavender Music — Provider Capabilities

This document records what each provider actually permits, which provider is
implemented in Lavender, and why the others are not presented as available.
It reflects official documentation reviewed in November 2026; provider terms
change, so re-check the linked documents before enabling a new integration.

## 1. Implemented provider

| Provider | Status in Lavender | Playback |
| --- | --- | --- |
| **Audius** | Implemented end-to-end (search, metadata, artwork, Home discovery, stream playback, local unified-library saves) | Authorized full streaming for streamable tracks; no gated/tracked items |

No other provider is registered, shown in search, or wired to playback. The UI
never renders a provider control it cannot back with a real operation.

## 2. Comparison matrix

Legend: **Yes** = documented and usable with the stated account; **No** =
not supported or prohibited; **Partial** = limited/conditional; **—** = not
applicable or not evaluated further.

| Capability | Audius (implemented) | Spotify | Apple Music | YouTube | Jamendo | Deezer | Internet Archive |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Search tracks | Yes | Yes | Yes | Yes (video results) | Yes | Yes | Partial (item search) |
| Search albums | Yes (album-like playlists) | Yes | Yes | No album entity | Yes | Yes | No |
| Search artists | Yes (users) | Yes | Yes | Yes (channels) | Yes | Yes | Partial |
| Search playlists | Yes | Yes | Yes | Yes | Yes | Yes | No |
| Track/album/artist metadata | Yes | Yes | Yes | Yes | Yes | Yes | Partial (item metadata) |
| Artwork | Yes | Yes | Yes | Yes (thumbnails) | Yes | Yes | Item-dependent |
| Full authorized playback | Yes | Yes (Premium + Web Playback SDK / App Remote) | Yes (MusicKit + subscription) | No (official IFrame video player only) | Yes (per-track license/flags) | 30-second previews without partnership | Yes (direct files when item license allows) |
| Playback in one shared audio engine | Yes | Partial (SDK/Connect device, not a raw URL) | Partial (MusicKit/AVPlayer, not a raw URL) | No (video surface required) | Yes | Yes (preview URL) | Yes (file URL) |
| Home / discovery feed | Yes (trending) | Yes (new releases, featured) | Yes (recommendations, heavy rotation) | Not appropriate | Partial (radios/feeds) | Yes (charts/editorial) | No |
| Save to provider account | No (OAuth not implemented) | Yes (OAuth) | Yes (Music User Token) | Partial (playlists) | Yes (OAuth write) | Yes (OAuth) | No |
| Client auth for read | None | Client credentials / user OAuth | Developer token + optional user token | API key (+ OAuth for private data) | `client_id` (+ OAuth for user data) | App id (+ OAuth for user data) | None |
| Subscription required | No | Yes for streaming | Yes for catalog playback | No (ads/region may apply) | No | Premium for full playback | No |
| Geographic restrictions | Provider/region settings | Market catalog | Storefront | Country availability | Usually worldwide | Country availability | Item-dependent |
| Free-tier limits | 10 req/s, 500k/month | Rate limit + dev-mode quota | Rate limit (429) | 10k units/day + 100 searches/day | 35k req/month (non-commercial) | Rate limits apply | 10k paged sorted results |
| Commercial streaming allowed | Per Audius API Terms/OML | No, except limited cases | Per Apple agreements | No audio extraction; normal YouTube terms | Non-commercial free tier; commercial license required | Partner agreement for full playback | Per item license |

## 3. Capability flags in code

```ts
interface ProviderCapabilities {
  search: { tracks: boolean; albums: boolean; artists: boolean; playlists: boolean };
  metadata: { track: boolean; album: boolean; artist: boolean; playlist: boolean };
  artwork: boolean;
  playback: 'stream' | 'preview' | 'none';
  home: boolean;
  personalization: { saveToProvider: boolean; userLibrary: boolean };
  authentication: 'none' | 'api_key' | 'oauth_pkce';
  attribution: { required: boolean; label: string; url: string };
}
```

Audius declares:

```ts
search: { tracks: true, albums: true, artists: true, playlists: true },
metadata: { track: true, album: true, artist: true, playlist: true },
artwork: true,
playback: 'stream',
home: true,
personalization: { saveToProvider: false, userLibrary: false },
authentication: 'none',
attribution: { required: true, label: 'Audius', url: 'https://audius.co' }
```

UI gating:

| Flag | UI effect when false |
| --- | --- |
| `search.*` | The category is not requested or rendered. |
| `metadata.*` | Detail sheets are not offered for that entity. |
| `playback: 'none'` | No play action; metadata/link only. |
| `playback: 'preview'` | Preview labelled as a clip, never as the full track. |
| `home` | Home online sections are not mounted. |
| `personalization.*` | Save/follow controls are absent or explicitly "saved locally". |
| `attribution.required` | A provider attribution row/section is shown. |

## 4. Provider notes

### Audius — selected

- Official docs: <https://docs.audius.co/api> · API base:
  <https://api.audius.co/v1> · API terms:
  <https://audius.co/documents/ApiTerms.pdf>
- Read endpoints and `/tracks/{id}/stream` work without credentials for
  streamable tracks. Free plan: 10 requests/second and 500,000 requests/month
  per <https://docs.audius.co/sdk/>.
- Playback is authorized per track. `is_streamable`, `is_stream_gated`,
  `access.stream` and deletion flags are respected. Gated/subscription-only
  tracks are not played.
- Creator licenses include the Audius Open Music License and Creative Commons
  options; each track carries a `license` value.
- API Terms require session-based caching of content and consumer data; Lavender
  keeps only metadata (max 80 tracks) and never persists stream URLs or audio.
- Writes (favorite, upload, playlist edits) need an API key/secret and/or
  Log in with Audius OAuth. Not implemented in Phase 08.

### Spotify — evaluated, not implemented

- Docs: <https://developer.spotify.com/documentation/web-api> · Policy:
  <https://developer.spotify.com/policy> · Terms:
  <https://developer.spotify.com/terms>
- Search/metadata are available with an app client id/secret (server-side) or
  PKCE for user flows. Streaming requires Premium and the Web Playback SDK on
  web or the iOS/Android App Remote SDK; the `streaming` scope is Premium-only.
- Streaming apps may not be commercial, and Spotify content may not be stored
  indefinitely or synchronized. Metadata/cover art need attribution and links.
- Development-mode apps are limited (currently 5 authenticated users by
  default; quota changes in 2026). No client secret or user token is present in
  this project, so no Spotify integration is claimed.

### Apple Music — evaluated, not implemented

- Docs: <https://developer.apple.com/documentation/applemusicapi> · MusicKit:
  <https://developer.apple.com/documentation/MusicKit>
- Requires Apple Developer Program membership, a MusicKit media identifier/key
  and a signed developer token (ES256, max six months). Personalized data needs
  a Music User Token; it is device/app-bound and must not be shared.
- Catalog playback goes through MusicKit; an Apple Music subscription is
  required for catalog content (purchased/synced library content is the
  exception). The API does not hand out raw audio files for a custom engine.
- Geographic storefronts and subscription state control availability. Apple's
  agreements govern caching and content use. No Apple credentials exist here.

### YouTube — evaluated, not implemented

- Docs: <https://developers.google.com/youtube/v3> · Policies:
  <https://developers.google.com/youtube/terms/developer-policies>
- The Data API provides video metadata, not audio streams. Developers must not
  separate/isolate audio, promote audio separately, allow background play, or
  offer downloads. Playback must use the official IFrame player.
- Default quota: 10,000 units/day, plus 100 `search.list` calls/day (as of the
  November 2026 documentation). Additional quota needs a compliance audit.
- This makes YouTube unsuitable for Lavender's shared audio engine. It could
  only appear as a linked video surface, which is out of scope.

### Jamendo — evaluated, not implemented

- Docs: <https://developer.jamendo.com/v3.0/docs> · Auth:
  <https://developer.jamendo.com/v3.0/authentication>
- API key (`client_id`) for reads, OAuth2 for user writes. Free "non-commercial"
  app plan is documented at up to 35,000 requests/month; commercial use needs a
  licensing agreement. Tracks are Creative Commons and expose
  `audiodownload_allowed`; download/stream rights must be checked per track.
- A good future open-catalog candidate, but it requires an application id and a
  licensing review before being enabled. Not registered in Phase 08.

### Deezer — evaluated, not implemented

- Docs: <https://developers.deezer.com/> · Guidelines:
  <https://developers.deezer.com/guidelines>
- Public catalog reads use an application id; user data uses OAuth. Unlogged and
  freemium users are limited to 30-second clips in Deezer's own client, and
  full-track playback in a third-party app requires a partnership/premium
  integration. Availability is country-dependent.
- Preview-only playback would be allowed, but the brief requires full,
  authorized playback where implemented; Deezer is therefore not integrated.

### Internet Archive — evaluated, not implemented

- Docs: <https://archive.org/developers/> · Metadata:
  <https://archive.org/developers/metadata.html> · Search:
  <https://archive.org/help/aboutsearch.htm>
- Advanced Search and Item Metadata APIs are public; audio files are served
  directly when the item's license/rights allow it. Licensing varies per item
  (`licenseurl`/`rights`), and there is no normalized music catalog model.
- This is a possible public-domain catalog adapter, but each item needs license
  validation and the search model is not track-centric. Not implemented.

### Screened out without further work

- **Bandcamp** — no public API; scraping is prohibited by its terms.
- **SoundCloud** — API registration is restricted and playback is designed
  around its widget; not a fit for a shared audio engine.
- **Tidal** — partner-only API; no self-serve integration.
- **Unofficial download/scraping services** — never permitted.

## 5. Why Audius was selected

1. **Real, authorized playback without a subscription or developer approval.**
   Other major catalogs require OAuth, Premium/subscription, SDKs or partnership
   agreements that are not available in this environment.
2. **Documented open API** with search, metadata, artwork, playlists, trending
   and a stream endpoint that returns audio for streamable tracks.
3. **Per-track restriction data** lets the app refuse gated content honestly
   instead of simulating playback.
4. **Open licensing** (OML/Creative Commons) is compatible with a personal music
   app, subject to the API Terms and attribution.
5. **Low integration risk**: keyless reads avoid shipping secrets, and the REST
   shape maps cleanly onto the existing `Track` model.

See [licensing-and-restrictions.md](licensing-and-restrictions.md) for the terms
that govern each provider.
