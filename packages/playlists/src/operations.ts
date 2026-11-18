import type { ArtworkPalette, ID, Playlist, Track } from '@lavender/shared';

let sequence = 0;

/** Deterministic-enough client id; replaced by server ids in Phase 04. */
function createId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

export interface CreatePlaylistInput {
  name: string;
  palette?: ArtworkPalette;
  description?: string;
  trackIds?: ID[];
  curated?: boolean;
}

export function createPlaylist({
  name,
  palette = 'lavender',
  description,
  trackIds = [],
  curated = false,
}: CreatePlaylistInput): Playlist {
  return {
    id: createId('playlist'),
    name,
    description,
    palette,
    trackIds: dedupe(trackIds),
    createdAt: new Date().toISOString(),
    curated,
  };
}

/** Append tracks, skipping duplicates while preserving order. */
export function addTracks(playlist: Playlist, trackIds: ID[]): Playlist {
  return { ...playlist, trackIds: dedupe([...playlist.trackIds, ...trackIds]) };
}

export function removeTrack(playlist: Playlist, trackId: ID): Playlist {
  return { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) };
}

/** Move a track within the playlist, clamped to valid bounds. */
export function moveTrack(playlist: Playlist, from: number, to: number): Playlist {
  const ids = [...playlist.trackIds];
  if (from < 0 || from >= ids.length) return playlist;
  const target = Math.min(Math.max(to, 0), ids.length - 1);
  const [moved] = ids.splice(from, 1);
  if (!moved) return playlist;
  ids.splice(target, 0, moved);
  return { ...playlist, trackIds: ids };
}

export function playlistDurationSec(playlist: Playlist, tracksById: Record<ID, Track>): number {
  return playlist.trackIds.reduce((total, id) => total + (tracksById[id]?.durationSec ?? 0), 0);
}

function dedupe(ids: ID[]): ID[] {
  return Array.from(new Set(ids));
}
