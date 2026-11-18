/**
 * Session storage for Supabase auth.
 *
 * Web defaults to `localStorage`; the native app registers a document-directory
 * adapter in `apps/mobile/src/storage.ts` before the first render. When neither
 * exists (SSR, tests) an in-memory adapter keeps the session for the process.
 */
export interface AuthStorageAdapter {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

let registered: AuthStorageAdapter | null = null;

export function setAuthStorage(adapter: AuthStorageAdapter | null): void {
  registered = adapter;
}

const memory = new Map<string, string>();

const memoryAdapter: AuthStorageAdapter = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

function webAdapter(): AuthStorageAdapter | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  };
}

export function resolveAuthStorage(): AuthStorageAdapter {
  return registered ?? webAdapter() ?? memoryAdapter;
}
