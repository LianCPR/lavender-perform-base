import { brand, useTheme } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';
import { Text } from '../../Text';

const BRAND = [
  { name: 'Dusty Rose', value: brand.dustyRose, role: 'Primary accent' },
  { name: 'Lavender Pink', value: brand.lavenderPink, role: 'Secondary accent' },
  { name: 'Royal Purple', value: brand.royalPurple, role: 'Filled controls' },
  { name: 'Muted Lavender', value: brand.mutedLavender, role: 'Dark accent' },
  { name: 'Pale Lavender', value: brand.paleLavender, role: 'Dark filled' },
  { name: 'Midnight', value: brand.midnight, role: 'Depth reference' },
];

/** Brand palette plus the semantic tokens actually used by components. */
export function ColorSection() {
  const theme = useTheme();

  const semantic = [
    { name: 'background', value: theme.colors.background },
    { name: 'surface', value: theme.colors.surface },
    { name: 'surfaceMuted', value: theme.colors.surfaceMuted },
    { name: 'text', value: theme.colors.text },
    { name: 'textSecondary', value: theme.colors.textSecondary },
    { name: 'textTertiary', value: theme.colors.textTertiary },
    { name: 'border', value: theme.colors.border },
    { name: 'accent', value: theme.colors.accent },
    { name: 'accentSoft', value: theme.colors.accentSoft },
    { name: 'accentStrong', value: theme.colors.accentStrong },
    { name: 'accentSubtle', value: theme.colors.accentSubtle },
    { name: 'favorite', value: theme.colors.favorite },
    { name: 'danger', value: theme.colors.danger },
    { name: 'success', value: theme.colors.success },
    { name: 'skeleton', value: theme.colors.skeleton },
    { name: 'navActiveBackground', value: theme.colors.navActiveBackground },
  ];

  return (
    <ShowcaseSection
      title="Color"
      description="Grayscale carries the interface; lavender and pink are reserved for selection, progress, favorites and small highlights.">
      <View style={{ gap: theme.spacing.lg }}>
        <View>
          <SpecimenLabel>Brand accents</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {BRAND.map((color) => (
              <View key={color.name} style={{ width: 128, gap: 6 }}>
                <View
                  style={{
                    height: 56,
                    borderRadius: theme.radius.sm,
                    backgroundColor: color.value,
                    borderWidth: theme.border.hairline,
                    borderColor: theme.colors.border,
                  }}
                />
                <View style={{ gap: 1 }}>
                  <Text variant="caption">{color.name}</Text>
                  <Text variant="playback" tone="tertiary">
                    {color.value}
                  </Text>
                  <Text variant="micro" tone="tertiary">
                    {color.role}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <SpecimenLabel>Semantic tokens (active theme)</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {semantic.map((color) => (
              <View
                key={color.name}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  width: 196,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.sm,
                  borderWidth: theme.border.hairline,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceMuted,
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: color.value,
                    borderWidth: theme.border.hairline,
                    borderColor: theme.colors.borderStrong,
                  }}
                />
                <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                  {color.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <SpecimenLabel>Gradients</SpecimenLabel>
          <LinearGradient
            colors={theme.colors.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ height: 40, borderRadius: theme.radius.sm }}
          />
          <LinearGradient
            colors={theme.colors.progressFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 6, borderRadius: 3 }}
          />
        </View>
      </View>
    </ShowcaseSection>
  );
}
