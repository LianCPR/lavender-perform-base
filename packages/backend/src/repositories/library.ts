import type { ID } from '@lavender/shared';

import type { LavenderSupabaseClient } from '../client';
import type { RemoteFavorite, RemotePreferences, RemoteRecent } from '../sync/types';

interface PlaylistJoinRow {
  id: string;
  name: string;
  description: string | null;
  palette: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  playlist_tracks: { track_key: string; position: number }[] | null;
}

export async function fetchFavorites(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<RemoteFavorite[]> {
  const { data, error } = await client
    .from('library_favorites')
    .select('track_key, updated_at, deleted_at')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not load favorites: ${error.message}`);
  return (data ?? []).map((row) => ({
    trackKey: row.track_key,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  }));
}

export async function fetchRecents(
  client: LavenderSupabaseClient,
  userId: string,
  limit = 24,
): Promise<RemoteRecent[]> {
  const { data, error } = await client
    .from('recently_played')
    .select('track_key, played_at, updated_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load recent plays: ${error.message}`);
  return (data ?? []).map((row) => ({
    trackKey: row.track_key,
    playedAt: row.played_at,
    updatedAt: row.updated_at,
  }));
}

export async function fetchPreferences(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<RemotePreferences | null> {
  const { data, error } = await client
    .from('user_preferences')
    .select('library_sort, library_view, theme_mode, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load preferences: ${error.message}`);
  if (!data) return null;
  return {
    sort: data.library_sort,
    view: data.library_view,
    themeMode: data.theme_mode,
    updatedAt: data.updated_at,
  };
}

export async function fetchPlaylistRecords(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<PlaylistJoinRow[]> {
  const { data, error } = await client
    .from('playlists')
    .select(
      'id, name, description, palette, created_at, updated_at, deleted_at, playlist_tracks(track_key, position)',
    )
    .eq('user_id', userId);
  if (error) throw new Error(`Could not load playlists: ${error.message}`);
  return (data ?? []) as unknown as PlaylistJoinRow[];
}

export function sortPlaylistTracks(rows: { track_key: string; position: number }[] | null): ID[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((row) => row.track_key);
}

/** Mirrors the local favorites set, soft-deleting rows that were removed. */
export async function pushFavorites(
  client: LavenderSupabaseClient,
  userId: string,
  trackIds: ID[],
  knownKeys: Set<string>,
): Promise<void> {
  const ids = trackIds.filter((id) => knownKeys.has(id));
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await client
    .from('library_favorites')
    .select('track_key, deleted_at')
    .eq('user_id', userId);
  if (readError) throw new Error(`Could not read favorites: ${readError.message}`);

  const removed = (existing ?? [])
    .filter((row) => !ids.includes(row.track_key) && !row.deleted_at)
    .map((row) => row.track_key);

  if (ids.length > 0) {
    const { error } = await client
      .from('library_favorites')
      .upsert(
        ids.map((trackKey) => ({ user_id: userId, track_key: trackKey, deleted_at: null })),
        { onConflict: 'user_id,track_key' },
      );
    if (error) throw new Error(`Could not save favorites: ${error.message}`);
  }

  if (removed.length > 0) {
    const { error } = await client
      .from('library_favorites')
      .update({ deleted_at: now })
      .eq('user_id', userId)
      .in('track_key', removed);
    if (error) throw new Error(`Could not remove favorites: ${error.message}`);
  }
}

export async function pushRecents(
  client: LavenderSupabaseClient,
  userId: string,
  trackIds: ID[],
  knownKeys: Set<string>,
): Promise<void> {
  const ids = trackIds.filter((id) => knownKeys.has(id)).slice(0, 24);
  if (ids.length > 0) {
    const now = Date.now();
    const rows = ids.map((trackKey, index) => ({
      user_id: userId,
      track_key: trackKey,
      played_at: new Date(now - index * 1000).toISOString(),
    }));
    const { error } = await client
      .from('recently_played')
      .upsert(rows, { onConflict: 'user_id,track_key' });
    if (error) throw new Error(`Could not save recent plays: ${error.message}`);
  }

  const { data: existing, error: readError } = await client
    .from('recently_played')
    .select('track_key')
    .eq('user_id', userId);
  if (readError) throw new Error(`Could not read recent plays: ${readError.message}`);
  const stale = (existing ?? []).map((row) => row.track_key).filter((key) => !ids.includes(key));
  if (stale.length > 0) {
    const { error } = await client
      .from('recently_played')
      .delete()
      .eq('user_id', userId)
      .in('track_key', stale);
    if (error) throw new Error(`Could not trim recent plays: ${error.message}`);
  }
}

export async function pushPreferences(
  client: LavenderSupabaseClient,
  userId: string,
  preferences: RemotePreferences,
): Promise<void> {
  const { error } = await client.from('user_preferences').upsert(
    {
      user_id: userId,
      library_sort: preferences.sort,
      library_view: preferences.view,
      theme_mode: preferences.themeMode,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Could not save preferences: ${error.message}`);
}

export { sortPlaylistTracks as playlistTrackIds };
