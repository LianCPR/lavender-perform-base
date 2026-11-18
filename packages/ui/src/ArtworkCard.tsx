import { elevationStyle, useTheme } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Artwork } from './Artwork';
import { GlassSurface } from './GlassSurface';
import { Icon } from './Icon';
import { Interactive } from './interaction/Interactive';
import { Text } from './Text';

export interface ArtworkCardProps {
  title: string;
  subtitle?: string;
  palette: ArtworkPalette;
  monogram?: string;
  onPress?: () => void;
  /** Fixed width in a horizontal row; omit inside a grid. */
  width?: number;
  /** Shows a play affordance on hover (desktop) / always on narrow cards. */
  showPlayAffordance?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Remote provider artwork; the palette cover is the fallback. */
  artworkUri?: string;
}

/**
 * Square cover + two lines of metadata.
 *
 * The artwork keeps a near-square radius; only artist avatars are circular.
 * On hover the cover lifts with a soft shadow and reveals a glass play badge.
 */
export function ArtworkCard({
  title,
  subtitle,
  palette,
  monogram,
  onPress,
  width,
  showPlayAffordance = true,
  style,
  accessibilityLabel,
  artworkUri,
}: ArtworkCardProps) {
  const theme = useTheme();

  return (
    <Interactive
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `, ${subtitle}` : ''}`}
      onPress={onPress}
      disabled={!onPress}
      focusRadius={theme.radius.artwork}
      style={[{ width, gap: theme.spacing.sm }, style]}>
      {({ hovered }) => (
        <>
          <View
            style={[
              {
                borderRadius: theme.radius.artwork,
                transform: [{ translateY: hovered ? -4 : 0 }],
              },
              hovered ? elevationStyle(theme.elevation.medium) : null,
            ]}>
            <Artwork
              palette={palette}
              monogram={monogram}
              uri={artworkUri}
              style={width ? { width, height: width } : styles.fluidArtwork}
            />
            {showPlayAffordance && onPress ? (
              <View
                pointerEvents="none"
                style={[
                  styles.badgeWrap,
                  {
                    opacity: hovered ? 1 : 0,
                    transform: [{ scale: hovered ? 1 : 0.9 }],
                  },
                ]}>
                <GlassSurface
                  material="thin"
                  cornerRadius={theme.radius.pill}
                  style={styles.playBadge}>
                  <Icon
                    name="play"
                    size={15}
                    color={theme.isDark ? '#FFFFFF' : '#241F2A'}
                    style={{ marginLeft: 1 }}
                  />
                </GlassSurface>
              </View>
            ) : null}
          </View>
          <View style={{ gap: 2 }}>
            <Text variant="headline" numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant="secondary" tone="secondary" numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </>
      )}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  fluidArtwork: {
    width: '100%',
    aspectRatio: 1,
  },
  badgeWrap: {
    position: 'absolute',
    right: 9,
    bottom: 9,
  },
  playBadge: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
});
