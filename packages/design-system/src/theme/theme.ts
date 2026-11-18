import type { ArtworkPalette } from '@lavender/shared';
import type { BorderWidth } from '../tokens/border';
import { borderWidth } from '../tokens/border';
import type { GlassMaterials } from '../tokens/glass';
import type { Layout } from '../tokens/layout';
import { layout } from '../tokens/layout';
import type { Motion, Opacity } from '../tokens/motion';
import { motion, opacity } from '../tokens/motion';
import type { Radius } from '../tokens/radius';
import { radius } from '../tokens/radius';
import type { Spacing } from '../tokens/spacing';
import { spacing } from '../tokens/spacing';
import type { Typography } from '../tokens/typography';
import { typography } from '../tokens/typography';
import { darkArtwork, lightArtwork } from './artwork';
import type { ThemeColors } from './colors';
import { darkColors, lightColors } from './colors';
import type { Elevations } from './elevation';
import { darkElevations, lightElevations } from './elevation';
import { darkGlass, lightGlass } from './glass';

export type AppScheme = 'light' | 'dark';

export interface Theme {
  scheme: AppScheme;
  isDark: boolean;
  colors: ThemeColors;
  glass: GlassMaterials;
  artwork: Record<ArtworkPalette, [string, string]>;
  radius: Radius;
  spacing: Spacing;
  typography: Typography;
  layout: Layout;
  motion: Motion;
  border: BorderWidth;
  elevation: Elevations;
  opacity: Opacity;
}

/** Build a fully resolved theme for one color scheme. */
export function createTheme(scheme: AppScheme): Theme {
  const isDark = scheme === 'dark';
  return {
    scheme,
    isDark,
    colors: isDark ? darkColors : lightColors,
    glass: isDark ? darkGlass : lightGlass,
    artwork: isDark ? darkArtwork : lightArtwork,
    radius,
    spacing,
    typography,
    layout,
    motion,
    border: borderWidth,
    elevation: isDark ? darkElevations : lightElevations,
    opacity,
  };
}
