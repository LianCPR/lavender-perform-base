import { breakpoints } from '@lavender/design-system';
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'compact' | 'medium' | 'expanded' | 'wide';

/** Resolve the active layout breakpoint from the window width. */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();

  if (width >= breakpoints.wide) return 'wide';
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}

/** Grid column count for artwork walls. */
export function gridColumns(breakpoint: Breakpoint): number {
  switch (breakpoint) {
    case 'wide':
      return 5;
    case 'expanded':
      return 4;
    case 'medium':
      return 3;
    default:
      return 2;
  }
}

export function isCompact(breakpoint: Breakpoint): boolean {
  return breakpoint === 'compact';
}
