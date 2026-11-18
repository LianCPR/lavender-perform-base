/**
 * Border widths.
 *
 * Hairline is used for separators and card outlines, thin for glass edges,
 * medium for selected/focused rings.
 */
export const borderWidth = {
  none: 0,
  hairline: 1,
  thin: 1,
  medium: 2,
  thick: 3,
} as const;

export type BorderWidth = typeof borderWidth;
export type BorderWidthKey = keyof BorderWidth;
