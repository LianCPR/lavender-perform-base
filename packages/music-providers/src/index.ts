export * from './types.ts';
export * from './errors.ts';
export * from './search.ts';
export {
  getActiveProvider,
  getProvider,
  isOnlineMusicEnabled,
  listProviders,
  registerProvider,
  unregisterProvider,
} from './registry.ts';
export { audiusProvider } from './audius/provider.ts';
export {
  AUDIUS_APP_NAME,
  AUDIUS_PROVIDER_ID,
  audiusAlbumId,
  audiusArtistId,
  audiusPermalink,
  audiusPlaylistId,
  audiusStreamUrl,
  audiusTrackId,
  nativeId,
  paletteForId,
} from './audius/map.ts';
export { getAudiusBaseUrl, isAudiusEnabled } from './audius/client.ts';
export {
  buildLocalDuplicateIndex,
  dedupeBy,
  normalizeTitleArtist,
  partitionOnlineDuplicates,
} from './search.ts';

import { audiusProvider } from './audius/provider.ts';
import { registerProvider } from './registry.ts';

// The default provider for this phase. Registering here means both apps only
// need to import `@lavender/music-providers`.
registerProvider(audiusProvider);
