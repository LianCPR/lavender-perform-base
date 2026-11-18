import { useContext } from 'react';

import { ThemeContext, type ThemeContextValue } from './ThemeProvider';

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>. Wrap your app root.');
  }
  return context;
}

/** Fully resolved design tokens for the active scheme. */
export function useTheme() {
  return useThemeContext().theme;
}

/** Theme preference plus the setter for settings screens. */
export function useThemeMode() {
  const { mode, scheme, setMode } = useThemeContext();
  return { mode, scheme, setMode };
}

/** OS reduced-motion preference, shared through the theme provider. */
export function useReducedMotion(): boolean {
  return useThemeContext().reducedMotion;
}

/** OS reduced-transparency preference, shared through the theme provider. */
export function useReducedTransparency(): boolean {
  return useThemeContext().reducedTransparency;
}
