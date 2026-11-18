# Lavender Music — OAuth & Credential Security

Phase 08 uses a keyless read/stream provider (Audius). No provider OAuth flow,
client secret, access token or refresh token exists in the app today. This
document records that posture and the rules any future OAuth integration must
follow.

## 1. Current posture

| Item | State |
| --- | --- |
| Provider used | Audius, read/search/trending/stream |
| Credentials sent by the client | None; only the public `app_name=Lavender` parameter |
| Provider account linking | Not implemented |
| Provider-account saves | Not implemented; the app stores local bookmarks |
| Secrets in repo | None |
| Token storage | None |
| Logging of tokens | Not applicable; no tokens exist |

Why this is deliberate:

- Audius read and stream endpoints work without authentication for streamable
  content.
- Saving to a listener's Audius account would require an API key/secret and
  Log in with Audius OAuth. That adds a credential and consent surface with no
  Phase 08 requirement, so it is deferred rather than faked.
- No provider is enabled whose playback requires a secret or token that the
  project does not own.

The local library, imports and playback do not depend on any credential.

## 2. Rules for any future provider

1. **Confidential secrets stay server-side.** Client secrets, private keys and
   refresh tokens never appear in app code, `EXPO_PUBLIC_*` variables, storage
   visible to JavaScript, logs, analytics, screenshots or commits.
2. **Use Authorization Code + PKCE** for user authorization. Public clients use
   PKCE without a secret; providers that require a secret use a backend token
   exchange endpoint. Implicit flow is not used.
3. **Validate callbacks exactly.** Register exact redirect URIs, compare the
   returned `state` to a single-use value bound to the session, validate the
   issuer/audience and reject mismatches. Never accept an arbitrary
   `redirect_uri` from the request.
4. **Least-privilege scopes.** Request only scopes needed for the features that
   are actually shipped. Do not request write/library scopes for read-only
   browsing.
5. **Token storage.** On a server, store encrypted refresh tokens in a table
   keyed by `user_id + provider`, with RLS denying other users. On device, use
   the platform secure store (Keychain/Keystore) for any short-lived token; never
   `localStorage`.
6. **Refresh safely.** Refresh server-side, rotate refresh tokens when the
   provider does, serialize concurrent refreshes, and treat invalid_grant as a
   disconnect requiring re-authorization. Never log token values or full token
   responses.
7. **Disconnect and revoke.** Provide a disconnect action that revokes the token
   where supported and deletes stored credentials and provider-linked metadata.
   Account deletion must remove provider connections too.
8. **Transport and origin.** HTTPS only outside loopback; same-origin checks on
   mutation endpoints; CSRF protection for cookie-based callbacks; no tokens in
   URLs (fragments are also avoided).
9. **PKCE details.** S256 challenge, high-entropy verifier, single-use `state`
   and `nonce`, short authorization lifetime, exact redirect match.
10. **Provider terms.** OAuth permission does not grant extra rights: playback,
    caching and storage still follow the provider's API terms.

## 3. Recommended backend shape

A future OAuth provider needs a small server surface. It belongs in the existing
backend package/Worker, not in `packages/ui`:

```
POST /providers/:id/oauth/start     → create state/nonce, return authorize URL
GET  /providers/:id/oauth/callback  → validate state, exchange code, store tokens
POST /providers/:id/refresh         → rotate access token (server-side only)
POST /providers/:id/disconnect      → revoke + delete connection
GET  /providers/:id/status          → connected, scopes, expiry (no token values)
```

Suggested table (illustrative, not migrated in Phase 08):

```sql
create table provider_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  encrypted_refresh_token text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, provider)
);
-- RLS: users may select/delete only their own row; token writes only via
-- service-role backend functions.
```

The client receives only short-lived access tokens or a backend-proxied
playback/search response. It never receives the refresh token or client secret.

## 4. Provider-specific notes

### Audius (future account linking)

- OAuth 2.0 Authorization Code + PKCE, no client secret required; register the
  exact redirect URI in the Audius developer app
  (<https://docs.audius.co/developers/guides/log-in-with-audius/>).
- Scopes: `read` for profile, `write` only for favorites/uploads/playlists.
- API keys are for higher limits/writes. If used, keep the secret server-side;
  never send it from the browser or embed it in the app.

### Spotify (not implemented)

- Client secret and token exchange/refresh are server-side. The web player
  needs an access token in the browser; issue it from the backend with the
  minimum scope and short lifetime.
- `streaming` requires Premium and is restricted to the Web Playback SDK.
- Development-mode apps are limited to allowlisted users; commercial streaming
  is prohibited by policy. Review the Developer Policy before enabling.

### Apple Music (not implemented)

- A developer token is a signed ES256 JWT generated with a MusicKit private key
  (server-side; max six months). Never ship the private key.
- A Music User Token represents the listener, is app/device-bound, and must not
  be shared across devices (<https://developer.apple.com/documentation/applemusicapi/user-authentication-for-musickit>).
- Catalog playback requires an active Apple Music subscription and MusicKit.

### YouTube (not implemented)

- API keys identify a project, not a user; restrict them by referrer/IP.
- OAuth is only for private user data. Audio extraction and background playback
  are prohibited regardless of authorization.

## 5. Threat model

| Risk | Control |
| --- | --- |
| Client secret leaked in bundle | Secrets only in server env; `EXPO_PUBLIC_*` is public and audited. |
| Authorization code interception | PKCE S256, exact redirect URI, single-use state/nonce. |
| CSRF/login CSRF | State bound to session, same-site cookies, origin checks. |
| Open redirect | Allowlist exact callbacks; never reflect request `redirect_uri`. |
| Token theft from device | Platform secure storage; short lifetimes; no logs/analytics. |
| Cross-user data access | Tokens and connections keyed by authenticated `user.sub`; RLS. |
| Refresh replay/race | Rotate, serialize refresh, revoke on reuse detection if offered. |
| Token in logs/URLs | Structured redaction; tokens never query parameters. |
| Stale permissions | Re-check scopes/expiry before use; surface reconnect action. |

## 6. Logging and diagnostics

- Never log authorization codes, access tokens, refresh tokens, client secrets
  or full provider responses containing them.
- Log provider id, operation, HTTP status, error code and request id only.
- Error copy shown to listeners never includes token values or raw provider
  payloads.
- `ProviderError` deliberately carries a code and a safe message, not headers.

## 7. Not implemented (Phase 08 limitations)

- No OAuth flow, token store, refresh, revoke or account-linking UI.
- No provider-account saves; "save" is local.
- No server proxy for provider requests; Audius reads/streams go directly from
  the app because they are public and CORS-enabled.
- No Supabase table for provider connections; sync of online saves is not
  implemented.
- No commercial-use clearance for any provider beyond Audius' API Terms.

Any future implementation must satisfy the checklist in
[provider-setup.md](provider-setup.md) and the provider rules in
[licensing-and-restrictions.md](licensing-and-restrictions.md).
