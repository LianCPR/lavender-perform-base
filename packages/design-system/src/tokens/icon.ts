/**
 * Icon sizing scale and guidance constants.
 *
 * Lavender Music uses one icon family (Ionicons) with two treatments:
 * - `*-outline` for idle/inactive chrome (lighter visual weight)
 * - filled glyphs for active, selected or primary actions
 *
 * Keep every icon on this scale so stroke weight reads consistently; do not mix
 * arbitrary sizes inside the same surface.
 */
export const iconSize = {
  /** Inline with micro/caption text. */
  xs: 12,
  /** Inside compact chips and dense rows. */
  sm: 15,
  /** Default UI icon: list rows, buttons. */
  md: 18,
  /** Navigation and toolbar icons. */
  lg: 22,
  /** Prominent single icons: tab bar emphasis, empty-state marks. */
  xl: 26,
  /** Illustration-scale icons inside empty/error states. */
  hero: 40,
} as const;

export type IconSize = typeof iconSize;
export type IconSizeKey = keyof IconSize;

/** Opacity applied to idle (inactive) icons in navigation chrome. */
export const iconIdleOpacity = 1;
