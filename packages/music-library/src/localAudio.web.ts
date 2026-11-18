import type { PickedAudioFile, StoredAudio } from './localAudio.types';

const DB_NAME = 'lavender-audio';
const STORE = 'files';
const DB_VERSION = 1;

interface StoredFile {
  key: string;
  name: string;
  mimeType: string;
  blob: Blob;
}

const urlCache = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open audio storage'));
  });
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Audio storage request failed'));
        tx.oncomplete = () => db.close();
      }),
  );
}

/** Opens the browser picker and reads the selected audio files. */
export function pickAudioFiles(): Promise<PickedAudioFile[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,.mp3,.m4a,.aac,.wav,.flac';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => input.remove();

    input.onchange = async () => {
      try {
        const files = Array.from(input.files ?? []);
        const picked = await Promise.all(
          files.map(async (file) => ({
            name: file.name,
            mimeType: file.type,
            size: file.size,
            bytes: new Uint8Array(await file.arrayBuffer()),
          })),
        );
        cleanup();
        resolve(picked);
      } catch (error) {
        cleanup();
        reject(error instanceof Error ? error : new Error('Could not read the selected files'));
      }
    };
    input.oncancel = () => {
      cleanup();
      resolve([]);
    };
    input.click();
  });
}

/**
 * Web persistence: the file itself lives in IndexedDB (object URLs do not
 * survive a reload), and the UI receives a fresh `blob:` URL.
 */
export async function saveLocalAudio(
  storageKey: string,
  name: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<StoredAudio> {
  const blob = new Blob([bytes.slice().buffer], { type: mimeType });
  await transaction('readwrite', (store) => store.put({ key: storageKey, name, mimeType, blob }));
  const uri = URL.createObjectURL(blob);
  urlCache.set(storageKey, uri);
  return { uri, storageKey };
}

export async function loadLocalAudio(storageKey: string): Promise<string | null> {
  const cached = urlCache.get(storageKey);
  if (cached) return cached;
  try {
    const record = await transaction<StoredFile | undefined>('readonly', (store) => store.get(storageKey));
    if (!record?.blob) return null;
    const uri = URL.createObjectURL(record.blob);
    urlCache.set(storageKey, uri);
    return uri;
  } catch {
    return null;
  }
}

export async function removeLocalAudio(storageKey: string): Promise<void> {
  const cached = urlCache.get(storageKey);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(storageKey);
  }
  try {
    await transaction('readwrite', (store) => store.delete(storageKey));
  } catch {
    // Deleting is best-effort; the metadata is already gone from the library.
  }
}
