# Testing report — Phase 09

Date: 17 November 2026

## Implemented

- Measured listening history with a 6–30 s threshold, source metadata, search,
  individual delete, delete-all and persistence.
- Music taste profile: artists, genres, moods, tracks, playlists, favorites,
  trend, last played, with no sensitive inference.
- Recommendation engine: Recommended for you, Based on recent listening,
  Favorite genres, Discover new artists, More like this, matching playlists and
  daily genre/artist/mood mixes.
- Personalized Home: real Recently Played, personalized rows, hide, restore,
  refresh, daily mixes, and static “Made for you” disabled once personalization
  has real data.
- `/personalization` screen linked from Home and Account.
- Privacy controls: on/off, delete one/all, reset taste profile, local settings.
- Supabase `listening_history` migration, RLS policy, repository and additive
  sync with tombstones and a clear cutoff.
- Six Phase 09 documents plus README/architecture/workflow updates.

## Automated checks

All commands were run at the repository root on 17 November 2026.

| Command | Result |
| --- | --- |
| `npm run typecheck` | **Pass** (all apps and packages) |
| `npm run lint` | **Pass** (ESLint, no warnings/errors) |
| `npm test` | **Pass** (all workspace tests) |
| `npm test --workspace @lavender/personalization` | **Pass — 16/16** |
| `npm run test:db` | **Pass** — migrations, seed and RLS verification, including `20261117090000_listening_history.sql` |
| `npm run build:web` | **Pass** — static export, including `personalization` route |
| `cd apps/mobile && npx expo-doctor` | **Pass — 20/20 checks** |

The new tests cover:

- 3-second and short plays never qualifying; the 30 s cap and 40% rule;
- history metadata excludes local audio/data artwork;
- same-session updates replace instead of duplicate;
- additive remote merge, longest-listen-wins, tombstones and clear cutoff;
- history search across title/artist/album/genre/mood;
- taste aggregation, genre share, trend windows, playlist matching and empty
  history;
- honest no-history fallback, personalized sections, playlist matching,
  dismissal, disabled mode, similar-track ordering and deterministic daily order.

## Browser verification (real running web app)

Checked on `http://localhost:8081` in the packaged Chromium preview.

1. **Local listen accuracy** — played the imported `Long Playback Test` (30 s)
   file. History committed after the 12-second threshold and persisted a
   measured value that reached 30 seconds. This verifies the tracker is wired to
   the real player, not a tap.
2. **Online source** — played the Audius stream `lofi type beat` for roughly 45
   seconds. The entry recorded `source: online`, provider `audius`, the real
   duration (334 s) and measured listening time. No stream URL was stored.
3. **Short-play rejection** — played the 3-second `Phase6 Test Tone`; no new
   session was created.
4. **Recommendation response** — after the listens, the profile showed the real
   artists, taste card and personalized rows; “Because you played lofi type
   beat”, “Discover new artists”, playlist matching and daily mix rows appeared.
5. **Home** — Recently Played showed the actual sessions; static “Made for you”
   was hidden in favor of personalized rows.
6. **Privacy toggle** — switching personalization off hid the profile and
   recommendation model, showed “Taste profile paused” and “Personalization is
   off”, and left history available. Switching it back on restored the rows.
7. **Individual delete** — deleting the online session removed it locally and
   wrote a tombstone.
8. **Delete all** — cleared history, wrote `historyClearedAt`, and returned the
   app to the explicit “Start here” fallback with no personalized claim.

No `console.error` or failed application requests were observed during these
checks. The only network requests were the Expo bundle, font and the authorized
Audius artwork/media requests.

## Responsive verification — compact and tablet

Checked the Personalization screen and the personalized Home in Chromium at
390×844 (compact) and 768×1000 / 1024×1024 (tablet widths), with real history
metadata from the imported 30-second track and an Audius track.

- Track rows on compact were cramped by the provider badge, duration and three
  trailing controls; the title was cut to a few characters. Compact rows now
  omit the provider badge and duration, use a tighter gap, and keep a shrinkable
  text column so the title and artist lead the row. Tablet/desktop keep all
  metadata.
- The featured album panel at tablet widths kept the 220px facts column and
  squeezed the title, subtitle and action buttons. The facts column now only
  appears at the wide breakpoint; tablet gets a 132px cover and a single action
  row.
- Compact history rows clipped the timestamp because the source and time shared
  one line. Compact now shows the local date only; tablet/desktop keep date and
  time.
- At maximum scroll on compact, the last history/privacy controls clear the
  floating mini player and tab bar.

## Screenshots

- `docs/screenshots/personalization-compact.png` — Personalization at 390×844.
- `docs/screenshots/personalization-history-compact.png` — compact history rows
  and privacy controls with the floating chrome clear of the last actions.
- `docs/screenshots/home-personalized-compact.png` — personalized Home rows at
  390×844.
- `docs/screenshots/personalization-tablet.png` — Personalization at 768×1000.
- `docs/screenshots/home-personalized-tablet.png` — personalized Home rows at
  768×1000.
- `docs/screenshots/personalization-desktop.png` — profile, controls and
  recommendation rows after real listens.
- `docs/screenshots/personalization-history-desktop.png` — history rows with
  local/online source, measured times and privacy controls.
- `docs/screenshots/personalization-home-desktop.png` — Home hero and online
  sections with the personalized state active.
- `docs/screenshots/personalization-home-sections-desktop.png` — real Recently
  Played, Recommended for you and Based on recent listening on Home.

## Incomplete / not verified

- **iOS simulator/device:** not available. Native tracking, native storage and
  the native compact layout were not exercised. TypeScript, Expo config and the
  web compact/tablet layouts were checked at 390, 768 and 1024px.
- **Hosted Supabase sync:** no Supabase credentials are configured, so live
  sign-in, history upload/pull, cross-device sync and two-account isolation were
  not exercised against a hosted project. The migration, trigger, grants and RLS
  policy passed `npm run test:db` against the local PostgreSQL stub.
- **Account isolation UI:** not tested with two live accounts for the same reason.
- **Offline playback regression:** not re-run with the network blocked in this
  phase; local playback and history worked while the app was online, and the
  design keeps all local paths independent of the network.
- **Demo catalog audio:** the local demo tracks still have no audio files, so
  they cannot generate history by themselves. Verification used real imported
  audio and an authorized Audius stream.
- **Cross-device clear semantics:** a device that still has old local sessions
  can re-upload them after another device clears; there is no account-wide clear
  marker yet.

## Known limitations

- History is capped at 300 sessions and 200 local tombstones.
- Online tracks without genre/mood metadata produce fewer genre/mood sections.
- Recommendations rank the local catalog rather than fetching a new
  recommendation catalog from the provider.
- The engine is deterministic and simple by design; no AI or paid service is
  used.
