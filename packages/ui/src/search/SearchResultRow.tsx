import { useTheme } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { Icon, type IconName } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export type SearchResultKind = 'album' | 'artist' | 'playlist' | 'genre';

const KIND_META: Record<SearchResultKind, { label: string; icon: IconName }> = {
  album: { label: 'Album', icon: 'disc-outline' },
  artist: { label: 'Artist', icon: 'person-outline' },
  playlist: { label: 'Playlist', icon: 'list-outline' },
  genre: { label: 'Genre', icon: 'grid-outline' },
};

export interface SearchResultRowProps {
  title: string;
  subtitle?: string;
  palette: ArtworkPalette;
  kind: SearchResultKind;
  onPress?: () => void;
  onPlay?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One line for a non-track search result. The row press and the play control
 * are siblings, so no button is ever nested inside another.
 */
export function SearchResultRow({
  title,
  subtitle,
  palette,
  kind,
  onPress,
  onPlay,
  style,
}: SearchResultRowProps) {
  const theme = useTheme();
  const meta = KIND_META[kind];
  const circular = kind === 'artist';

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }, style]}>
      <Interactive
        onPress={onPress}
        accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
        focusRadius={theme.radius.sm}
        style={{ flex: 1, borderRadius: theme.radius.sm }}>
        {({ hovered }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor: hovered ? theme.colors.hover : 'transparent',
            }}>
            <Artwork
              palette={palette}
              size={44}
              cornerRadius={circular ? theme.radius.pill : 9}
            />
            <View style={{ flex: 1, gap: 1, minWidth: 0 }}>
              <Text variant="headline" numberOfLines={1}>
                {title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name={meta.icon} size={11} color={theme.colors.textTertiary} />
                <Text variant="secondary" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                  {subtitle ?? meta.label}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Interactive>

      {onPlay ? (
        <IconButton icon="play" label={`Play ${title}`} size="sm" onPress={onPlay} />
      ) : (
        <Icon name="chevron-forward" size={15} color={theme.colors.textTertiary} />
      )}
    </View>
  );
}
