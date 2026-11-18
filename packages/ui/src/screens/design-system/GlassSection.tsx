import { glassVariantMaterial, useTheme, type GlassVariant } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { GlassSurface } from '../../GlassSurface';
import { Text } from '../../Text';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

const VARIANTS: { variant: GlassVariant; label: string; usage: string }[] = [
  { variant: 'subtle', label: 'Subtle', usage: 'Chips, fields, dense list panels' },
  { variant: 'standard', label: 'Standard', usage: 'Default panels and station rows' },
  { variant: 'prominent', label: 'Prominent', usage: 'Player, overlays, modal chrome' },
];

/** Hands-on glass specimens rendered over artwork light. */
export function GlassSection() {
  const theme = useTheme();

  return (
    <ShowcaseSection
      title="Liquid Glass"
      description="Three intentional variants, each a blur + tint + edge + sheen stack. Glass is only used for navigation, floating controls, players and selected surfaces — never for every card.">
      <View style={{ gap: theme.spacing.md }}>
        <LinearGradient
          colors={theme.artwork.lavender}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: theme.radius.xl, padding: theme.spacing.xl }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {VARIANTS.map(({ variant, label, usage }) => {
              const material = theme.glass[glassVariantMaterial[variant]];
              return (
                <GlassSurface
                  key={variant}
                  variant={variant}
                  cornerRadius={theme.radius.card}
                  style={{ width: 208, padding: theme.spacing.lg, gap: 4 }}>
                  <Text variant="headline">{label}</Text>
                  <Text variant="micro" tone="secondary">
                    {usage}
                  </Text>
                  <Text variant="playback" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
                    blur {material.blurPx}px · i {material.intensity}
                  </Text>
                  <Text variant="playback" tone="tertiary">
                    edge {material.borderWidth}px · lift {material.shadowRadius}px
                  </Text>
                </GlassSurface>
              );
            })}
          </View>
        </LinearGradient>

        <View>
          <SpecimenLabel>Chrome materials</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {(['navigation', 'player', 'overlay'] as const).map((material) => {
              const spec = theme.glass[material];
              return (
                <GlassSurface
                  key={material}
                  material={material}
                  cornerRadius={theme.radius.lg}
                  style={{
                    flex: 1,
                    minWidth: 150,
                    padding: theme.spacing.md,
                    gap: 2,
                  }}>
                  <Text variant="caption">{material}</Text>
                  <Text variant="playback" tone="tertiary">
                    blur {spec.blurPx}px · i {spec.intensity}
                  </Text>
                </GlassSurface>
              );
            })}
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}
