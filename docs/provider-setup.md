# Lavender Music — Provider Setup

Phase 08 ships with Audius enabled and needs **no API key, account or secret**
for search, metadata or authorized streaming. Everything below is optional
except the verification step.

## 1. Audius (implemented)

### Requirements

- Network access to `https://api.audius.co/v1`.
- Nothing else for read/search/trending/stream. Audius documents read-only
  access without credentials and a free plan of 10 requests/second and 500,000
  requests/month for keyed apps (<https://docs.audius.co/sdk/>).
- Lavender sends `app_name=Lavender` on API and stream requests, as Audius asks
  API clients to identify themselves.

### Default configuration

No `.env` changes are needed:

```bash
npm run dev
```

Search for an artist or track (at least two characters) and choose the
**Online · Audius** result. Home shows **Trending on Audius** and **Audius
playlists** when the catalog responds.

### Optional variables

| Variable | Default | Use |
| --- | --- | --- |
| `EXPO_PUBLIC_ONLINE_MUSIC` | enabled | Set `off` to build a purely local app. Hides online search, Home sections and provider playback. |
| `EXPO_PUBLIC_ONLINE_PROVIDER` | `audius` | Select a registered provider id. Only `audius` exists in Phase 08. |
| `EXPO_PUBLIC_AUDIUS_API_BASE` | `https://api.audius.co/v1` | Point at a compatible proxy/test host. Must implement the same REST paths. |

These are **public** Expo variables and are embedded in the client bundle. Do
not put secrets in any `EXPO_PUBLIC_*` value.

If your network blocks Audius, online sections show an error with a retry action;
local music continues to work.

### API keys and OAuth

Audius API keys are only needed for higher limits and write operations. Phase 08
does not use them:

- No key is stored or sent.
- No Log in with Audius flow is implemented.
- Saving an online track is a local bookmark, not a provider favorite.

If a future phase adds provider-account saves, follow
[oauth-security.md](oauth-security.md): register a redirect URI in the Audius
developer app, use OAuth 2.0 Authorization Code + PKCE, keep write secrets
server-side or out of the client, and request only `read`/`write` as needed.

### Live verification

```bash
node scripts/verify-audius.mjs
```

The script checks:

- track, artist and playlist search for a sample query;
- trending tracks and playlists;
- playlist track expansion;
- a real stream request (range/bytes and content type), without saving audio.

It prints a short report and exits non-zero on a failed check. It needs network
access and is not part of `npm test`.

For automated tests:

```bash
npm test --workspace @lavender/music-providers
```

The unit tests use fixtures and never call the network.

### Disabling online music

```bash
EXPO_PUBLIC_ONLINE_MUSIC=off npm run dev
```

(or put `EXPO_PUBLIC_ONLINE_MUSIC=off` in an untracked `.env`). Search falls back
to local results, no Home online block mounts, and provider playback resolution
is disabled. Imported local files are unaffected.

## 2. Future providers — prerequisites

Do not enable any of these until credentials, scopes and terms are reviewed and
the provider package implements the required adapter. None are configured in
this repository.

### Spotify

- Spotify developer app (client id; client secret **server-side only**).
- Redirect URIs registered exactly; Authorization Code with PKCE for user flows.
- `streaming` scope and Spotify Premium for playback; Web Playback SDK for web,
  App Remote SDK for iOS. Development-mode apps are limited to allowlisted users.
- Server endpoints for token exchange/refresh; never ship the client secret.
- Review the Developer Policy (attribution, no indefinite caching, no commercial
  streaming apps) before enabling.

Server-only secrets (examples, not present): `SPOTIFY_CLIENT_ID`,
`SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`.

### Apple Music

- Apple Developer Program membership.
- MusicKit-enabled media identifier + private key; generate an ES256 developer
  token server-side (max six months).
- MusicKit/User Token flow for personalized endpoints; token is device-bound.
- Apple Music subscription for catalog playback; use MusicKit, not raw file
  URLs.
- Storefront selection and subscription checks are required.

Server-only values: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`,
`APPLE_MUSIC_MEDIA_ID`.

### YouTube

- Google Cloud project with YouTube Data API v3 enabled and an API key.
- Default quota 10,000 units/day (plus 100 searches/day); quota extensions need
  an audit.
- Playback must use the official IFrame player. Do not extract audio, run a
  background player, or offer downloads.
- This cannot use Lavender's shared audio engine; treat it as a separate video
  surface if ever added.

Server-only value: `YOUTUBE_API_KEY` (restricted by HTTP referrer/IP where
possible).

### Jamendo

- Developer account and application `client_id`; OAuth2 for user writes.
- Free non-commercial plan documented at 35,000 requests/month; commercial use
  requires a license.
- Check `audiodownload_allowed` and the track license before offering playback
  or downloads.

Value: `JAMENDO_CLIENT_ID` (server-side if used to protect quota; a client id is
not a secret but still belongs in configuration).

### Deezer

- Application id/secret, OAuth for user data.
- Third-party playback is limited to 30-second previews unless a partnership or
  premium integration is in place.
- Availability is country-dependent.

### Internet Archive

- No key. Use Advanced Search/Item Metadata APIs and direct files.
- Validate each item's `licenseurl`/`rights` before playback; licenses vary.

## 3. Secret rules

- Provider client secrets, private keys and refresh tokens never go in
  `EXPO_PUBLIC_*`, source control, logs, screenshots or client bundles.
- Use backend functions or a server Worker for token exchange and refresh.
- Store tokens encrypted, scoped to the user, and delete them on disconnect.
- Keep `.env` untracked. Commit only `.env.example` keys with empty values.
- Rotate keys after exposure; do not paste secrets into chat or issues.

## 4. Provider-enable checklist

- [ ] Official docs and terms reviewed for the current date.
- [ ] Developer account/app and required scopes obtained.
- [ ] Redirect URIs registered exactly; callback validated (state/nonce).
- [ ] Capabilities declared honestly (`playback`, `personalization`, `home`).
- [ ] Mapper tests, error mapping and search tests added.
- [ ] Playback returns only authorized sources; gated content refused.
- [ ] Attribution and links implemented per provider rules.
- [ ] Caching limited to what the terms allow; no stream URLs persisted.
- [ ] Secrets server-side; token refresh/revocation and disconnect tested.
- [ ] Web and iOS behavior verified on real devices where SDKs require it.
- [ ] Docs updated (`music-providers`, `provider-capabilities`,
  `licensing-and-restrictions`).
