# Authentication

Authentication is optional. Lavender works as a guest forever; accounts exist
only to sync metadata between devices. Supabase Auth (GoTrue) owns credentials
and sessions — **no password is ever stored in the app database or app code**.

## Configuration gate

`isBackendConfigured()` requires a URL starting with `http` and a non-empty
anon key. When false:

- `getSupabaseClient()` returns `null`,
- `AuthProvider` reports `configured: false` and skips all network work,
- the Account screen explains how to enable the backend,
- sync status is `disabled`.

Only these public values are read (Expo inlines `EXPO_PUBLIC_*` at build time):

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_AUTH_REDIRECT_URL   # optional; native fallback only
```

## Flows

`useAuth()` exposes the whole surface:

| Action | Behavior |
| --- | --- |
| `signUp(email, password, displayName?)` | Validates email and password (≥ 8 chars), normalizes the email, calls `supabase.auth.signUp` with `emailRedirectTo` and `data.display_name`. Returns `{ ok, needsConfirmation }`; `needsConfirmation` is true when the project requires email confirmation (no session returned). |
| `signIn(email, password)` | Email format + non-empty password, `signInWithPassword`; maps GoTrue errors to friendly copy. |
| `signOut()` | `supabase.auth.signOut()`; local library is untouched. |
| `requestPasswordReset(email)` | `resetPasswordForEmail` with a redirect back to the account route. |
| `updatePassword(password)` | Used after a recovery link; validates length, calls `updateUser`, clears recovery mode. |
| `updateDisplayName(name)` | Updates `profiles.display_name` for the signed-in user (1–80 chars enforced by the database). |
| `clearError`, `dismissRecovery` | Dismiss UI state. |

### Registration

1. The screen validates locally (`validateEmail`, `validatePassword`).
2. GoTrue creates `auth.users`. The `handle_new_user` trigger inserts the
   matching `profiles`, `user_preferences` and `playback_state` rows
   (copying `display_name` from sign-up metadata when present).
3. If email confirmation is enabled, the UI says so; the first sign-in after
   confirmation succeeds. If disabled, the session is immediate.

### Session restore

`AuthProvider` calls `supabase.auth.getSession()` on mount, then subscribes to
`onAuthStateChange` for refreshes, sign-in and sign-out. `initializing` is true
until the first read completes; the Account screen shows a restoring state
meanwhile. The rest of the app never waits on auth to render the library.

Sessions are persisted by supabase-js:

| Platform | Storage |
| --- | --- |
| Web | `localStorage`, key `lavender.auth` |
| iOS / native | document-directory file `lavender-auth.json` (adapter registered in `apps/mobile/src/storage.ts`) |
| SSR / tests | in-memory fallback |

`autoRefreshToken: true` keeps the session fresh; `detectSessionInUrl` is on
only where `window` exists. `flowType: 'pkce'`.

### Password reset

1. **Forgot password** → `resetPasswordForEmail(email, { redirectTo })`.
2. The email link returns to the redirect URL.
3. On web, supabase-js parses the URL (`detectSessionInUrl`), emits
   `PASSWORD_RECOVERY`, and `AuthProvider` sets `recoveryMode`.
4. The Account screen then shows **Choose a new password** → `updatePassword`.

Redirect targets:

- Web: `${window.location.origin}/account` (computed at runtime).
- Native fallback: `EXPO_PUBLIC_AUTH_REDIRECT_URL`, default
  `lavendermusic://account` (the scheme in `apps/mobile/app.json`).

**Native limitation:** the native app does not currently call
`exchangeCodeForSession` on a deep link, so the reset flow is only wired for
web. The account screen and `updatePassword` work on native, but the emailed
link must be opened in a browser for now.

## Account UI

`packages/ui/src/screens/AccountScreen.tsx` (routes: `/account` on both apps)
provides sign in / create account / forgot password, the signed-in profile with
display-name editing and sign out, sync status with **Sync now**, and the
password-recovery form. Entry points: sidebar footer **Account** on desktop and
the person icon in the compact mobile header.

## Database authority

- RLS policies compare `user_id`/`id` with `auth.uid()`; a client cannot read or
  write another listener's rows even with a hand-crafted request.
- `profiles` can only be updated by its owner; the sign-up trigger is
  `security definer` so the initial rows are created safely.
- `anon` has no table privileges. Guest mode is purely local.
- The anon key is public by design; the **service-role key must never be
  shipped** (see [Deployment](deployment.md)).

## Error handling

`describeAuthError` maps common GoTrue messages (invalid credentials,
unconfirmed email, existing account, weak password, rate limit, network) to
actionable copy. Validation errors are shown before any request. A failed auth
call never blocks local playback.

## Verification status

- Local PostgreSQL harness verifies the sign-up trigger (satellite rows +
  display name) and RLS isolation (`npm run test:db`).
- Live registration/login/reset against a hosted Supabase project was **not**
  run here: no project or credentials exist in this workspace. Configure a
  project per [Deployment](deployment.md) and test with two accounts.
