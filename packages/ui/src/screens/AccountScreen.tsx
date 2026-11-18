import { MIN_PASSWORD_LENGTH, useAuth, type SyncStatus } from '@lavender/backend';
import { fontFamily, useTheme } from '@lavender/design-system';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, TextInput, View, type TextStyle } from 'react-native';

import { Icon } from '../Icon';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { LoadingState } from '../feedback/LoadingState';
import { Screen } from '../Screen';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { useSync } from '../SyncHost';

type Mode = 'signin' | 'signup' | 'reset';

const inputBase: TextStyle = {
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 15,
};

const webOutline = Platform.select<TextStyle>({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
});

const STATUS_COPY: Record<SyncStatus, string> = {
  disabled: 'Local library only — the backend is not configured.',
  'signed-out': 'Sign in to sync playlists, favorites and preferences.',
  idle: 'Your library is up to date with the cloud.',
  syncing: 'Syncing changes…',
  offline: 'Offline — changes are saved on this device and sync later.',
  error: 'Sync needs attention. Your local library is unaffected.',
};

function relativeTime(value: string | null): string {
  if (!value) return 'Not synced yet';
  const diff = Date.now() - Date.parse(value);
  if (Number.isNaN(diff)) return 'Not synced yet';
  if (diff < 60_000) return 'Synced just now';
  if (diff < 3_600_000) return `Synced ${Math.round(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `Synced ${Math.round(diff / 3_600_000)} h ago`;
  return `Synced ${new Date(value).toLocaleDateString()}`;
}

function Field({
  label,
  value,
  onChangeText,
  secure = false,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  placeholder?: string;
  autoComplete?: 'email' | 'password' | 'new-password' | 'name';
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete}
        style={[
          inputBase,
          {
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.text,
            fontFamily,
          },
          webOutline,
        ]}
      />
    </View>
  );
}

/** Account and cross-device sync, presented identically on web and iOS. */
export function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const auth = useAuth();
  const sync = useSync();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [displayName, setDisplayName] = useState(auth.user?.displayName ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError ?? auth.error;

  const resetMessages = () => {
    setLocalError(null);
    setNotice(null);
    auth.clearError();
  };

  const submit = async () => {
    resetMessages();
    setBusy(true);
    try {
      if (mode === 'reset') {
        const sent = await auth.requestPasswordReset(email);
        if (sent) setNotice('Check your inbox for the reset link. It expires after a short while.');
        return;
      }
      if (mode === 'signin') {
        await auth.signIn(email, password);
        return;
      }
      const result = await auth.signUp(email, password, name);
      if (result.ok) {
        setNotice(
          result.needsConfirmation
            ? 'Account created. Confirm your email, then sign in to sync.'
            : 'Account created and signed in.',
        );
        setPassword('');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async () => {
    resetMessages();
    setBusy(true);
    try {
      const updated = await auth.updatePassword(newPassword);
      if (updated) {
        setNotice('Password updated. You can keep listening.');
        setNewPassword('');
      }
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    resetMessages();
    const saved = await auth.updateDisplayName(displayName);
    if (saved) setNotice('Display name saved.');
  };

  if (auth.initializing) {
    return (
      <Screen title="Account" subtitle="Sign in to sync your library across devices.">
        <LoadingState label="Restoring your session…" />
      </Screen>
    );
  }

  const signedIn = Boolean(auth.user);
  const showRecovery = auth.recoveryMode || (signedIn && mode === 'reset' && auth.recoveryMode);

  return (
    <Screen
      title="Account"
      subtitle="Your music files stay on this device. Playlists, favorites and preferences can follow you."
      actions={
        <>
          <SecondaryButton
            label="Back to Library"
            icon="arrow-back"
            size="sm"
            onPress={() => router.navigate('/library')}
          />
          <SecondaryButton
            label="Personalization"
            icon="sparkles-outline"
            size="sm"
            onPress={() => router.navigate('/personalization')}
          />
        </>
      }>
      <View style={{ gap: theme.spacing.lg, maxWidth: 640 }}>
        {!auth.configured ? (
          <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="cloud-offline-outline" size={20} color={theme.colors.textSecondary} />
              <Text variant="headline">Backend not configured</Text>
            </View>
            <Text variant="secondary" tone="secondary">
              Lavender works fully offline as a guest. To enable accounts and cross-device sync,
              set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see
              .env.example) and apply the migrations in supabase/migrations.
            </Text>
          </Surface>
        ) : null}

        {auth.configured && !signedIn ? (
          <Surface bordered padding="lg" style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
              <SecondaryButton
                label="Sign in"
                size="sm"
                onPress={() => {
                  resetMessages();
                  setMode('signin');
                }}
              />
              <SecondaryButton
                label="Create account"
                size="sm"
                onPress={() => {
                  resetMessages();
                  setMode('signup');
                }}
              />
              <SecondaryButton
                label="Forgot password"
                size="sm"
                onPress={() => {
                  resetMessages();
                  setMode('reset');
                }}
              />
            </View>

            <Text variant="headline">
              {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
            </Text>

            {mode === 'signup' ? (
              <Field
                label="Display name (optional)"
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
            ) : null}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {mode !== 'reset' ? (
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secure
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                autoComplete={mode === 'signup' ? 'new-password' : 'password'}
              />
            ) : null}

            <PrimaryButton
              label={
                mode === 'signin'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Send reset link'
              }
              icon={mode === 'reset' ? 'mail-outline' : 'log-in-outline'}
              size="sm"
              loading={busy}
              onPress={submit}
            />

            <Text variant="caption" tone="tertiary">
              Guest mode always works: you can keep importing and playing local files without an
              account. Signing in only adds cross-device metadata sync.
            </Text>
          </Surface>
        ) : null}

        {auth.configured && signedIn ? (
          <>
            <Surface bordered padding="lg" style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon name="person-circle-outline" size={22} color={theme.colors.accent} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text variant="headline" numberOfLines={1}>
                    {auth.user?.displayName || 'Listener'}
                  </Text>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {auth.user?.email}
                  </Text>
                </View>
              </View>

              <Field
                label="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                autoComplete="name"
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <SecondaryButton label="Save name" size="sm" onPress={saveName} />
                <SecondaryButton
                  label="Sign out"
                  icon="log-out-outline"
                  size="sm"
                  onPress={() => {
                    resetMessages();
                    void auth.signOut();
                  }}
                />
              </View>
            </Surface>

            <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon
                  name={sync.status === 'offline' ? 'cloud-offline-outline' : 'sync-outline'}
                  size={20}
                  color={
                    sync.status === 'error'
                      ? theme.colors.danger
                      : sync.status === 'syncing'
                        ? theme.colors.accent
                        : theme.colors.textSecondary
                  }
                />
                <Text variant="headline">Sync</Text>
                <Text variant="caption" tone="tertiary" style={{ marginLeft: 'auto' }}>
                  {sync.status === 'syncing' ? 'Working…' : relativeTime(sync.lastSyncedAt)}
                </Text>
              </View>
              <Text variant="secondary" tone="secondary">
                {STATUS_COPY[sync.status]}
              </Text>
              {sync.error ? (
                <Text
                  variant="caption"
                  style={{ color: theme.colors.danger }}
                  accessibilityLiveRegion="polite">
                  {sync.error}
                </Text>
              ) : null}
              <Text variant="caption" tone="tertiary">
                {sync.cloudTrackCount > 0
                  ? `${sync.cloudTrackCount} imported track${sync.cloudTrackCount === 1 ? '' : 's'} known in the cloud. Files only play where they were imported.`
                  : 'Imported audio never leaves the device that imported it.'}
              </Text>
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
                <PrimaryButton
                  label={sync.pending ? 'Sync now (changes pending)' : 'Sync now'}
                  icon="sync-outline"
                  size="sm"
                  loading={sync.status === 'syncing'}
                  onPress={() => void sync.syncNow()}
                />
              </View>
            </Surface>

            <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
              <Text variant="headline">{showRecovery ? 'Choose a new password' : 'Password'}</Text>
              {showRecovery ? (
                <>
                  <Field
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secure
                    autoComplete="new-password"
                  />
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    <PrimaryButton
                      label="Update password"
                      size="sm"
                      loading={busy}
                      onPress={submitNewPassword}
                    />
                    <SecondaryButton label="Cancel" size="sm" onPress={auth.dismissRecovery} />
                  </View>
                </>
              ) : (
                <>
                  <Text variant="secondary" tone="secondary">
                    Password resets are handled by Supabase. Request a link and we will email it.
                  </Text>
                  <SecondaryButton
                    label="Send password reset email"
                    size="sm"
                    onPress={async () => {
                      resetMessages();
                      const sent = await auth.requestPasswordReset(auth.user?.email ?? '');
                      if (sent) setNotice('Reset link sent to your email.');
                    }}
                  />
                </>
              )}
            </Surface>
          </>
        ) : null}

        {notice ? (
          <Text variant="secondary" style={{ color: theme.colors.accent }} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}
        {error ? (
          <Text
            variant="secondary"
            style={{ color: theme.colors.danger }}
            accessibilityLiveRegion="assertive">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
