import { typeScale, useTheme, type TypographyVariant } from '@lavender/design-system';
import { View } from 'react-native';

import { useBreakpoint } from '../../hooks/useBreakpoint';
import { Text } from '../../Text';
import { ShowcaseSection } from './ShowcaseSection';

const SAMPLES: Record<TypographyVariant, string> = {
  display: 'Good evening',
  largeHeading: 'Lavender Hour',
  sectionHeading: 'Recently played',
  subheading: 'Midnight Bloom',
  headline: 'Soft Focus',
  body: 'A quiet place for everything you have been listening to. Neutral surfaces, warm accents, calm motion.',
  callout: 'Play album',
  secondary: 'Aurora Veil · 2025',
  caption: 'Picked up where you left off',
  micro: 'Home',
  label: 'Featured album',
  numeric: '24 songs · 1 hr 42 min',
  playback: '3:42 / 4:05',
};

const ORDER: TypographyVariant[] = [
  'display',
  'largeHeading',
  'sectionHeading',
  'subheading',
  'headline',
  'body',
  'callout',
  'secondary',
  'caption',
  'micro',
  'label',
  'numeric',
  'playback',
];

const ROLE: Record<TypographyVariant, string> = {
  display: 'Hero greeting',
  largeHeading: 'Page title',
  sectionHeading: 'Section title',
  subheading: 'Subsection / sheet title',
  headline: 'Card & row title',
  body: 'Reading copy',
  callout: 'Button & supporting',
  secondary: 'Metadata',
  caption: 'Fine print',
  micro: 'Tab labels',
  label: 'Eyebrow / overline',
  numeric: 'Counts & totals',
  playback: 'Elapsed / remaining',
};

/** Typography scale with live sizes from the theme. */
export function TypographySection() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const factor = typeScale[breakpoint];

  return (
    <ShowcaseSection
      title="Typography"
      description={`System UI font at every size. The ramp scales ${factor}× at this breakpoint (${breakpoint}); numeric styles use tabular figures so times never shift.`}>
      <View style={{ gap: theme.spacing.lg }}>
        {ORDER.map((variant) => {
          const style = theme.typography[variant];
          return (
            <View
              key={variant}
              style={{
                gap: 2,
                paddingBottom: theme.spacing.md,
                borderBottomWidth: theme.border.hairline,
                borderBottomColor: theme.colors.divider,
              }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <Text variant="micro" tone="accent" style={{ textTransform: 'uppercase' }}>
                  {variant}
                </Text>
                <Text variant="playback" tone="tertiary">
                  {style.fontSize}/{style.lineHeight} · {String(style.fontWeight)} · {ROLE[variant]}
                </Text>
              </View>
              <Text variant={variant} numberOfLines={2}>
                {SAMPLES[variant]}
              </Text>
            </View>
          );
        })}
      </View>
    </ShowcaseSection>
  );
}
