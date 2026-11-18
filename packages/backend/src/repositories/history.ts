import type { ListeningHistoryEntry } from '@lavender/personalization';

import type { LavenderSupabaseClient } from '../client';

export interface RemoteHistoryEntry extends ListeningHistoryEntry {
  deletedAt: string | null;
  updatedAt: string;
}

interface HistoryRow {
  id: string;
  track_key: string;
  title: string;
  artist_id: string | null;
  artist_name: string;
  album_id: string | null;
  album_title: string | null;
  duration_sec: number;
  listened_sec: number;
  played_at: string;
  source: 'local' | 'online';
  provider: string | null;
  provider_track_id: string | null;
  genre: string | null;
  mood: string | null;
  palette: string;
  artwork_url: string | null;
  completed: boolean;
  deleted_at: string | null;
  updated_at: string;
}

export async function fetchListeningHistory(
  client: LavenderSupabaseClient,
  userId: string,
  limit = 300,
): Promise<RemoteHistoryEntry[]> {
  const { data, error } = await client
    .from('listening_history')
    .select(
      'id, track_key, title, artist_id, artist_name, album_id, album_title, duration_sec, listened_sec, played_at, source, provider, provider_track_id, genre, mood, palette, artwork_url, completed, deleted_at, updated_at',
    )
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load listening history: ${error.message}`);

  return (data ?? []).map((row: HistoryRow) => ({
    id: row.id,
    trackId: row.track_key,
    title: row.title,
    artistId: row.artist_id ?? undefined,
    artistName: row.artist_name,
    albumId: row.album_id ?? undefined,
    albumTitle: row.album_title ?? '',
    durationSec: row.duration_sec,
    listenedSec: row.listened_sec,
    playedAt: row.played_at,
    source: row.source,
    provider: row.provider ?? undefined,
    providerTrackId: row.provider_track_id ?? undefined,
    genre: row.genre ?? undefined,
    mood: row.mood ?? undefined,
    palette: row.palette as ListeningHistoryEntry['palette'],
    artworkUri: row.artwork_url ?? undefined,
    completed: row.completed,
    deletedAt: row.deleted_at,
    updatedAt: row.updated_at,
  }));
}

export function toHistoryEntry(remote: RemoteHistoryEntry): ListeningHistoryEntry {
  const { deletedAt: _deletedAt, updatedAt: _updatedAt, ...entry } = remote;
  return entry;
}

/** Additive upsert by session id. Replaying a session updates its measured time. */
export async function pushListeningHistory(
  client: LavenderSupabaseClient,
  userId: string,
  entries: ListeningHistoryEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const rows = entries.map((entry) => ({
    user_id: userId,
    id: entry.id,
    track_key: entry.trackId,
    title: entry.title,
    artist_id: entry.artistId ?? null,
    artist_name: entry.artistName,
    album_id: entry.albumId ?? null,
    album_title: entry.albumTitle,
    duration_sec: entry.durationSec,
    listened_sec: entry.listenedSec,
    played_at: entry.playedAt,
    source: entry.source,
    provider: entry.provider ?? null,
    provider_track_id: entry.providerTrackId ?? null,
    genre: entry.genre ?? null,
    mood: entry.mood ?? null,
    palette: entry.palette,
    artwork_url: entry.artworkUri ?? null,
    completed: entry.completed,
    deleted_at: null,
  }));
  const { error } = await client
    .from('listening_history')
    .upsert(rows, { onConflict: 'user_id,id' });
  if (error) throw new Error(`Could not save listening history: ${error.message}`);
}

/** Tombstones individual sessions so another device does not resurrect them. */
export async function pushHistoryDeletions(
  client: LavenderSupabaseClient,
  userId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await client
    .from('listening_history')
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .in('id', ids);
  if (error) throw new Error(`Could not delete listening history: ${error.message}`);
}

/** Removes remote rows older than an intentional local clear. */
export async function clearHistoryBefore(
  client: LavenderSupabaseClient,
  userId: string,
  clearedAt: string,
): Promise<void> {
  const { error } = await client
    .from('listening_history')
    .delete()
    .eq('user_id', userId)
    .lt('played_at', clearedAt);
  if (error) throw new Error(`Could not clear listening history: ${error.message}`);
}
