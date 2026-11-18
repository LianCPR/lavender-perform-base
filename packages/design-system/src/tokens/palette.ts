/**
 * Raw color primitives.
 *
 * These are the only places hex values live. Components must never read from
 * this file directly — they consume semantic tokens from the theme instead.
 */

/** Lavender Music brand accents. Accent only: never a full-page background. */
export const brand = {
  dustyRose: '#A7819A',
  lavenderPink: '#EABEDF',
  royalPurple: '#412057',
  mutedLavender: '#C6ACB7',
  paleLavender: '#DCCDEE',
  midnight: '#161123',
} as const;

/** Neutral grayscale ramp — the foundation of every surface in the app. */
export const neutral = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: '#F6F5F8',
  150: '#F0EEF2',
  200: '#E6E3EA',
  300: '#D3D0D9',
  400: '#B1ADB8',
  500: '#8C8894',
  600: '#6A6673',
  700: '#4A4653',
  800: '#2E2B35',
  850: '#242129',
  900: '#191720',
  950: '#121016',
  1000: '#0C0A10',
} as const;

export type BrandColor = keyof typeof brand;
export type NeutralColor = keyof typeof neutral;
