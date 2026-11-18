import type { ID, Playlist } from '@lavender/shared';

import type { LavenderSupabaseClient } from '../client';

export interface PushedPlaylist {
  id: ID;
  updatedAt: string;
}

/** Upserts one playlist and replaces its ordered tracks atomically. */
export async function pushPlaylist(
  client: LavenderSupabaseClient,
  userId: string,
  playlist: Playlist,
  knownKeys: Set<string>,
): Promise<PushedPlaylist> {
  const { data, error } = await client
    .from('playlists')
    .upsert(
      {
        id: playlist.id,
        user_id: userId,
        name: playlist.name,
        description: playlist.description ?? null,
        palette: playlist.palette,
        created_at: playlist.createdAt,
        deleted_at: null,
      },
      { onConflict: 'id' },
    )
    .select('updated_at')
    .single();
  if (error) throw new Error(`Could not save playlist: ${error.message}`);

  const trackKeys = playlist.trackIds.filter((id) => knownKeys.has(id));
  const { error: trackError } = await client.rpc('replace_playlist_tracks', {
    p_playlist_id: playlist.id,
    p_track_keys: trackKeys,
  });
  if (trackError) throw new Error(`Could not save playlist tracks: ${trackError.message}`);

  return { id: playlist.id, updatedAt: data?.updated_at ?? new Date().toISOString() };
}

/** Soft-deletes a playlist so the removal reaches other devices. */
export async function pushPlaylistDeletion(
  client: LavenderSupabaseClient,
  userId: string,
  playlistId: ID,
  deletedAt: string,
): Promise<void> {
  const { error } = await client
    .from('playlists')
    .update({ deleted_at: deletedAt })
    .eq('id', playlistId)
    .eq('user_id', userId);
  if (error) throw new Error(`Could not delete playlist: ${error.message}`);
}
