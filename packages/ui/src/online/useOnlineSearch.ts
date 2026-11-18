import {
  dedupeBy,
  isAbortError,
  isProviderError,
  searchProvider,
  type MusicProvider,
  type ProviderError,
  type ProviderSearchResults,
} from '@lavender/music-providers';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 350;
const PAGE_SIZE = 10;

const EMPTY: ProviderSearchResults = {
  tracks: [],
  albums: [],
  artists: [],
  playlists: [],
  errors: [],
};

export interface OnlineSearchState {
  results: ProviderSearchResults;
  loading: boolean;
  loadingMore: boolean;
  error: ProviderError | Error | null;
  /** Failures from some categories while other results are still shown. */
  partialFailures: number;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

function hasMoreResults(results: ProviderSearchResults, limit: number): boolean {
  return results.tracks.length >= limit || results.playlists.length >= limit;
}

function mergePage(
  current: ProviderSearchResults,
  next: ProviderSearchResults,
): ProviderSearchResults {
  return {
    tracks: dedupeBy([...current.tracks, ...next.tracks], (track) => track.id),
    albums: dedupeBy([...current.albums, ...next.albums], (album) => album.id),
    artists: dedupeBy([...current.artists, ...next.artists], (artist) => artist.id),
    playlists: dedupeBy([...current.playlists, ...next.playlists], (playlist) => playlist.id),
    errors: next.errors,
  };
}

/**
 * Online search is debounced and every in-flight request is aborted when the
 * query changes, so a slow response can never overwrite a newer one.
 */
export function useOnlineSearch(
  provider: MusicProvider | null,
  rawQuery: string,
  options: { enabled?: boolean; limit?: number } = {},
): OnlineSearchState {
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? PAGE_SIZE;
  const query = rawQuery.trim();

  const [results, setResults] = useState<ProviderSearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ProviderError | Error | null>(null);
  const [partialFailures, setPartialFailures] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nonce, setNonce] = useState(0);

  const offsetRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    offsetRef.current = 0;
    controllerRef.current?.abort();
    setResults(EMPTY);
    setError(null);
    setPartialFailures(0);
    setHasMore(false);
    setLoadingMore(false);

    if (!enabled || !provider || query.length < 2) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);

    const timer = setTimeout(() => {
      void searchProvider(provider, { query, limit, offset: 0, signal: controller.signal })
        .then((next) => {
          if (controller.signal.aborted) return;
          offsetRef.current = limit;
          setResults(next);
          setPartialFailures(next.errors.length);
          setHasMore(hasMoreResults(next, limit));
          setError(null);
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted || isAbortError(caught)) return;
          setError(isProviderError(caught) ? caught : (caught as Error));
          setResults(EMPTY);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, limit, nonce, provider, query]);

  const loadMore = useCallback(() => {
    if (!provider || loading || loadingMore || !hasMore || query.length < 2) return;
    const controller = new AbortController();
    setLoadingMore(true);
    void searchProvider(provider, {
      query,
      limit,
      offset: offsetRef.current,
      signal: controller.signal,
    })
      .then((next) => {
        offsetRef.current += limit;
        setResults((current) => mergePage(current, next));
        setHasMore(hasMoreResults(next, limit));
        setPartialFailures(next.errors.length);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) return;
        setError(isProviderError(caught) ? caught : (caught as Error));
      })
      .finally(() => setLoadingMore(false));
  }, [hasMore, limit, loading, loadingMore, provider, query]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);

  return {
    results,
    loading,
    loadingMore,
    error,
    partialFailures,
    hasMore,
    loadMore,
    retry,
  };
}
