import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';

import type { AppScheme, Theme } from './theme';
import { createTheme } from './theme';
import { readStoredThemeMode, writeStoredThemeMode } from './themeStorage';

/** `system` follows the OS; `light`/`dark` are explicit overrides. */
export type ThemeMode = AppScheme | 'system';

export interface ThemeContextValue {
  theme: Theme;
  /** The user's preference, which may be `system`. */
  mode: ThemeMode;
  /** The scheme actually rendered after resolving `system`. */
  scheme: AppScheme;
  setMode: (mode: ThemeMode) => void;
  /** True when the OS asks for reduced motion. */
  reducedMotion: boolean;
  /** True when the OS asks for reduced transparency. */
  reducedTransparency: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Defaults to light for first presentation; a saved choice still wins.
   */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode = 'light' }: ThemeProviderProps) {
  const nativeSystemScheme = useColorScheme();
  const [webSystemScheme, setWebSystemScheme] = useState<AppScheme>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredThemeMode() ?? initialMode);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [reducedTransparency, setReducedTransparency] = useState(false);

  // React Native Web's Appearance subscription does not consistently receive
  // browser emulation changes, so subscribe to the media query directly.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setWebSystemScheme(event.matches ? 'dark' : 'light');
    setWebSystemScheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const systemScheme = Platform.OS === 'web' ? webSystemScheme : nativeSystemScheme;

  const scheme: AppScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const theme = useMemo(() => createTheme(scheme), [scheme]);

  // Keep the browser chrome (scrollbars, form controls, overscroll area) in
  // sync with the active theme so dark mode never flashes white gutters.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = scheme;
    document.documentElement.style.backgroundColor = theme.colors.background;
    document.body.style.backgroundColor = theme.colors.background;
  }, [scheme, theme.colors.background]);

  // Reduced-motion preference is owned here so every animated component shares
  // one OS subscription instead of polling accessibility settings itself.
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(query.matches);
      const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!cancelled) setReducedMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // Liquid Glass must remain legible when transparency is reduced. Web exposes
  // this as a media query; iOS exposes an AccessibilityInfo query (no change
  // event, so the provider reads it once at mount).
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const query = window.matchMedia('(prefers-reduced-transparency: reduce)');
      setReducedTransparency(query.matches);
      const onChange = (event: MediaQueryListEvent) => setReducedTransparency(event.matches);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    }

    let cancelled = false;
    AccessibilityInfo.isReduceTransparencyEnabled?.()
      .then((enabled) => {
        if (!cancelled) setReducedTransparency(enabled);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStoredThemeMode(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, scheme, setMode, reducedMotion, reducedTransparency }),
    [theme, mode, scheme, setMode, reducedMotion, reducedTransparency],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
