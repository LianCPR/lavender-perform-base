import { useTheme } from '@lavender/design-system';
import type { Artist } from '@lavender/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Artwork } from '../Artwork';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export interface ArtistCardProps {
  artist: Artist;
  onPress?: () => void;
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Artist presentation.
 *
 * This is the one intentional circular artwork in the system — a portrait reads
 * as a person, while albums always stay square.
 */
export function ArtistCard({ artist, onPress, width, style }: ArtistCardProps) {
  const theme = useTheme();

  return (
    <Interactive
      onPress={onPress}
      accessibilityLabel={artist.name}
      focusRadius={theme.radius.pill}
      style={[{ width, gap: theme.spacing.sm, borderRadius: theme.radius.pill }, style]}>
      {() => (
        <>
          <Artwork
            palette={artist.palette}
            cornerRadius={theme.radius.pill}
            style={
              width
                ? { width, height: width, borderRadius: width / 2 }
                : { width: '100%', aspectRatio: 1, borderRadius: 999 }
            }
          />
          <View style={{ gap: 1, alignItems: width ? 'flex-start' : 'center' }}>
            <Text variant="headline" numberOfLines={1}>
              {artist.name}
            </Text>
            <Text variant="secondary" tone="secondary">
              Artist
            </Text>
          </View>
        </>
      )}
    </Interactive>
  );
}
