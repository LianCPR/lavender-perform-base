import type { ID, Playlist } from '@lavender/shared';

import type {
  CloudTrack,
  LocalPlaylistChange,
  MergedPlaylists,
  MergedValue,
  PlaylistStamp,
  RemotePlaylist,
  RemotePreferences,
  SyncDirection,
} from './types';

export function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function isNewer(candidate: string | null | undefined, reference: string | null | undefined): boolean {
  return timestamp(candidate) > timestamp(reference);
}

export function maxTimestamp(values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const value of values) {
    if (value && timestamp(value) > timestamp(best)) best = value;
  }
  return best;
}

export function toRemotePlaylist(playlist: Playlist, updatedAt: string): RemotePlaylist {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description ?? null,
    palette: playlist.palette,
    trackIds: playlist.trackIds,
    createdAt: playlist.createdAt,
    updatedAt,
    deletedAt: null,
  };
}

export function fromRemotePlaylist(record: RemotePlaylist): Playlist {
  return {
    id: record.id,
    name: record.name,
    description: record.description ?? undefined,
    palette: record.palette,
    trackIds: record.trackIds,
    createdAt: record.createdAt,
  };
}

function sameOrder(a: ID[], b: ID[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function samePlaylist(playlist: Playlist, record: RemotePlaylist): boolean {
  return (
    playlist.name === record.name &&
    (playlist.description ?? '') === (record.description ?? '') &&
    playlist.palette === record.palette &&
    sameOrder(playlist.trackIds, record.trackIds)
  );
}

/**
 * Per-playlist last-write-wins.
 *
 * - A remote playlist newer than the local stamp replaces the local copy.
 * - A local playlist newer than the remote record is queued for push.
 * - Remote tombstones delete the local copy; local deletions are pushed.
 * - Playlists never seen remotely are pushed (covers first sync and migration).
 */
export function mergePlaylists(
  local: Playlist[],
  stamps: Record<ID, PlaylistStamp>,
  remote: RemotePlaylist[],
  changes: LocalPlaylistChange = { deleted: {} },
): MergedPlaylists {
  const nextStamps: Record<ID, PlaylistStamp> = { ...stamps };
  const result = new Map<ID, Playlist>(local.map((playlist) => [playlist.id, playlist]));
  const remoteById = new Map<ID, RemotePlaylist>(remote.map((record) => [record.id, record]));
  const push: Playlist[] = [];
  const remove: ID[] = [];
  let direction: SyncDirection = 'none';

  for (const [id, deletedAt] of Object.entries(changes.deleted)) {
    const stamp = nextStamps[id];
    nextStamps[id] = { updatedAt: deletedAt, deletedAt };
    if (!stamp?.deletedAt) {
      remove.push(id);
      result.delete(id);
      direction = 'local';
    }
  }

  for (const record of remote) {
    const stamp = stamps[record.id];
    const localDeletion = changes.deleted[record.id];
    // A deletion made on this device after the remote edit wins.
    if (localDeletion && timestamp(localDeletion) >= timestamp(record.updatedAt)) continue;

    if (record.deletedAt) {
      if (isNewer(record.deletedAt, stamp?.updatedAt)) {
        result.delete(record.id);
        nextStamps[record.id] = { updatedAt: record.updatedAt, deletedAt: record.deletedAt };
        direction = 'remote';
      }
      continue;
    }

    if (!result.has(record.id)) {
      result.set(record.id, fromRemotePlaylist(record));
      nextStamps[record.id] = { updatedAt: record.updatedAt, deletedAt: null };
      direction = 'remote';
      continue;
    }

    if (isNewer(record.updatedAt, stamp?.updatedAt)) {
      result.set(record.id, fromRemotePlaylist(record));
      nextStamps[record.id] = { updatedAt: record.updatedAt, deletedAt: null };
      direction = 'remote';
    }
  }

  for (const [id, playlist] of result) {
    const record = remoteById.get(id);
    const stamp = nextStamps[id];
    if (!record) {
      push.push(playlist);
      if (!stamp) nextStamps[id] = { updatedAt: new Date().toISOString(), deletedAt: null };
      if (direction === 'none') direction = 'local';
      continue;
    }
    if (record.deletedAt) continue;
    const localIsNewer = stamp ? timestamp(stamp.updatedAt) >= timestamp(record.updatedAt) : true;
    if (!samePlaylist(playlist, record) && localIsNewer) {
      push.push(playlist);
      direction = 'local';
    }
  }

  return {
    playlists: [...result.values()],
    stamps: nextStamps,
    push,
    remove,
    direction,
  };
}

/** Set-level last-write-wins for favorites and recently played ids. */
export function mergeIdSet(
  localIds: ID[],
  localUpdatedAt: string,
  remoteIds: ID[],
  remoteUpdatedAt: string | null,
): MergedValue<ID[]> {
  if (remoteUpdatedAt && isNewer(remoteUpdatedAt, localUpdatedAt)) {
    return { value: remoteIds, updatedAt: remoteUpdatedAt, direction: 'remote' };
  }
  const direction: SyncDirection =
    localIds.length > 0 || (remoteUpdatedAt && localUpdatedAt !== remoteUpdatedAt) ? 'local' : 'none';
  return { value: localIds, updatedAt: localUpdatedAt, direction };
}

export function mergePreferences(
  local: RemotePreferences,
  remote: RemotePreferences | null,
): MergedValue<RemotePreferences> {
  if (remote && isNewer(remote.updatedAt, local.updatedAt)) {
    return { value: remote, updatedAt: remote.updatedAt, direction: 'remote' };
  }
  return { value: local, updatedAt: local.updatedAt, direction: 'local' };
}

export function toLibraryTrack(track: CloudTrack) {
  return {
    id: track.key,
    title: track.title,
    artistId: 'imported',
    artistName: track.artistName,
    albumId: 'imported',
    albumTitle: track.albumTitle,
    durationSec: track.durationSec,
    palette: track.palette as Playlist['palette'],
    imported: true,
    // No audio on purpose: the file stayed on the device that imported it, so
    // this metadata-only track renders as "not on this device".
  };
}

/** True when the track metadata still points at a playable file on this device. */
export function isLocallyAvailable(track: { imported?: boolean; audio?: { uri: string } }): boolean {
  return !track.imported || Boolean(track.audio?.uri);
}
