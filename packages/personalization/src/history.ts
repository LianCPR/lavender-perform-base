import type { Track } from '@lavender/shared';

import type { ListeningHistoryEntry, ListeningSource } from './types.ts';

export const MAX_HISTORY_ENTRIES = 300;
export const MAX_HISTORY_TOMBSTONES = 200;
/** A listen must reach this many seconds (capped) to count as history. */
export const MIN_LISTEN_SEC = 6;
export const MAX_LISTEN_SEC = 30;

/**
 * A very short tap should not become a play. The threshold is 40% of the track,
 * bounded to 6–30 seconds so both short clips and long mixes are handled
 * sensibly. A 3-second demo tone can therefore never count as a full listen.
 */
export function listenThreshold(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return MAX_LISTEN_SEC;
  return Math.min(MAX_LISTEN_SEC, Math.max(MIN_LISTEN_SEC, Math.round(durationSec * 0.4)));
}

export function qualifiesListen(durationSec: number, listenedSec: number): boolean {
  return Number.isFinite(listenedSec) && listenedSec >= listenThreshold(durationSec);
}

function remoteArtwork(url: string | undefined): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export interface CreateHistoryOptions {
  listenedSec: number;
  playedAt?: string;
  id?: string;
}

export function sourceForTrack(track: Track): ListeningSource {
  return track.provider ? 'online' : 'local';
}

/**
 * Snapshot exactly the metadata needed to render and analyze a listen. Audio,
 * blob URLs and local data-URL artwork are deliberately excluded.
 */
export function createHistoryEntry(
  track: Track,
  options: CreateHistoryOptions,
): ListeningHistoryEntry {
  const durationSec = Math.max(0, Math.round(track.durationSec));
  const listenedSec = Math.max(
    0,
    Math.min(durationSec > 0 ? durationSec : Number.MAX_SAFE_INTEGER, Math.round(options.listenedSec)),
  );
  const playedAt = options.playedAt ?? new Date().toISOString();
  return {
    id: options.id ?? `listen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    trackId: track.id,
    title: track.title,
    artistId: track.artistId,
    artistName: track.artistName,
    albumId: track.albumId,
    albumTitle: track.albumTitle,
    durationSec,
    listenedSec,
    playedAt,
    source: sourceForTrack(track),
    provider: track.provider,
    providerTrackId: track.providerTrackId,
    genre: track.genre,
    mood: track.mood,
    palette: track.palette,
    artworkUri: remoteArtwork(track.artworkUri),
    completed: durationSec > 0 && listenedSec >= durationSec * 0.85,
  };
}

/** Insert or replace the same session id, then keep the newest bounded list. */
export function mergeHistoryEntries(
  existing: ListeningHistoryEntry[],
  incoming: ListeningHistoryEntry[],
  cap = MAX_HISTORY_ENTRIES,
): ListeningHistoryEntry[] {
  const map = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of incoming) map.set(entry.id, entry);
  return [...map.values()]
    .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
    .slice(0, cap);
}

export function searchHistory(
  entries: ListeningHistoryEntry[],
  rawQuery: string,
): ListeningHistoryEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return entries;
  return entries.filter((entry) =>
    [entry.title, entry.artistName, entry.albumTitle, entry.genre, entry.mood]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query)),
  );
}

export interface MergeRemoteHistoryInput {
  local: ListeningHistoryEntry[];
  remote: ListeningHistoryEntry[];
  deletedIds?: string[];
  /** History older than this was intentionally cleared locally. */
  clearedAt?: string | null;
  cap?: number;
}

/**
 * Listening history is an additive log. Entries are merged by session id and
 * the longest measured listen wins; local-only entries are queued for upload.
 * This never invents plays and never replaces a longer local listen with a
 * shorter remote one.
 */
export function mergeRemoteHistory({
  local,
  remote,
  deletedIds = [],
  clearedAt,
  cap = MAX_HISTORY_ENTRIES,
}: MergeRemoteHistoryInput): {
  history: ListeningHistoryEntry[];
  push: ListeningHistoryEntry[];
} {
  const cutoff = clearedAt ? Date.parse(clearedAt) : 0;
  const deleted = new Set(deletedIds);
  const usableLocal = local.filter(
    (entry) => (!cutoff || Date.parse(entry.playedAt) > cutoff) && !deleted.has(entry.id),
  );
  const localMap = new Map(usableLocal.map((entry) => [entry.id, entry]));
  const remoteMap = new Map<string, ListeningHistoryEntry>();

  for (const entry of remote) {
    const playedAt = Date.parse(entry.playedAt);
    if (deleted.has(entry.id) || (cutoff && playedAt <= cutoff)) continue;
    remoteMap.set(entry.id, entry);
    const existing = localMap.get(entry.id);
    if (!existing || entry.listenedSec > existing.listenedSec) {
      localMap.set(entry.id, entry);
    }
  }

  const push = usableLocal.filter((entry) => {
    const remoteEntry = remoteMap.get(entry.id);
    return !remoteEntry || entry.listenedSec > remoteEntry.listenedSec;
  });

  return {
    history: [...localMap.values()]
      .sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt))
      .slice(0, cap),
    push,
  };
}

/** Reconstruct a renderable track from history; audio is resolved by the app. */
export function historyTrack(entry: ListeningHistoryEntry): Track {
  return {
    id: entry.trackId,
    title: entry.title,
    artistId: entry.artistId ?? 'history',
    artistName: entry.artistName,
    albumId: entry.albumId ?? 'history',
    albumTitle: entry.albumTitle,
    durationSec: entry.durationSec,
    palette: entry.palette,
    provider: entry.provider,
    providerTrackId: entry.providerTrackId,
    genre: entry.genre,
    mood: entry.mood,
    artworkUri: entry.artworkUri,
  };
}
