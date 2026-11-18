# Lavender Music — Audio & Playback (Phase 06)

Phase 06 replaced the simulated timeline with one real audio engine and a
personal local library. This document records the architecture, the platform
limits that shaped it, and exactly what was verified.

## 1. Library choice

| Need | Choice | Why |
| --- | --- | --- |
| Playback | `expo-audio` `~58.0.12` | Ships with Expo SDK 58 (`bundledNativeModules.json`), works on web and iOS from one API, exposes a status stream, audio session options and lock-screen metadata. |
| Device file picker | `expo-document-picker` `~58.0.5` | Native document picker on iOS, `<input type="file">` on web, no extra permissions for user-selected audio. |
| Metadata | in-repo parser (`packages/music-library/src/audioMetadata.ts`) | A tag library was not worth a second dependency for four container formats; the parser reads ID3v2.3/2.4, MP4 `ilst`, FLAC Vorbis comments/STREAMINFO and WAV headers. |

`expo-av` is deprecated in SDK 58 and `react-native-track-player` does not run
on web, so `expo-audio` was the only candidate compatible with the existing
Expo Router + web + iOS setup. Installed with plain `npm install` because
`npx expo install` fails in this environment with `EALLOWSCRIPTS`.

## 2. Audio architecture

```
packages/music-player/src/engine.ts        one AudioPlayer, audio session, lock screen
packages/music-player/src/PlayerProvider   typed state machine + queue + persistence
packages/music-player/src/playerStorage    localStorage['lavender.player']
packages/ui/src/PlayerHost.tsx             wires the player to LibraryProvider
```

- **One engine per app.** `createPlaybackEngine()` creates a single
  `createAudioPlayer(null, { updateInterval: 250 })` and calls `replace({uri})`
  per track. There is no code path that spawns a second player, so two tracks
  can never sound at once; rapid switching keeps the newest source because
  `replace` resets the element.
- **Engine events.** `status` (position, duration, playing, buffering),
  `finish`, `error`. `PlayerProvider` turns them into `PlayerStatus`
  (`idle | loading | playing | paused | ended | error`).
- **Load guard.** If a source never becomes ready within 15s the engine emits a
  decode error instead of leaving the UI in "loading" forever.
- **Cleanup.** The provider disposes the engine on unmount (`remove()`), clears
  listeners and timers; imports cap artwork at 400 KB and revoke object URLs
  when an imported track is removed.
- **No duplicate state.** Mini Player, Now Playing, Queue, Library, Browse and
  Search read `usePlayer()`; only `PlayerProvider` mutates playback state.

### Queue, shuffle, repeat

`play(track, queue)` plays from an album, playlist or ad-hoc list; `playNext`,
`addToQueue`, `removeQueueItem`, `moveQueueItem` and `clearQueue` edit it.
`nextIndexFor` owns ordering: shuffle picks a random different index, repeat
`all` wraps at the end, repeat `one` is handled on `finish` by seeking to 0 and
replaying the same source. Toggling shuffle or repeat never seeks, so the
current position is preserved.

## 3. Local import

- **Web**: hidden `<input type="file">` → bytes → IndexedDB database
  `lavender-audio` (one record per import) → `blob:` URL for playback. The file
  survives reloads; URLs are recreated from IndexedDB on hydration.
- **iOS**: `expo-document-picker` with `copyToCacheDirectory`, then the bytes are
  written into `Paths.document/audio-imports`. Picker URIs are treated as
  temporary; only the app-owned copy is stored.
- **Metadata**: title/artist/album/year, embedded artwork (converted to a data
  URL), duration and container format. Missing tags fall back to the file name,
  `Unknown artist` and `Imported music`; `TrackEditSheet` lets the user correct
  them, and `TrackActionsSheet` removes an import (metadata + stored bytes).
- Imported tracks join `catalog.tracks`, so Browse, Search, Library, Home and
  the queue select the same objects. Imported files do not create Artist/Album
  browse entries (they have no catalog metadata) — a documented limitation.

## 4. Persistence

| Key | Contents |
| --- | --- |
| `lavender.library` | imported track metadata, favorites, playlists, recents, searches, sort/view |
| `lavender.player` | current track id, position (written on track/queue changes and every 5s while playing), queue ids + index, shuffle, repeat, volume |

Restore is **paused** (never autoplay). Imported tracks are re-resolved after
the library hydrates; if the stored file is gone the track keeps its metadata
and playback reports the missing-audio error instead of crashing.

Web uses `localStorage` + IndexedDB. Native registers file-backed adapters in
`apps/mobile/src/storage.ts` (`lavender-library.json`, `lavender-player.json` in
the document directory) through `setLibraryStorage` / `setPlayerStorage`.

## 5. Formats

| Container | iOS | Web (Chromium/Safari) |
| --- | --- | --- |
| MP3 | yes | yes |
| M4A / AAC | yes | yes |
| WAV | yes | yes |
| FLAC | yes | Chromium yes, Safari no |

Decoding is delegated to the platform player, so an unsupported codec surfaces
as "This file could not be decoded…" rather than a crash. DRM-protected files
are not supported by design.

## 6. Platform behaviour

- **Web**: playback starts from a user gesture (clicking a row/transport); if the
  browser blocks it the engine shows "The browser blocked playback. Press play
  again to start audio." Visibility changes do not pause playback.
- **iOS**: `setAudioModeAsync({ playsInSilentMode: true,
  shouldPlayInBackground: true, interruptionMode: 'doNotMix' })` and
  `setActiveForLockScreen(...)` are configured, and
  `ios.infoPlist.UIBackgroundModes: ["audio"]` is set in `apps/mobile/app.json`.
  **None of this was verified on a physical device.**

## 7. What was verified (web, Chromium)

- Imported a generated 3s and a 30s WAV through the real picker pipeline
  (file chooser intercepted with a `DataTransfer`), metadata fallbacks applied,
  duration read as 0:03 / 0:30, format shown as `WAV`.
- A real `<audio>` element played: `currentTime` advanced 0 → 3s and 0 → 30s,
  status events arrived at the 250ms cadence, UI position matched (`0:23/0:30`).
- Pause/resume, auto-advance to the next queued track at end of track, end of
  queue behaviour.
- Reload restore: paused, same track, position 0:15 / queue intact; pressing
  play resumed from the stored position.
- Missing-audio path: playing a demo track shows the danger banner
  "This demo track has no audio file…", keeps the track's real duration, shows
  the message in the mini player, and leaves the app usable.
- Import status messaging, queue clear control, format label, error banner.
- `npm run typecheck`, `npm run lint`, `npm run build:web`, `npx expo-doctor`
  (20/20) all pass.

Not verified: dragging/seeking through the browser run (the engine's
`seekTo` path is wired to both the slider and resume, but a full playhead drag
was not exercised end-to-end), iOS simulator or device playback, background
audio, lock-screen controls, headphone disconnects, call interruptions,
Safari FLAC, native imports, and iOS persistence adapters.

Screenshots: `docs/screenshots/now-playing-real-playback-desktop.png`,
`docs/screenshots/now-playing-no-audio.png`,
`docs/screenshots/library-imported-desktop.png`.

## 8. Online sources (Phase 08)

Online playback now arrives as another `audio.uri` producer behind the same
engine: `PlayerHost` calls a provider's `resolvePlayback` when a track has a
`provider` id, and passes the authorized stream URI to `expo-audio`. Stream URLs
are never persisted because they are short-lived; local import, formats,
persistence and the queue are unchanged. There is still no per-provider player,
no scraping and no DRM bypass.

See [online-playback.md](online-playback.md) for the resolution pipeline,
provider restrictions and verification, and
[music-providers.md](music-providers.md) for the architecture.
