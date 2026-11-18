import type { Album } from '@lavender/shared';
import type { StyleProp, ViewStyle } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';

export interface AlbumCardProps {
  album: Album;
  onPress?: () => void;
  width?: number;
  /** Include year in the metadata line. */
  showYear?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Album presentation: square artwork with title and artist metadata. */
export function AlbumCard({ album, onPress, width, showYear = false, style }: AlbumCardProps) {
  return (
    <ArtworkCard
      title={album.title}
      subtitle={showYear ? `${album.artistName} · ${album.year}` : album.artistName}
      palette={album.palette}
      onPress={onPress}
      width={width}
      style={style}
      accessibilityLabel={`${album.title} by ${album.artistName}`}
    />
  );
}
