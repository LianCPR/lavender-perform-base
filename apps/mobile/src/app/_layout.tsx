import '../polyfills';

import { AuthProvider } from '@lavender/backend';
import {
  AppShell,
  LibraryProvider,
  PersonalizationProvider,
  PlayerHost,
  SyncHost,
  ThemeProvider,
} from '@lavender/ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { registerNativeStorage } from '../storage';

// Register the document-directory adapters before the providers read once.
registerNativeStorage();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <LibraryProvider>
            <PlayerHost>
              <PersonalizationProvider>
                <SyncHost>
                  <AppShell>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: 'transparent' },
                        animation: 'fade',
                      }}
                    />
                  </AppShell>
                  <StatusBar style="auto" />
                </SyncHost>
              </PersonalizationProvider>
            </PlayerHost>
          </LibraryProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
