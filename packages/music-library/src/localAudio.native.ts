import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import type { PickedAudioFile, StoredAudio } from './localAudio.types';

const IMPORT_DIRECTORY = 'audio-imports';

function importDirectory(): Directory {
  const directory = new Directory(Paths.document, IMPORT_DIRECTORY);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Native document picker. Files are read immediately, before cache eviction. */
export async function pickAudioFiles(): Promise<PickedAudioFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const picked: PickedAudioFile[] = [];
  for (const asset of result.assets) {
    const file = new File(asset.uri);
    const bytes = await file.bytes();
    picked.push({
      name: asset.name,
      mimeType: asset.mimeType ?? 'audio/*',
      size: asset.size ?? bytes.length,
      bytes,
    });
  }
  return picked;
}

/**
 * Copies the file out of the picker cache into the app's document directory.
 * Cache URIs are temporary; the returned path stays valid across restarts.
 */
export async function saveLocalAudio(
  storageKey: string,
  name: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<StoredAudio> {
  const extension = name.split('.').pop()?.toLowerCase() ?? 'audio';
  const fileName = `${storageKey}.${extension}`;
  const target = new File(importDirectory(), fileName);
  if (target.exists) target.delete();
  target.create();
  target.writeSync(bytes);
  void mimeType;
  return { uri: target.uri, storageKey };
}

export async function loadLocalAudio(storageKey: string): Promise<string | null> {
  const extension = storageKey.split('.').pop()?.toLowerCase() ?? '';
  const directory = importDirectory();
  const file = new File(directory, extension ? storageKey : `${storageKey}.mp3`);
  return file.exists ? file.uri : null;
}

export async function removeLocalAudio(storageKey: string): Promise<void> {
  try {
    const directory = importDirectory();
    const file = new File(directory, storageKey);
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup.
  }
}
