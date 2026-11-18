import { File, Paths } from 'expo-file-system';
import { setAuthStorage, setSyncStorage } from '@lavender/backend';
import { setLibraryStorage } from '@lavender/music-library';
import { setPlayerStorage } from '@lavender/music-player';

/**
 * Device-local JSON storage backed by the app's document directory.
 *
 * Both the library and the playback session use the same tiny adapter shape, so
 * the providers stay storage-agnostic and the web build keeps `localStorage`.
 */
function jsonFileStorage<T>(fileName: string) {
  const file = new File(Paths.document, fileName);
  return {
    read(): T | null {
      try {
        if (!file.exists) return null;
        return JSON.parse(file.textSync()) as T;
      } catch {
        return null;
      }
    },
    write(value: T): void {
      try {
        if (!file.exists) file.create();
        file.writeSync(JSON.stringify(value));
      } catch {
        // Persisting is best-effort; playback and editing still work in memory.
      }
    },
  };
}

export function registerNativeStorage(): void {
  setLibraryStorage(jsonFileStorage('lavender-library.json'));
  setPlayerStorage(jsonFileStorage('lavender-player.json'));
  setSyncStorage(jsonFileStorage('lavender-sync.json'));

  // Supabase stores one serialized session blob; a single file is enough.
  const sessionFile = new File(Paths.document, 'lavender-auth.json');
  setAuthStorage({
    getItem: () => {
      try {
        return sessionFile.exists ? sessionFile.textSync() : null;
      } catch {
        return null;
      }
    },
    setItem: (_key, value) => {
      try {
        if (!sessionFile.exists) sessionFile.create();
        sessionFile.writeSync(value);
      } catch {
        // Sessions fall back to memory when the file cannot be written.
      }
    },
    removeItem: () => {
      try {
        if (sessionFile.exists) sessionFile.delete();
      } catch {
        // Already gone.
      }
    },
  });
}
