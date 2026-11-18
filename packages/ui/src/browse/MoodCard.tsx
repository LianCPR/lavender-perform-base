import { elevationStyle, useTheme } from '@lavender/design-system';
import { pluralize, type Mood } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Icon } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export interface MoodCardProps {
  mood: Mood;
  trackCount?: number;
  onPress?: () => void;
}

const INK = '#241F2A';
const INK_MUTED = 'rgba(36, 31, 42, 0.64)';

/** Mood & activities tile: gradient panel, one-line description, play disc. */
export function MoodCard({ mood, trackCount, onPress }: MoodCardProps) {
  const theme = useTheme();
  const [from, to] = theme.artwork[mood.palette];

  return (
    <Interactive
      onPress={onPress}
      accessibilityLabel={`${mood.name} collection`}
      focusRadius={theme.radius.lg}
      style={{ borderRadius: theme.radius.lg }}>
      {({ hovered }) => (
        <View
          style={{
            borderRadius: theme.radius.lg,
            overflow: 'hidden',
            minHeight: 132,
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
            colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']}
            locations={[0, 0.55, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.85, y: 0.95 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
            locations={[0.32, 0.5, 0.68]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <View
            style={{
              flex: 1,
              minHeight: 132,
              padding: theme.spacing.md,
              justifyContent: 'space-between',
              gap: theme.spacing.sm,
            }}>
            <View style={{ gap: 4 }}>
              <Text
                variant="subheading"
                numberOfLines={1}
                style={{ color: INK, letterSpacing: -0.3 }}>
                {mood.name}
              </Text>
              {mood.description ? (
                <Text variant="caption" numberOfLines={2} style={{ color: INK_MUTED }}>
                  {mood.description}
                </Text>
              ) : null}
            </View>

            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="micro" numberOfLines={1} style={{ color: INK_MUTED }}>
                {trackCount === undefined ? 'Collection' : pluralize(trackCount, 'song')}
              </Text>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.72)',
                  opacity: hovered ? 1 : 0.92,
                }}>
                <Icon name="play" size={13} color={INK} style={{ marginLeft: 1 }} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Interactive>
  );
}
