import { brand, neutral } from '../tokens/palette';

/**
 * Semantic colors. Components reference these names, never raw hex values.
 *
 * The foundation is grayscale; brand colors appear only on accents, selection,
 * playback progress and small highlights.
 */
export interface ThemeColors {
  /** Page background. */
  background: string;
  /** Slightly raised background (sheets, headers). */
  backgroundElevated: string;
  /** Card/surface fill for non-glass elements. */
  surface: string;
  /** Muted surface for chips, insets and skeletons. */
  surfaceMuted: string;
  /** Strongest neutral surface (selected rows, thumbnails). */
  surfaceStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Text drawn on top of an accent fill. */
  textInverse: string;

  border: string;
  borderStrong: string;
  divider: string;

  /** Primary accent (dusty rose / muted lavender). */
  accent: string;
  /** Accessible accent for text and small foreground details. */
  accentText: string;
  /** Secondary accent (lavender pink). */
  accentSoft: string;
  /** High-contrast accent used for filled primary controls. */
  accentStrong: string;
  /** Text/icon color on `accentStrong`. */
  onAccent: string;
  /** Translucent accent used for selected backgrounds. */
  accentSubtle: string;
  /** Two-stop gradient for artwork, progress fills and featured surfaces. */
  accentGradient: [string, string];

  favorite: string;
  progressTrack: string;
  progressFill: [string, string];

  overlay: string;
  scrim: string;
  inputBackground: string;
  shadow: string;

  navActiveBackground: string;
  navActiveText: string;
  navIdleText: string;

  // Interaction states
  /** Neutral hover wash for rows and cards. */
  hover: string;
  /** Neutral pressed wash. */
  pressed: string;
  /** Keyboard focus ring color. */
  focusRing: string;

  // Feedback
  danger: string;
  dangerSubtle: string;
  success: string;

  // Placeholders
  skeleton: string;
  skeletonHighlight: string;
}

export const lightColors: ThemeColors = {
  background: '#FAFAFA',
  backgroundElevated: neutral[0],
  surface: neutral[0],
  surfaceMuted: '#F2F1F4',
  surfaceStrong: '#EBE9EF',

  text: '#252329',
  textSecondary: '#85818B',
  textTertiary: '#85818B',
  textInverse: neutral[0],

  border: 'rgba(37, 35, 41, 0.075)',
  borderStrong: 'rgba(37, 35, 41, 0.13)',
  divider: 'rgba(37, 35, 41, 0.065)',

  accent: brand.dustyRose,
  accentText: '#765B78',
  accentSoft: brand.lavenderPink,
  accentStrong: brand.paleLavender,
  onAccent: '#302634',
  accentSubtle: 'rgba(220, 205, 238, 0.42)',
  accentGradient: [brand.dustyRose, brand.lavenderPink],

  favorite: brand.dustyRose,
  progressTrack: 'rgba(37, 35, 41, 0.12)',
  progressFill: [brand.dustyRose, brand.lavenderPink],

  overlay: 'rgba(250, 250, 250, 0.76)',
  scrim: 'rgba(20, 18, 26, 0.42)',
  inputBackground: 'rgba(255, 255, 255, 0.62)',
  shadow: '#514653',

  navActiveBackground: 'rgba(154, 87, 180, 0.24)',
  navActiveText: '#6A2D78',
  navIdleText: '#635E6A',

  hover: 'rgba(167, 129, 154, 0.075)',
  pressed: 'rgba(167, 129, 154, 0.13)',
  focusRing: brand.dustyRose,

  danger: '#A84252',
  dangerSubtle: 'rgba(168, 66, 82, 0.12)',
  success: '#41705A',

  skeleton: '#EAE8ED',
  skeletonHighlight: '#F7F5F8',
};

export const darkColors: ThemeColors = {
  background: '#17171A',
  backgroundElevated: '#303036',
  surface: '#242428',
  surfaceMuted: '#2A2A30',
  surfaceStrong: '#303036',

  text: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textTertiary: '#85858D',
  textInverse: '#17171A',

  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.20)',
  divider: 'rgba(255, 255, 255, 0.07)',

  accent: brand.mutedLavender,
  accentText: brand.lavenderPink,
  accentSoft: brand.lavenderPink,
  accentStrong: brand.mutedLavender,
  onAccent: '#252329',
  accentSubtle: 'rgba(234, 190, 223, 0.16)',
  accentGradient: [brand.dustyRose, brand.mutedLavender],

  favorite: brand.lavenderPink,
  progressTrack: 'rgba(255, 255, 255, 0.14)',
  progressFill: [brand.dustyRose, brand.lavenderPink],

  overlay: 'rgba(23, 23, 26, 0.72)',
  scrim: 'rgba(6, 5, 9, 0.58)',
  inputBackground: 'rgba(255, 255, 255, 0.06)',
  shadow: '#000000',

  navActiveBackground: 'rgba(230, 150, 225, 0.24)',
  navActiveText: '#F4B8EE',
  navIdleText: '#C2BCCB',

  hover: 'rgba(255, 255, 255, 0.06)',
  pressed: 'rgba(255, 255, 255, 0.1)',
  focusRing: brand.lavenderPink,

  danger: '#E79AA6',
  dangerSubtle: 'rgba(231, 154, 166, 0.16)',
  success: '#8FBFA6',

  skeleton: '#2A2A30',
  skeletonHighlight: '#35353B',
};
