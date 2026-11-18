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
                      }}>
                      {/* Now Playing is reached through the artwork expansion, so
                          its screen does not slide in on top of that motion. */}
                      <Stack.Screen name="now-playing" options={{ animation: 'fade' }} />
                    </Stack>
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
