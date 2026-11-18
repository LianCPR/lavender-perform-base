import { useTheme } from '@lavender/design-system';
import type { Playlist } from '@lavender/shared';
import { View } from 'react-native';

import { useBreakpoint } from '../hooks/useBreakpoint';
import { PlaylistCard } from '../music/PlaylistCard';

export interface PlaylistGridProps {
  playlists: Playlist[];
  onOpen?: (playlist: Playlist) => void;
  /** Overrides the breakpoint column count. */
  columns?: number;
}

/** Consistent playlist wall: 2 → 4 columns as the window grows. */
export function PlaylistGrid({ playlists, onOpen, columns }: PlaylistGridProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const count =
    columns ?? (breakpoint === 'compact' ? 2 : breakpoint === 'medium' ? 3 : 4);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm }}>
      {playlists.map((playlist) => (
        <View
          key={playlist.id}
          style={{
            width: `${100 / count}%`,
            paddingHorizontal: theme.spacing.sm,
            paddingBottom: theme.spacing.lg,
          }}>
          <PlaylistCard
            playlist={playlist}
            onPress={onOpen ? () => onOpen(playlist) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
