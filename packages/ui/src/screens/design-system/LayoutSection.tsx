import {
  elevationStyle,
  iconSize,
  useTheme,
  type ElevationKey,
  type IconSizeKey,
  type RadiusKey,
  type SpacingKey,
} from '@lavender/design-system';
import { View } from 'react-native';

import { Icon } from '../../Icon';
import { Text } from '../../Text';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

const ELEVATIONS: ElevationKey[] = ['low', 'medium', 'high', 'floating'];
const ICONS: IconSizeKey[] = ['xs', 'sm', 'md', 'lg', 'xl', 'hero'];

/** Spacing, geometry, depth and icon sizing — the layout primitives. */
export function LayoutSection() {
  const theme = useTheme();
  const spacingKeys = Object.keys(theme.spacing) as SpacingKey[];
  const radiusKeys = Object.keys(theme.radius) as RadiusKey[];

  return (
    <ShowcaseSection
      title="Spacing, geometry & depth"
      description="A 4pt spacing scale, mixed corner radii (artwork stays nearly square), five elevation levels and a six-step icon scale.">
      <View style={{ gap: theme.spacing.xl }}>
        <View>
          <SpecimenLabel>Spacing scale</SpecimenLabel>
          <View style={{ gap: 6 }}>
            {spacingKeys.map((key) => (
              <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Text variant="playback" tone="tertiary" style={{ width: 56 }}>
                  {key}
                </Text>
                <View
                  style={{
                    width: Math.max(theme.spacing[key] * 3, 2),
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: theme.colors.accent,
                    opacity: 0.75,
                  }}
                />
                <Text variant="playback" tone="tertiary">
                  {theme.spacing[key]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <SpecimenLabel>Corner radii</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {radiusKeys.map((key) => (
              <View key={key} style={{ alignItems: 'center', gap: 4, width: 64 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: Math.min(theme.radius[key], 28),
                    backgroundColor: theme.colors.surfaceMuted,
                    borderWidth: theme.border.hairline,
                    borderColor: theme.colors.border,
                  }}
                />
                <Text variant="micro" tone="tertiary">
                  {key}
                </Text>
                <Text variant="playback" tone="tertiary">
                  {theme.radius[key] === 999 ? 'pill' : theme.radius[key]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <SpecimenLabel>Elevation</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {ELEVATIONS.map((key) => (
              <View
                key={key}
                style={[
                  {
                    width: 140,
                    height: 72,
                    borderRadius: theme.radius.card,
                    backgroundColor: theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  elevationStyle(theme.elevation[key]),
                ]}>
                <Text variant="caption">{key}</Text>
                <Text variant="playback" tone="tertiary">
                  {theme.elevation[key].shadowRadius}px · {theme.elevation[key].shadowOpacity}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <SpecimenLabel>Icon scale (outline = idle, filled = active)</SpecimenLabel>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: theme.spacing.xl }}>
            {ICONS.map((key) => (
              <View key={key} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                  <Icon name="musical-notes-outline" size={iconSize[key]} color={theme.colors.textSecondary} />
                  <Icon name="musical-notes" size={iconSize[key]} color={theme.colors.accent} />
                </View>
                <Text variant="micro" tone="tertiary">
                  {key} · {iconSize[key]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}
