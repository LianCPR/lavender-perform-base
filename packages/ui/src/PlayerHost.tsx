import { useLibrary } from '@lavender/music-library';
import { PlayerProvider } from '@lavender/music-player';
import { getProvider } from '@lavender/music-providers';
import type { ReactNode } from 'react';

export interface PlayerHostProps {
  children: ReactNode;
}

/**
 * Wires the single player to the live library.
 *
 * It exists so `PlayerProvider` can stay independent of the library package:
 * the host supplies id resolution and the merged track list, including files
 * whose audio URI arrives asynchronously after import hydration.
 */
export function PlayerHost({ children }: PlayerHostProps) {
  const library = useLibrary();
  return (
    <PlayerProvider
      resolveTrack={(id) => library.trackById(id)}
      availableTracks={library.allTracks}
      resolveProviderTrack={async (track) => {
        const provider = track.provider ? getProvider(track.provider) : undefined;
        if (!provider?.resolvePlayback) {
          throw new Error('Online playback is not available for this track.');
        }
        // The provider re-checks gates and deleted content before returning a
        // short-lived authorized stream URL.
        const source = await provider.resolvePlayback({ track });
        library.cacheOnlineTracks([track]);
        return {
          ...track,
          externalUrl: source.externalUrl ?? track.externalUrl,
          audio: {
            uri: source.uri,
            mimeType: source.mimeType,
            format: source.format,
          },
        };
      }}>
      {children}
    </PlayerProvider>
  );
}
