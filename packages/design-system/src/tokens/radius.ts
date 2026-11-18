/**
 * Mixed geometry system.
 *
 * Artwork stays nearly square, cards are softly rounded, glass chrome is
 * pill-shaped. Do not round everything to the same value.
 */
export const radius = {
  none: 0,
  xs: 6,
  /** Album artwork — barely rounded, lets the cover read as a square. */
  artwork: 10,
  sm: 12,
  /** Content cards and list rows. */
  card: 16,
  md: 18,
  lg: 22,
  /** Large glass panels (sidebar, sheets). */
  glass: 22,
  xl: 26,
  /** Buttons, inputs. */
  control: 14,
  pill: 999,
} as const;

export type Radius = typeof radius;
export type RadiusKey = keyof Radius;
