// Configuration and client
export { getSupabaseClient, resetSupabaseClient } from './client';
export { getAuthRedirectUrl, getBackendConfig, isBackendConfigured } from './env';

// Authentication
export { AuthProvider, useAuth } from './auth/AuthProvider';
export type { AuthContextValue, AuthUser, SignUpResult } from './auth/AuthProvider';
export { setAuthStorage } from './auth/storage';
export type { AuthStorageAdapter } from './auth/storage';
export {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from './auth/validation';

// Sync
export { runSyncPass } from './sync/engine';
export { createSyncMeta, EPOCH } from './sync/types';
export type {
  CloudTrack,
  MergedPlaylists,
  RemoteListeningEntry,
  RemoteSnapshot,
  SyncMeta,
  SyncState,
  SyncStatus,
} from './sync/types';
export {
  clearHistoryBefore,
  fetchListeningHistory,
  pushHistoryDeletions,
  pushListeningHistory,
} from './repositories/history';
export type { LocalLibrarySlice, PlaybackSlice, SyncedLibraryPatch } from './sync/local';
export { readSyncMeta, resetSyncMeta, setSyncStorage, writeSyncMeta } from './sync/storage';
export type { SyncStorage } from './sync/storage';

// Pure merge helpers (also covered by node:test)
export {
  isNewer,
  maxTimestamp,
  mergeIdSet,
  mergePlaylists,
  mergePreferences,
  toLibraryTrack,
  timestamp,
} from './sync/merge';
