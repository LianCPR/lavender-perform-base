import type { MusicProvider } from './types.ts';

declare const process: { env: Record<string, string | undefined> };

const providers = new Map<string, MusicProvider>();

export function registerProvider(provider: MusicProvider): void {
  providers.set(provider.id, provider);
}

export function unregisterProvider(providerId: string): void {
  providers.delete(providerId);
}

export function getProvider(providerId: string): MusicProvider | undefined {
  return providers.get(providerId);
}

export function listProviders(): MusicProvider[] {
  return [...providers.values()];
}

/** Online music can be switched off at build time for a purely local app. */
export function isOnlineMusicEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_ONLINE_MUSIC ?? '').trim().toLowerCase() !== 'off';
}

/**
 * The active provider for this build. `EXPO_PUBLIC_ONLINE_PROVIDER` selects one;
 * it defaults to Audius, the only provider enabled in this phase.
 */
export function getActiveProvider(): MusicProvider | null {
  if (!isOnlineMusicEnabled()) return null;
  const configured = (process.env.EXPO_PUBLIC_ONLINE_PROVIDER ?? '').trim();
  if (configured) return providers.get(configured) ?? null;
  return providers.get('audius') ?? listProviders()[0] ?? null;
}
