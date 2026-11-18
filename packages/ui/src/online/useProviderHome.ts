import type { MusicProvider, ProviderHomeSection } from '@lavender/music-providers';
import { isAbortError } from '@lavender/music-providers';
import { useCallback, useEffect, useState } from 'react';

export interface ProviderHomeState {
  sections: ProviderHomeSection[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/** Loads optional discovery sections; returning nothing hides the Home block. */
export function useProviderHome(provider: MusicProvider | null): ProviderHomeState {
  const [sections, setSections] = useState<ProviderHomeSection[]>([]);
  const [loading, setLoading] = useState(Boolean(provider?.getHome));
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!provider?.getHome) {
      setLoading(false);
      setSections([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void provider
      .getHome({ signal: controller.signal })
      .then((next) => {
        if (controller.signal.aborted) return;
        setSections(next);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || isAbortError(caught)) return;
        setError(caught instanceof Error ? caught : new Error('The provider did not respond.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [nonce, provider]);

  const retry = useCallback(() => setNonce((value) => value + 1), []);
  return { sections, loading, error, retry };
}
