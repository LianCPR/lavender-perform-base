import type { LavenderSupabaseClient } from '../client';
import type { PlaybackSlice } from '../sync/local';
import type { RemotePlayback } from '../sync/types';

export async function fetchPlayback(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<RemotePlayback | null> {
  const { data, error } = await client
    .from('playback_state')
    .select('shuffle, repeat_mode, volume, last_track_key, position_sec, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not load playback state: ${error.message}`);
  if (!data) return null;
  return {
    shuffle: data.shuffle,
    repeat: data.repeat_mode,
    volume: Number(data.volume),
    lastTrackKey: data.last_track_key,
    positionSec: Number(data.position_sec),
    updatedAt: data.updated_at,
  };
}

/** Stores playback preferences and the last position; audio never leaves the device. */
export async function pushPlayback(
  client: LavenderSupabaseClient,
  userId: string,
  playback: PlaybackSlice,
  knownKeys: Set<string>,
): Promise<string> {
  const lastTrackKey =
    playback.currentTrackId && knownKeys.has(playback.currentTrackId)
      ? playback.currentTrackId
      : null;
  const queueKeys = playback.queueIds.filter((id) => knownKeys.has(id));
  const { data, error } = await client
    .from('playback_state')
    .upsert(
      {
        user_id: userId,
        shuffle: playback.shuffle,
        repeat_mode: playback.repeat,
        volume: Math.min(1, Math.max(0, playback.volume)),
        last_track_key: lastTrackKey,
        position_sec: Math.max(0, playback.positionSec),
        queue_keys: queueKeys,
      },
      { onConflict: 'user_id' },
    )
    .select('updated_at')
    .single();
  if (error) throw new Error(`Could not save playback state: ${error.message}`);
  return data?.updated_at ?? new Date().toISOString();
}
