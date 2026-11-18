import { mergeRemoteHistory } from '@lavender/personalization';

import type { LavenderSupabaseClient } from '../client';
import {
  clearHistoryBefore,
  fetchListeningHistory,
  pushHistoryDeletions,
  pushListeningHistory,
  toHistoryEntry,
} from '../repositories/history';
import {
  fetchFavorites,
  fetchPlaylistRecords,
  fetchPreferences,
  fetchRecents,
  playlistTrackIds,
  pushFavorites,
  pushPreferences,
  pushRecents,
} from '../repositories/library';
import { fetchPlayback, pushPlayback } from '../repositories/playback';
import { pushPlaylist, pushPlaylistDeletion } from '../repositories/playlists';
import {
  deleteImportRecords,
  ensureImportedTrackMetadata,
  existingTrackKeys,
  fetchCloudTracks,
} from '../repositories/tracks';
import {
  hasLocalContent,
  type LocalLibrarySlice,
  type PlaybackSlice,
  type SyncedLibraryPatch,
} from './local';
import { mergeIdSet, mergePlaylists, mergePreferences, maxTimestamp, timestamp, toLibraryTrack } from './merge';
import type { RemotePreferences, RemoteSnapshot, SyncMeta } from './types';

export interface SyncEngineDeps {
  client: LavenderSupabaseClient;
  userId: string;
  meta: SyncMeta;
  local: LocalLibrarySlice;
  playback: PlaybackSlice;
  applyLibrary: (patch: SyncedLibraryPatch) => void;
  applyPlayback: (preferences: {
    shuffle: boolean;
    repeat: 'off' | 'all' | 'one';
    volume: number;
  }) => void;
  now?: () => string;
}

export interface SyncEngineResult {
  meta: SyncMeta;
  cloudTrackCount: number;
}

async function fetchRemoteSnapshot(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<RemoteSnapshot> {
  const [favorites, recents, preferences, playlistRows, cloudTracks, listeningHistory] =
    await Promise.all([
      fetchFavorites(client, userId),
      fetchRecents(client, userId),
      fetchPreferences(client, userId),
      fetchPlaylistRecords(client, userId),
      fetchCloudTracks(client, userId),
      fetchListeningHistory(client, userId),
    ]);

  return {
    favorites,
    recents,
    listeningHistory,
    preferences,
    playlists: playlistRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      palette: row.palette as RemoteSnapshot['playlists'][number]['palette'],
      trackIds: playlistTrackIds(row.playlist_tracks),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    })),
    cloudTracks,
    playback: null,
  };
}

function referencedKeys(local: LocalLibrarySlice): string[] {
  return [
    ...local.favoriteTrackIds,
    ...local.recentTrackIds,
    ...local.playlists.flatMap((playlist) => playlist.trackIds),
    ...local.imports.map((item) => item.track.id),
  ];
}

/**
 * One sync pass: upload this device's changes, then adopt anything newer from
 * the cloud. Every step is idempotent so an interrupted run can be retried.
 */
export async function runSyncPass(deps: SyncEngineDeps): Promise<SyncEngineResult> {
  const now = deps.now ?? (() => new Date().toISOString());
  const { client, userId } = deps;
  const meta: SyncMeta = {
    ...deps.meta,
    sections: { ...deps.meta.sections },
    playlists: { ...deps.meta.playlists },
  };

  // 1. Make sure imported metadata exists so library rows can reference it.
  const importKeys = await ensureImportedTrackMetadata(client, userId, deps.local.imports);
  const removedImports = Object.keys(meta.removedImports);
  if (removedImports.length > 0) {
    await deleteImportRecords(client, userId, removedImports);
    // Only forget the tombstones once the cloud accepted the cleanup.
    meta.removedImports = {};
  }

  const known = await existingTrackKeys(client, referencedKeys(deps.local));
  importKeys.forEach((key) => known.add(key));

  // 2. First sign-in with local data: upload it before pulling, so nothing local
  //    is lost and the migration is idempotent (deterministic playlist ids).
  const migrating = !meta.migratedAt && hasLocalContent(deps.local);
  if (migrating) {
    await pushFavorites(client, userId, deps.local.favoriteTrackIds, known);
    await pushRecents(client, userId, deps.local.recentTrackIds, known);
    await pushPreferences(client, userId, {
      sort: deps.local.preferences.sort,
      view: deps.local.preferences.view,
      themeMode: 'system',
      updatedAt: now(),
    });
    for (const playlist of deps.local.playlists) {
      const pushed = await pushPlaylist(client, userId, playlist, known);
      meta.playlists[playlist.id] = { updatedAt: pushed.updatedAt, deletedAt: null };
    }
    await pushListeningHistory(client, userId, deps.local.listeningHistory);
    await pushHistoryDeletions(client, userId, deps.local.historyDeletedIds);
    if (deps.local.historyClearedAt) {
      await clearHistoryBefore(client, userId, deps.local.historyClearedAt);
    }
    meta.sections = { favorites: now(), recents: now(), preferences: now() };
    meta.migratedAt = now();
    meta.playback = await pushPlayback(client, userId, deps.playback, known);
  } else if (!meta.migratedAt) {
    // Empty local library: nothing to migrate, mark it so we do not retry.
    meta.migratedAt = now();
  }

  // 3. Pull the cloud snapshot (after migration writes).
  const remote = await fetchRemoteSnapshot(client, userId);

  const localDeleted: Record<string, string> = {};
  for (const [id, stamp] of Object.entries(meta.playlists)) {
    if (stamp.deletedAt) localDeleted[id] = stamp.deletedAt;
  }

  const playlistMerge = mergePlaylists(deps.local.playlists, meta.playlists, remote.playlists, {
    deleted: localDeleted,
  });
  meta.playlists = playlistMerge.stamps;

  for (const playlist of playlistMerge.push) {
    const pushed = await pushPlaylist(client, userId, playlist, known);
    meta.playlists[playlist.id] = { updatedAt: pushed.updatedAt, deletedAt: null };
  }
  for (const id of playlistMerge.remove) {
    await pushPlaylistDeletion(client, userId, id, meta.playlists[id]?.deletedAt ?? now());
  }

  const patch: SyncedLibraryPatch = {};
  if (playlistMerge.direction === 'remote') patch.playlists = playlistMerge.playlists;

  // 4. Favorites — set-level LWW.
  const remoteFavoriteIds = remote.favorites
    .filter((row) => !row.deletedAt)
    .map((row) => row.trackKey);
  const remoteFavoritesAt = maxTimestamp(remote.favorites.map((row) => row.updatedAt));
  const favoritesMerge = mergeIdSet(
    deps.local.favoriteTrackIds,
    meta.sections.favorites,
    remoteFavoriteIds,
    remoteFavoritesAt,
  );
  if (favoritesMerge.direction === 'remote') {
    patch.favoriteTrackIds = favoritesMerge.value;
    meta.sections.favorites = favoritesMerge.updatedAt;
  } else if (favoritesMerge.direction === 'local') {
    await pushFavorites(client, userId, favoritesMerge.value, known);
    meta.sections.favorites = now();
  }

  // 5. Recently played — set-level LWW.
  const remoteRecentIds = remote.recents.map((row) => row.trackKey);
  const remoteRecentsAt = maxTimestamp(remote.recents.map((row) => row.updatedAt));
  const recentsMerge = mergeIdSet(
    deps.local.recentTrackIds,
    meta.sections.recents,
    remoteRecentIds,
    remoteRecentsAt,
  );
  if (recentsMerge.direction === 'remote') {
    patch.recentTrackIds = recentsMerge.value;
    meta.sections.recents = recentsMerge.updatedAt;
  } else if (recentsMerge.direction === 'local') {
    await pushRecents(client, userId, recentsMerge.value, known);
    meta.sections.recents = now();
  }

  // 6. Library preferences — LWW.
  const localPreferences: RemotePreferences = {
    sort: deps.local.preferences.sort,
    view: deps.local.preferences.view,
    themeMode: 'system',
    updatedAt: meta.sections.preferences,
  };
  const preferenceMerge = mergePreferences(localPreferences, remote.preferences);
  if (preferenceMerge.direction === 'remote') {
    patch.preferences = { sort: preferenceMerge.value.sort, view: preferenceMerge.value.view };
    meta.sections.preferences = preferenceMerge.updatedAt;
  } else if (preferenceMerge.direction === 'local') {
    await pushPreferences(client, userId, localPreferences);
    meta.sections.preferences = now();
  }

  // 7. Listening history is additive; longest measured listen wins. Local
  //    tombstones and remote tombstones both prevent resurrection.
  const remoteDeletedIds = remote.listeningHistory
    .filter((entry) => entry.deletedAt)
    .map((entry) => entry.id);
  const historyMerge = mergeRemoteHistory({
    local: deps.local.listeningHistory,
    remote: remote.listeningHistory
      .filter((entry) => !entry.deletedAt)
      .map(toHistoryEntry),
    deletedIds: [...deps.local.historyDeletedIds, ...remoteDeletedIds],
    clearedAt: deps.local.historyClearedAt,
  });
  await pushHistoryDeletions(client, userId, deps.local.historyDeletedIds);
  if (deps.local.historyClearedAt) {
    await clearHistoryBefore(client, userId, deps.local.historyClearedAt);
  }
  await pushListeningHistory(client, userId, historyMerge.push);
  patch.listeningHistory = historyMerge.history;

  // 8. Cloud-only imported metadata becomes browsable here, without audio.
  const cloudTracks = remote.cloudTracks.map(toLibraryTrack);
  if (cloudTracks.length > 0) patch.cloudTracks = cloudTracks;

  // 9. Playback preferences (volume/shuffle/repeat) — LWW, never autoplay.
  const remotePlayback = await fetchPlayback(client, userId);
  if (remotePlayback && meta.playback && timestamp(remotePlayback.updatedAt) > timestamp(meta.playback)) {
    deps.applyPlayback({
      shuffle: remotePlayback.shuffle,
      repeat: remotePlayback.repeat,
      volume: remotePlayback.volume,
    });
    meta.playback = remotePlayback.updatedAt;
  } else if (timestamp(meta.playback) > timestamp(remotePlayback?.updatedAt)) {
    meta.playback = await pushPlayback(client, userId, deps.playback, known);
  }

  if (
    patch.favoriteTrackIds ||
    patch.recentTrackIds ||
    patch.playlists ||
    patch.preferences ||
    patch.cloudTracks ||
    patch.listeningHistory
  ) {
    deps.applyLibrary(patch);
  }

  meta.lastSyncedAt = now();
  return { meta, cloudTrackCount: cloudTracks.length };
}

