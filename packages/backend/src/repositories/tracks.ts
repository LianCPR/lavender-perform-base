import type { AudioFormat } from '@lavender/shared';

import type { LavenderSupabaseClient } from '../client';
import type { CloudTrack } from '../sync/types';
import type { LocalImport } from '../sync/local';

interface ImportJoinRow {
  track_key: string;
  file_name: string | null;
  added_at: string | null;
  tracks:
    | {
        client_key: string;
        title: string;
        artist_name: string | null;
        album_title: string | null;
        duration_sec: number;
        palette: string;
        audio_format: AudioFormat | null;
      }
    | null;
}

/** Which of these client keys exist (catalog seed or this user's imports)? */
export async function existingTrackKeys(
  client: LavenderSupabaseClient,
  keys: string[],
): Promise<Set<string>> {
  const unique = [...new Set(keys)].filter(Boolean);
  if (unique.length === 0) return new Set();
  const { data, error } = await client.rpc('track_keys_exist', { p_keys: unique });
  if (error) throw new Error(`Could not check track keys: ${error.message}`);
  return new Set((data ?? []).map((row) => row.client_key));
}

/**
 * Uploads metadata for imported files and returns every key that may be
 * referenced by library rows. Audio bytes are never sent.
 */
export async function ensureImportedTrackMetadata(
  client: LavenderSupabaseClient,
  userId: string,
  imports: LocalImport[],
): Promise<Set<string>> {
  if (imports.length === 0) return existingTrackKeys(client, []);

  const rows = imports.map((item) => ({
    client_key: item.track.id,
    title: item.track.title,
    artist_name: item.track.artistName,
    album_title: item.track.albumTitle,
    duration_sec: Math.max(0, Math.round(item.track.durationSec)),
    palette: item.track.palette,
    source: 'local_import' as const,
    audio_format: item.format,
    owner_id: userId,
  }));

  // Metadata edits (renamed imports) are allowed to update the owner's rows;
  // catalog rows are protected by RLS because their owner_id is null.
  const { error: trackError } = await client
    .from('tracks')
    .upsert(rows, { onConflict: 'client_key' });
  if (trackError) throw new Error(`Could not sync track metadata: ${trackError.message}`);

  const importRows = imports.map((item) => ({
    user_id: userId,
    track_key: item.track.id,
    file_name: item.fileName,
    mime_type: item.mimeType,
    added_at: item.addedAt,
  }));
  const { error: importError } = await client
    .from('user_imports')
    .upsert(importRows, { onConflict: 'user_id,track_key' });
  if (importError) throw new Error(`Could not sync import records: ${importError.message}`);

  return existingTrackKeys(
    client,
    imports.map((item) => item.track.id),
  );
}

/** Removes import records for files the listener deleted on this device. */
export async function deleteImportRecords(
  client: LavenderSupabaseClient,
  userId: string,
  trackKeys: string[],
): Promise<void> {
  if (trackKeys.length === 0) return;
  const { error } = await client
    .from('user_imports')
    .delete()
    .eq('user_id', userId)
    .in('track_key', trackKeys);
  if (error) throw new Error(`Could not remove import records: ${error.message}`);
}

/** Imported-file metadata that exists in the cloud for this user. */
export async function fetchCloudTracks(
  client: LavenderSupabaseClient,
  userId: string,
): Promise<CloudTrack[]> {
  const { data, error } = await client
    .from('user_imports')
    .select(
      'track_key, file_name, added_at, tracks!inner(client_key, title, artist_name, album_title, duration_sec, palette, audio_format)',
    )
    .eq('user_id', userId)
    .order('added_at', { ascending: false });

  if (error) throw new Error(`Could not load cloud tracks: ${error.message}`);

  return ((data ?? []) as unknown as ImportJoinRow[])
    .filter((row) => row.tracks)
    .map((row) => ({
      key: row.track_key,
      title: row.tracks?.title ?? 'Imported track',
      artistName: row.tracks?.artist_name ?? 'Unknown artist',
      albumTitle: row.tracks?.album_title ?? 'Imported music',
      durationSec: row.tracks?.duration_sec ?? 0,
      palette: row.tracks?.palette ?? 'haze',
      format: row.tracks?.audio_format ?? null,
      fileName: row.file_name,
      addedAt: row.added_at,
    }));
}
