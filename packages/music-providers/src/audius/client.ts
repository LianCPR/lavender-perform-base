import { ProviderError, isAbortError } from '../errors.ts';

import {
  AUDIUS_APP_NAME,
  splitPlaylists,
  type AudiusPlaylist,
  type AudiusTrack,
  type AudiusUser,
} from './map.ts';

declare const process: { env: Record<string, string | undefined> };

export const AUDIUS_DOCS_URL = 'https://docs.audius.co/api';
const DEFAULT_BASE = 'https://api.audius.co/v1';
const MIN_REQUEST_GAP_MS = 130;

/** The documented free tier is 10 req/s; stay well under it. */
let chain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getAudiusBaseUrl(): string {
  const configured = (process.env.EXPO_PUBLIC_AUDIUS_API_BASE ?? '').trim();
  return (configured || DEFAULT_BASE).replace(/\/$/, '');
}

/** True unless the app explicitly turns online music off. */
export function isAudiusEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_ONLINE_MUSIC ?? '').trim().toLowerCase() !== 'off';
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await delay(wait);
    lastRequestAt = Date.now();
    return task();
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function retryAfterMs(response: Response): number {
  const header = response.headers.get('retry-after');
  if (!header) return 1200;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(5000, Math.max(250, seconds * 1000));
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(5000, Math.max(250, date - Date.now()));
  return 1200;
}

async function requestJson<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
  attempt = 0,
): Promise<T> {
  const url = new URL(`${getAudiusBaseUrl()}${path}`);
  url.searchParams.set('app_name', AUDIUS_APP_NAME);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await schedule(() =>
      fetch(url.toString(), {
        signal,
        headers: { Accept: 'application/json' },
      }),
    );
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ProviderError(
      typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'unavailable',
      'Could not reach Audius. Check your connection and try again.',
      { providerId: 'audius', cause: error },
    );
  }

  if (response.status === 429) {
    const wait = retryAfterMs(response);
    if (attempt === 0 && !signal?.aborted) {
      await delay(wait);
      return requestJson<T>(path, params, signal, attempt + 1);
    }
    throw new ProviderError('rate_limited', 'Audius asked the app to slow down.', {
      providerId: 'audius',
      retryAfterMs: wait,
    });
  }
  if (response.status === 401) {
    throw new ProviderError('unauthorized', 'Audius requires authorization for this request.', {
      providerId: 'audius',
    });
  }
  if (response.status === 403) {
    throw new ProviderError('forbidden', 'Audius did not authorize this request.', {
      providerId: 'audius',
    });
  }
  if (response.status === 404) {
    throw new ProviderError('not_found', 'This item is no longer available on Audius.', {
      providerId: 'audius',
    });
  }
  if (response.status >= 500) {
    throw new ProviderError('unavailable', 'Audius is having trouble responding right now.', {
      providerId: 'audius',
    });
  }
  if (!response.ok) {
    throw new ProviderError('unavailable', `Audius returned HTTP ${response.status}.`, {
      providerId: 'audius',
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ProviderError('invalid_response', 'Audius returned an unreadable response.', {
      providerId: 'audius',
      cause: error,
    });
  }
}

interface ListResponse<T> {
  data: T[];
}

interface ItemResponse<T> {
  data: T;
}

export async function fetchAudiusTracks(
  query: string,
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<AudiusTrack[]> {
  const response = await requestJson<ListResponse<AudiusTrack>>(
    '/tracks/search',
    { query, limit: options.limit ?? 12, offset: options.offset ?? 0 },
    options.signal,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAudiusUsers(
  query: string,
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<AudiusUser[]> {
  const response = await requestJson<ListResponse<AudiusUser>>(
    '/users/search',
    { query, limit: options.limit ?? 8, offset: options.offset ?? 0 },
    options.signal,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAudiusPlaylistSearch(
  query: string,
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<ReturnType<typeof splitPlaylists>> {
  const response = await requestJson<ListResponse<AudiusPlaylist>>(
    '/playlists/search',
    { query, limit: options.limit ?? 10, offset: options.offset ?? 0 },
    options.signal,
  );
  return splitPlaylists(Array.isArray(response.data) ? response.data : []);
}

export async function fetchAudiusTrack(
  trackId: string,
  signal?: AbortSignal,
): Promise<AudiusTrack> {
  const response = await requestJson<ItemResponse<AudiusTrack>>(
    `/tracks/${encodeURIComponent(trackId)}`,
    {},
    signal,
  );
  if (!response.data?.id) {
    throw new ProviderError('invalid_response', 'Audius did not return a track.', {
      providerId: 'audius',
    });
  }
  return response.data;
}

export async function fetchAudiusPlaylist(
  playlistId: string,
  signal?: AbortSignal,
): Promise<AudiusPlaylist> {
  const response = await requestJson<ItemResponse<AudiusPlaylist>>(
    `/playlists/${encodeURIComponent(playlistId)}`,
    {},
    signal,
  );
  if (!response.data?.id) {
    throw new ProviderError('invalid_response', 'Audius did not return a playlist.', {
      providerId: 'audius',
    });
  }
  return response.data;
}

export async function fetchAudiusPlaylistTracks(
  playlistId: string,
  options: { limit?: number; offset?: number; signal?: AbortSignal } = {},
): Promise<AudiusTrack[]> {
  const response = await requestJson<ListResponse<AudiusTrack>>(
    `/playlists/${encodeURIComponent(playlistId)}/tracks`,
    { limit: options.limit ?? 100, offset: options.offset ?? 0 },
    options.signal,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAudiusUser(
  userId: string,
  signal?: AbortSignal,
): Promise<AudiusUser> {
  const response = await requestJson<ItemResponse<AudiusUser>>(
    `/users/${encodeURIComponent(userId)}`,
    {},
    signal,
  );
  if (!response.data?.id) {
    throw new ProviderError('invalid_response', 'Audius did not return an artist.', {
      providerId: 'audius',
    });
  }
  return response.data;
}

export async function fetchAudiusUserTracks(
  userId: string,
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<AudiusTrack[]> {
  const response = await requestJson<ListResponse<AudiusTrack>>(
    `/users/${encodeURIComponent(userId)}/tracks`,
    { limit: options.limit ?? 20, sort: 'plays' },
    options.signal,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAudiusTrendingTracks(
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<AudiusTrack[]> {
  const response = await requestJson<ListResponse<AudiusTrack>>(
    '/tracks/trending',
    { time: 'week', limit: options.limit ?? 12 },
    options.signal,
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchAudiusTrendingPlaylists(
  options: { limit?: number; signal?: AbortSignal } = {},
): Promise<ReturnType<typeof splitPlaylists>> {
  const response = await requestJson<ListResponse<AudiusPlaylist>>(
    '/playlists/trending',
    { time: 'week', limit: options.limit ?? 6 },
    options.signal,
  );
  return splitPlaylists(Array.isArray(response.data) ? response.data : []);
}
