import { Platform } from 'react-native';

import type { ThemeMode } from './ThemeProvider';

const STORAGE_KEY = 'lavender.theme-mode';

/**
 * A place to keep the user's theme choice. The provider only needs
 * `read`/`write`, so a native adapter (AsyncStorage, SQLite, preferences) can be
 * registered later without touching the provider or its API.
 */
export interface ThemeModeStorage {
  read(): ThemeMode | null;
  write(mode: ThemeMode): void;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** Web adapter: `localStorage`, so the choice survives a reload. */
const webStorage: ThemeModeStorage = {
  read() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return isThemeMode(raw) ? raw : null;
    } catch {
      // Storage can be blocked (private mode, disabled cookies); fall through.
      return null;
    }
  },
  write(mode) {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Persisting is best-effort; the in-memory choice still applies.
    }
  },
};

let registered: ThemeModeStorage | null = null;

/**
 * Register a device-local adapter for native platforms once storage is
 * available, e.g. `setThemeModeStorage({ read, write })` on app start. Until
 * then native has no adapter and the choice lasts for the session only.
 */
export function setThemeModeStorage(storage: ThemeModeStorage | null): void {
  registered = storage;
}

function activeStorage(): ThemeModeStorage | null {
  if (registered) return registered;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return webStorage;
  return null;
}

/** The persisted mode, or `null` when nothing valid is stored. */
export function readStoredThemeMode(): ThemeMode | null {
  return activeStorage()?.read() ?? null;
}

/** Persist the mode; a no-op where no storage adapter is available. */
export function writeStoredThemeMode(mode: ThemeMode): void {
  activeStorage()?.write(mode);
}
