import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSupabaseClient } from '../client';
import { getAuthRedirectUrl, isBackendConfigured } from '../env';
import { describeAuthError, normalizeEmail, validateEmail, validatePassword } from './validation';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface SignUpResult {
  ok: boolean;
  /** Supabase project requires email confirmation before the first sign-in. */
  needsConfirmation: boolean;
}

export interface AuthContextValue {
  /** False when no Supabase URL/key is configured: guest mode stays local. */
  configured: boolean;
  initializing: boolean;
  user: AuthUser | null;
  /** True after following a password-recovery link; show "set a new password". */
  recoveryMode: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, displayName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  updateDisplayName: (displayName: string) => Promise<boolean>;
  dismissRecovery: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(session: Session | null, displayName: string | null): AuthUser | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    displayName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const configured = isBackendConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(Boolean(supabase));
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }
    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setInitializing(false);
      })
      .catch(() => {
        if (active) setInitializing(false);
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false);
        setDisplayName(null);
      }
      setSession(nextSession);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const userId = session?.user.id ?? null;

  // Display names live in `profiles`; the session only carries auth data.
  useEffect(() => {
    if (!supabase || !userId) {
      setDisplayName(null);
      return;
    }
    let active = true;
    void supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setDisplayName(data?.display_name ?? null);
      });
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const clearError = useCallback(() => setError(null), []);
  const dismissRecovery = useCallback(() => setRecoveryMode(false), []);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      if (!supabase) return false;
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return false;
      }
      if (!password) {
        setError('Enter your password.');
        return false;
      }
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (signInError) {
        setError(describeAuthError(signInError.message));
        return false;
      }
      return true;
    },
    [supabase],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async (email, password, name) => {
      if (!supabase) return { ok: false, needsConfirmation: false };
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return { ok: false, needsConfirmation: false };
      }
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return { ok: false, needsConfirmation: false };
      }
      setError(null);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: name?.trim() ? { display_name: name.trim() } : undefined,
        },
      });
      if (signUpError) {
        setError(describeAuthError(signUpError.message));
        return { ok: false, needsConfirmation: false };
      }
      return { ok: true, needsConfirmation: !data.session };
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(describeAuthError(signOutError.message));
  }, [supabase]);

  const requestPasswordReset = useCallback<AuthContextValue['requestPasswordReset']>(
    async (email) => {
      if (!supabase) return false;
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return false;
      }
      setError(null);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizeEmail(email),
        { redirectTo: getAuthRedirectUrl() },
      );
      if (resetError) {
        setError(describeAuthError(resetError.message));
        return false;
      }
      return true;
    },
    [supabase],
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (password) => {
      if (!supabase) return false;
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return false;
      }
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(describeAuthError(updateError.message));
        return false;
      }
      setRecoveryMode(false);
      return true;
    },
    [supabase],
  );

  const updateDisplayName = useCallback<AuthContextValue['updateDisplayName']>(
    async (name) => {
      if (!supabase || !userId) return false;
      const trimmed = name.trim();
      setError(null);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: trimmed || null })
        .eq('id', userId);
      if (updateError) {
        setError(describeAuthError(updateError.message));
        return false;
      }
      setDisplayName(trimmed || null);
      return true;
    },
    [supabase, userId],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      initializing,
      user: toUser(session, displayName),
      recoveryMode,
      error,
      clearError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateDisplayName,
      dismissRecovery,
    }),
    [
      configured,
      initializing,
      session,
      displayName,
      recoveryMode,
      error,
      clearError,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateDisplayName,
      dismissRecovery,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
