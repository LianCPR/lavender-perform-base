import { withAlpha } from '../utils/color';

/**
 * Elevation scale.
 *
 * Two representations per level: React Native shadow props for iOS/Android and
 * a CSS `box-shadow` string used on web. Elevation is reserved for floating
 * chrome and interactive surfaces — flat cards use borders instead.
 */
export type ElevationKey = 'none' | 'low' | 'medium' | 'high' | 'floating';

export type ElevationLevel = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetY: number;
  /** Android elevation. */
  androidElevation: number;
  /** CSS box-shadow string (web). */
  boxShadow: string;
};

export type Elevations = Record<ElevationKey, ElevationLevel>;

function level(
  shadowColor: string,
  shadowOpacity: number,
  shadowRadius: number,
  shadowOffsetY: number,
  androidElevation: number,
): ElevationLevel {
  return {
    shadowColor,
    shadowOpacity,
    shadowRadius,
    shadowOffsetY,
    androidElevation,
    boxShadow: `0px ${shadowOffsetY}px ${shadowRadius}px ${withAlpha(shadowColor, shadowOpacity)}`,
  };
}

export const lightElevations: Elevations = {
  none: level('#3B2F42', 0, 0, 0, 0),
  low: level('#3B2F42', 0.06, 8, 2, 1),
  medium: level('#3B2F42', 0.1, 18, 6, 3),
  high: level('#3B2F42', 0.14, 28, 12, 6),
  floating: level('#3B2F42', 0.18, 40, 18, 10),
};

export const darkElevations: Elevations = {
  none: level('#000000', 0, 0, 0, 0),
  low: level('#000000', 0.28, 10, 3, 1),
  medium: level('#000000', 0.38, 22, 8, 3),
  high: level('#000000', 0.48, 34, 14, 6),
  floating: level('#000000', 0.56, 48, 20, 10),
};

/** Merge an elevation level into a React Native style object. */
export function elevationStyle(value: ElevationLevel) {
  return {
    shadowColor: value.shadowColor,
    shadowOpacity: value.shadowOpacity,
    shadowRadius: value.shadowRadius,
    shadowOffset: { width: 0, height: value.shadowOffsetY },
    elevation: value.androidElevation,
  };
}
