/** A file chosen by the listener, already read into memory for tag parsing. */
export interface PickedAudioFile {
  name: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
}

/** What a saved local file resolves to at runtime. */
export interface StoredAudio {
  /** `blob:` on web, `file:` on iOS/Android. */
  uri: string;
  /** Durable key persisted with the library so it can be resolved again. */
  storageKey: string;
}
