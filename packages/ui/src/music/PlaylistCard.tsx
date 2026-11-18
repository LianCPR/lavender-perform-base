import { pluralize, type Playlist } from '@lavender/shared';
import type { StyleProp, ViewStyle } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';

export interface PlaylistCardProps {
  playlist: Playlist;
  onPress?: () => void;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/** Playlist presentation: artwork with song count and curated flag. */
export function PlaylistCard({ playlist, onPress, width, style }: PlaylistCardProps) {
  const subtitle = playlist.curated
    ? `${pluralize(playlist.trackIds.length, 'song')} · Curated`
    : pluralize(playlist.trackIds.length, 'song');

  return (
    <ArtworkCard
      title={playlist.name}
      subtitle={subtitle}
      palette={playlist.palette}
      onPress={onPress}
      width={width}
      style={style}
      accessibilityLabel={`Playlist ${playlist.name}, ${pluralize(playlist.trackIds.length, 'song')}`}
    />
  );
}
