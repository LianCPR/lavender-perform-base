# Synchronization

Lavender is local-first: the device library is always usable, and the cloud is
an optional copy of *metadata*. This document describes what syncs, when, how
conflicts are resolved, and what is deliberately excluded.

## What syncs

| Data | Granularity | Direction |
| --- | --- | --- |
| Playlists (name, palette, description, order) | one record per playlist | two-way |
| Favorites | whole set | two-way (last write wins) |
| Recently played | whole set, max 24 | two-way (last write wins) |
| Library sort/view | one preferences record | two-way |
| Playback prefs (shuffle/repeat/volume) | one record | two-way |
| Imported *metadata* (title/artist/album/format/file name) | one row per import | upload; cloud copy is browsable elsewhere |
| Imported **audio file** | — | **never uploaded** |
| Local file URI / blob / picker path | — | **never leaves the device** |
| Theme mode | — | not synced yet (column reserved, writes `system`) |
| Saved albums / followed artists | — | schema only, no UI writes yet |

## Bookkeeping (device-local)

`lavender.sync` (web `localStorage`; native `lavender-sync.json`) holds
`SyncMeta`:

```ts
{ version: 1, userId, migratedAt, sections: { favorites, recents, preferences },
  playlists: { [id]: { updatedAt, deletedAt } }, removedImports: { [id]: ts },
  playback, lastSyncedAt }
```

This is never uploaded. It answers "when did *this device* last change X" so a
cloud copy can be compared. It is flushed whenever it changes, so an
interrupted sync can resume; a different account resets it (`resetSyncMeta`).

## Merge rules (last write wins)

Timestamps are ISO strings compared as `Date.parse` values; invalid/missing
values sort as `0`.

### Playlists — per record

`mergePlaylists(local, stamps, remote)`:

1. Local deletions (`deletedAt` stamps or a playlist missing from the local
   list since the previous snapshot) become tombstones. A local deletion newer
   than the remote edit wins; otherwise the deletion is still pushed.
2. Remote tombstone newer than the local stamp → delete locally (and forget it).
3. Remote record missing locally → adopt it.
4. Remote record newer than the local stamp → replace the local copy (including
   ordered `trackIds`).
5. Local playlist not present remotely → push it (covers first sync and
   migration).
6. Local copy differing from an equal/newer remote record → push it.

Playlist order is part of the record: if either side reorders tracks, the newer
side's whole order wins (no per-track three-way merge).

### Favorites and recents — set level

`mergeIdSet(localIds, localUpdatedAt, remoteIds, remoteUpdatedAt)` picks the
side with the newer timestamp for the entire set. `remoteUpdatedAt` is the
newest `updated_at` among remote rows. This is simple and predictable, but it
means two devices adding different favorites while both offline resolve to a
single set, not a union.

### Preferences and playback

`mergePreferences` compares `updated_at`; the newer record replaces sort/view.
Playback (shuffle/repeat/volume) compares `meta.playback` with the server row's
`updated_at`; the newer side wins. Position and queue are pushed but a pull
never resumes playback automatically.

## One sync pass

`runSyncPass` is idempotent and safe to retry:

1. Upload metadata for local imports (`tracks` upsert + `user_imports`), and
   delete `user_imports` rows for imports removed on this device.
2. Collect which referenced track keys exist, so FK-violating references are
   filtered instead of breaking the pass.
3. **Migration** (first sync with local data): upload favorites, recents,
   preferences, every playlist and playback state *before* pulling, mark
   `migratedAt`. An empty local library simply marks the migration done.
4. Pull favorites, recents, preferences, playlists (with ordered tracks) and
   cloud import metadata.
5. Merge each section, push local winners, apply remote winners as one patch.
6. Adopt cloud-only imports as metadata-only tracks.
7. Exchange playback preferences.
8. Persist meta and `lastSyncedAt`.

Failures throw with a readable message; `SyncHost` maps them to `offline` or
`error`, keeps local data untouched, and retries on the next trigger.

## When sync runs

`SyncHost` (`packages/ui/src/SyncHost.tsx`):

- once immediately after sign-in / account change;
- 1.5 s after a detected local change (debounced);
- after playback preference changes;
- on the browser `online` event;
- when the listener taps **Sync now** on the Account screen.

Local change detection compares the library snapshot with the previous one.
Patches applied *from* the server are remembered as "expected remote state" so
they are not mistaken for local edits (which would stamp and echo them back).

## Migration of existing local data

The first sync for an account with local favorites/recents/playlists/imports
uploads that data before pulling anything. Because playlist ids are stable and
writes are upserts keyed by those ids, re-running the pass cannot duplicate
playlists. Nothing local is deleted to make migration succeed; failures leave
the local library intact and `migratedAt` unset.

Guest data is never uploaded until the listener signs in. On a *different*
account, local data is uploaded to that account's rows (by design it belongs to
whoever signs in); sync bookkeeping is reset so timestamps from the previous
account are not reused.

## Imported audio

- Imported files are copied into app storage on the importing device only.
- The cloud keeps metadata and `user_imports`, never bytes or URIs.
- Another device sees the import as a track that is "not on this device";
  playing it produces a clear message instead of a silent failure.
- Removing an import locally removes the local file and the cloud
  `user_imports` row on the next sync, so it does not reappear as cloud-only.
- Demo catalog tracks have no audio anywhere; the UI already says so.

## Offline behavior

- Every read/write path is local; sync is not required to browse, edit or play.
- While offline, changes are saved and stamped; status shows `offline`.
- On reconnect, the pending pass uploads local winners and pulls remote ones.
- The Account screen shows `syncing`, `idle`, `offline`, `error` and a manual
  **Sync now** action; errors are non-destructive.

## Known limitations

- Set-level LWW for favorites/recents cannot merge concurrent offline additions.
- Playlist ordering is a whole-record conflict; per-track merging is not
  attempted.
- Clock skew between devices can misorder near-simultaneous edits (LWW relies
  on local clocks; server `updated_at` is used after a push).
- No realtime push: changes appear on another device after its next sync.
- The `removedImports` cleanup only records removals while signed in; a removal
  made while signed out is not propagated to an account the device never
  synced with.
- Sync has not been exercised against a hosted Supabase project in this
  workspace; see [Deployment](deployment.md#what-has-been-verified).
