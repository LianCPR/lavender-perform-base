import { useReducedMotion, useTheme, useThemeMode } from '@lavender/design-system';

import { ButtonsSection } from './design-system/ButtonsSection';
import { ColorSection } from './design-system/ColorSection';
import { FeedbackSection } from './design-system/FeedbackSection';
import { GlassSection } from './design-system/GlassSection';
import { LayoutSection } from './design-system/LayoutSection';
import { MusicSection } from './design-system/MusicSection';
import { NavigationSection } from './design-system/NavigationSection';
import { TypographySection } from './design-system/TypographySection';
import { Chip } from '../Chip';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Screen } from '../Screen';
import { ThemeControl } from '../ThemeControl';

/**
 * Design system preview (Phase 02).
 *
 * A living reference, not the product home screen: every token and component is
 * rendered against the active theme and breakpoint, with interactions live.
 */
export function DesignSystemScreen() {
  const breakpoint = useBreakpoint();
  const { mode } = useThemeMode();
  const reducedMotion = useReducedMotion();

  return (
    <Screen
      eyebrow="Phase 02"
      title="Design system"
      subtitle="Tokens, Liquid Glass materials and every reusable component, rendered with the active theme. Hover, press and tap the specimens — they are live."
      actions={
        <>
          <ThemeControl />
          <Chip label={`${breakpoint} · ${mode}`} icon="resize-outline" />
          {reducedMotion ? <Chip label="Reduced motion" icon="accessibility-outline" selected /> : null}
        </>
      }>
      <TypographySection />
      <ColorSection />
      <LayoutSection />
      <GlassSection />
      <ButtonsSection />
      <NavigationSection />
      <MusicSection />
      <FeedbackSection />

      <ScreenFooter />
    </Screen>
  );
}

function ScreenFooter() {
  const theme = useTheme();

  return (
    <Chip
      label="Tokens documented in docs/design-tokens.md and docs/components.md"
      icon="information-circle-outline"
      style={{ alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceMuted }}
    />
  );
}
