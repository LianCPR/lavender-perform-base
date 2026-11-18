// Expo inlines EXPO_PUBLIC_* variables into the client bundle at build time.
// Only the anon key belongs here: the service-role key must never ship to an app.
declare const process: { env: Record<string, string | undefined> };

export interface BackendConfig {
  url: string;
  anonKey: string;
}

/** Public Supabase configuration, or empty strings when the backend is not set up. */
export function getBackendConfig(): BackendConfig {
  return {
    url: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, ''),
    anonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  };
}

/** Guest mode is the default: the app works fully without a configured backend. */
export function isBackendConfigured(): boolean {
  const { url, anonKey } = getBackendConfig();
  return url.startsWith('http') && anonKey.length > 0;
}

/**
 * Where Supabase should send users after a password-reset email.
 * Web returns to `/account`; native uses the app scheme registered in app.json.
 */
export function getAuthRedirectUrl(): string | undefined {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/account`;
  }
  const configured = (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? '').trim();
  return configured || undefined;
}
