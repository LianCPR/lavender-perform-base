import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { resolveAuthStorage } from './auth/storage';
import type { Database } from './database.types';
import { getBackendConfig, isBackendConfigured } from './env';

export type LavenderSupabaseClient = SupabaseClient<Database>;

let client: LavenderSupabaseClient | null = null;
let clientSignature = '';

/**
 * The single guarded Supabase client.
 *
 * Returns `null` when no URL/anon key is configured so every caller can fall
 * back to local-only behaviour instead of crashing in guest mode.
 */
export function getSupabaseClient(): LavenderSupabaseClient | null {
  if (!isBackendConfigured()) return null;
  const { url, anonKey } = getBackendConfig();
  const signature = `${url}|${anonKey}`;
  if (client && clientSignature === signature) return client;

  client = createClient<Database>(url, anonKey, {
    auth: {
      storage: resolveAuthStorage(),
      storageKey: 'lavender.auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== 'undefined',
      flowType: 'pkce',
    },
  });
  clientSignature = signature;
  return client;
}

/** Test hook: drops the memoized client (used after changing configuration). */
export function resetSupabaseClient(): void {
  client = null;
  clientSignature = '';
}
