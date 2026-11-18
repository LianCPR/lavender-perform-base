import { Platform, type TextStyle } from 'react-native';

/**
 * Platform UI font stack.
 *
 * No custom fonts are bundled: the system font (SF Pro on iOS, Segoe UI
 * Variable on Windows, system-ui elsewhere) matches the Apple Music reference
 * and keeps the first paint instant. Native platforms use their default UI font
 * (undefined), while web needs an explicit stack so inputs do not fall back to
 * the browser serif default.
 */
export const fontFamily = Platform.select<string | undefined>({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

/**
 * Typographic scale.
 *
 * One scale for both platforms, with the numeric variants using tabular figures
 * so track times and elapsed time never jump as digits change.
 */
export const typography = {
  /** Hero moments only: the welcome greeting, the design-system title. */
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -1,
  },
  /** Page titles. */
  largeHeading: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  /** Section headings inside a page. */
  sectionHeading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  /** Card titles and list rows. */
  headline: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  callout: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0,
  },
  /** Secondary metadata: artist names, supporting copy. */
  secondary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  /** Tiny labels: tab bar captions, chips. */
  micro: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  /** Eyebrows and uppercase section labels. */
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  /** Numbers in tables, counts and card metadata. */
  numeric: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  /** Elapsed / remaining time in player surfaces. */
  playback: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
} satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
export type TypographyVariant = keyof Typography;

/**
 * Responsive type ramp.
 *
 * Type does not scale linearly with the window: phones get a slightly tighter
 * ramp, wide desktops a touch more air. `scaleTypography` returns the whole
 * scale for a factor so components never do per-component math.
 */
export const typeScale = {
  compact: 0.94,
  medium: 0.97,
  expanded: 1,
  wide: 1.03,
} as const;

export type TypeScaleName = keyof typeof typeScale;

export function scaleTypography(factor: number): Typography {
  const variants = Object.keys(typography) as TypographyVariant[];
  const scaled = {} as Record<TypographyVariant, TextStyle>;

  for (const variant of variants) {
    const style = typography[variant];
    scaled[variant] = {
      ...style,
      fontSize: Math.round((style.fontSize ?? 15) * factor * 2) / 2,
      lineHeight: Math.round((style.lineHeight ?? 20) * factor * 2) / 2,
    };
  }

  return scaled as Typography;
}
