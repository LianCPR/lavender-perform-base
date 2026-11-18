import { elevationStyle, useTheme } from '@lavender/design-system';
import { pluralize, type Genre } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Icon } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export interface GenreCardProps {
  genre: Genre;
  albumCount?: number;
  onPress?: () => void;
}

const INK = '#241F2A';
const INK_MUTED = 'rgba(36, 31, 42, 0.66)';

/**
 * Category tile: a bright palette gradient with a soft highlight, the genre name
 * in ink and a quiet play chip. The ink label keeps contrast on pale covers in
 * both themes.
 */
export function GenreCard({ genre, albumCount, onPress }: GenreCardProps) {
  const theme = useTheme();
  const [from, to] = theme.artwork[genre.palette];

  return (
    <Interactive
      onPress={onPress}
      accessibilityLabel={`${genre.name} category${
        albumCount === undefined ? '' : `, ${pluralize(albumCount, 'album')}`
      }`}
      focusRadius={theme.radius.lg}
      style={{ borderRadius: theme.radius.lg }}>
      {({ hovered }) => (
        <View
          style={{
            borderRadius: theme.radius.lg,
            overflow: 'hidden',
            minHeight: 112,
            transform: [{ translateY: hovered ? -3 : 0 }],
            ...(hovered ? elevationStyle(theme.elevation.medium) : null),
          }}>
          <LinearGradient
            colors={[from, to]}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.8, y: 0.9 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              'rgba(255,255,255,0)',
              'rgba(255,255,255,0.14)',
              'rgba(255,255,255,0)',
            ]}
            locations={[0.3, 0.5, 0.7]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View
            style={{
              flex: 1,
              minHeight: 112,
              padding: theme.spacing.md,
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: theme.spacing.sm,
              }}>
              <Text
                variant="subheading"
                numberOfLines={2}
                style={{ color: INK, letterSpacing: -0.3, flex: 1 }}>
                {genre.name}
              </Text>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.52)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.6)',
                  opacity: hovered ? 1 : 0.88,
                }}>
                <Icon name="play" size={12} color={INK} style={{ marginLeft: 1 }} />
              </View>
            </View>

            <Text variant="caption" numberOfLines={1} style={{ color: INK_MUTED }}>
              {albumCount === undefined ? 'Station' : pluralize(albumCount, 'album')}
            </Text>
          </View>
        </View>
      )}
    </Interactive>
  );
}
