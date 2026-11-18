import { scaleTypography, typeScale } from '@lavender/design-system';
import { useMemo } from 'react';

import { useBreakpoint } from './useBreakpoint';

/**
 * Typography scaled for the active breakpoint (phones slightly tighter, wide
 * desktops a touch larger). The base `theme.typography` remains the default for
 * components that should not scale.
 */
export function useResponsiveTypography() {
  const breakpoint = useBreakpoint();
  const factor = typeScale[breakpoint];
  return useMemo(() => scaleTypography(factor), [factor]);
}
