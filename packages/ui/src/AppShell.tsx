import { useReducedMotion, useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  usePathname,
  useRouter,
} from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from './BrandMark';
import { IconButton } from './buttons/IconButton';
import { GlassMiniPlayer } from './GlassMiniPlayer';
import { GlassNavigation, NavigationFooterLink } from './GlassNavigation';
import { GlassTabBar } from './GlassTabBar';
import { useBreakpoint } from './hooks/useBreakpoint';
import {
  beginNowPlayingExpansion,
  isNowPlayingTransitioning,
  NowPlayingArtworkTransition,
  registerMiniArtworkRect,
  setNowPlayingCollapsedHandler,
  setNowPlayingMotionReduced,
} from './motion/NowPlayingTransition';
import { activeNavKey, APP_NAV_ITEMS, type NavItem } from './navigation';
import { Text } from './Text';
import { ThemeControl } from './ThemeControl';
import { withAlpha } from './utils/color';

const styles = StyleSheet.create({
  backdrop: {
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
  },
});

export interface AppShellProps {
  children: ReactNode;
  navItems?: NavItem[];
}

/**
 * The shared frame for both apps.
 *
 * - compact: mobile header, floating tab bar, mini player stacked above it
 * - medium: icon rail, no header, floating mini player
 * - expanded/wide: flush minimal sidebar with a solid player docked bottom-right
 *
 * The route content itself is provided by the app (Expo Router `<Stack />`), so
 * the same shell serves the iOS app and the responsive web app.
 */
export function AppShell({ children, navItems = APP_NAV_ITEMS }: AppShellProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const player = usePlayer();
  const library = useLibrary();
  const reducedMotion = useReducedMotion();

  // Motion preference is read once here and published to the transition store,
  // which is a plain module: it cannot call hooks itself.
  useEffect(() => {
    setNowPlayingMotionReduced(reducedMotion);
  }, [reducedMotion]);

  // A collapse ends with a navigation the transition does not own.
  useEffect(() => {
    setNowPlayingCollapsedHandler(() => router.navigate('/'));
    return () => setNowPlayingCollapsedHandler(null);
  }, [router]);

  const activeKey = activeNavKey(pathname ?? '/');
  const isNowPlaying = pathname === '/now-playing';
  const showSidebar = breakpoint !== 'compact';
  const collapsed = breakpoint === 'medium';
  // Desktop is the calm, minimal experience. Tablet keeps the floating glass
  // rail and phone keeps the full Liquid Glass chrome.
  const minimalDesktop = breakpoint === 'expanded' || breakpoint === 'wide';
  // Browsers report no safe-area inset, so the compact header would otherwise sit
  // flush against the viewport edge (and clash with environment overlays there).
  const headerTopInset = insets.top > 0 ? insets.top : theme.spacing.xxl;
  // Floating chrome shares one baseline inset so the tab bar and the mini
  // player above it keep a deliberate 8px gap on phones and inside safe areas.
  const chromeBottom = insets.bottom + theme.spacing.md;

  const handleSelect = useCallback(
    (item: NavItem) => {
      if (item.key === activeKey) return;
      router.navigate(item.href);
    },
    [activeKey, router],
  );

  const track = player.currentTrack;
  const progress = player.durationSec > 0 ? player.positionSec / player.durationSec : 0;

  // Every surface (Home, Now Playing, Browse, Search, Library) drives the same
  // player, so this single effect keeps the persisted "recently played" list in
  // sync without each screen recording plays separately.
  const recordPlayed = library.recordPlayed;
  useEffect(() => {
    if (track) recordPlayed(track.id);
  }, [recordPlayed, track]);

  // React Navigation paints its own opaque background behind every screen.
  // Make it transparent so the app shell's surface shows through.
  const navigationTheme = useMemo(() => {
    const base = theme.isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: theme.isDark,
      colors: {
        ...base.colors,
        background: 'transparent',
        card: 'transparent',
        border: 'transparent',
        primary: theme.colors.accent,
        text: theme.colors.text,
      },
    };
  }, [theme]);

  // The full Now Playing view owns playback controls; a second floating player
  // there would cover its transport row, so it is suppressed on that route.
  const miniPlayer = track && !isNowPlaying ? (
      <GlassMiniPlayer
        title={track.title}
        artist={track.artistName}
        palette={track.palette}
        isPlaying={player.isPlaying}
        progress={progress}
        isFavorite={library.isFavorite(track.id)}
        uri={track.artworkUri}
        onArtworkRect={registerMiniArtworkRect}
        onPress={() => {
          // Rapid repeat taps must not stack two Now Playing screens.
          if (!track || isNowPlayingTransitioning()) return;
          // The overlay artwork covers the navigation: the player's cover is
          // measured first, so the destination can land exactly on it.
          beginNowPlayingExpansion({
            palette: track.palette,
            uri: track.artworkUri,
            trackId: track.id,
          });
          router.push('/now-playing');
        }}
        onTogglePlay={player.togglePlayback}
        onNext={player.next}
        onToggleFavorite={() => library.toggleFavorite(track.id)}
        error={player.error}
        isBuffering={player.isBuffering}
        compact={breakpoint === 'compact'}
        appearance={minimalDesktop ? 'minimal' : 'glass'}
        tintColor={minimalDesktop ? undefined : theme.artwork[track.palette][1]}
        tintSecondary={minimalDesktop ? undefined : theme.artwork[track.palette][0]}
      />
    ) : null;

  const glowStrong = theme.isDark ? 0.09 : 0.08;
  const glowSoft = theme.isDark ? 0.05 : 0.05;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Ambient light: edge-free accent washes give the neutral canvas depth. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]}>
        <LinearGradient
          colors={[
            withAlpha(theme.colors.accentSoft, glowStrong),
            withAlpha(theme.colors.accentSoft, glowStrong * 0.4),
            withAlpha(theme.colors.accentSoft, 0),
          ]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.55, y: 0 }}
          end={{ x: 0.45, y: 1 }}
          style={[styles.glow, { left: 0, right: 0, top: 0, height: '46%' }]}
        />
        <LinearGradient
          colors={[
            withAlpha(theme.colors.accent, 0),
            withAlpha(theme.colors.accent, glowSoft * 0.7),
            withAlpha(theme.colors.accent, glowSoft),
          ]}
          locations={[0, 0.6, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.glow, { left: 0, right: 0, bottom: 0, height: '38%' }]}
        />
      </View>

      <View style={{ flex: 1, flexDirection: showSidebar ? 'row' : 'column' }}>
        {showSidebar ? (
          <View
            style={{
              paddingTop: minimalDesktop ? 0 : insets.top + theme.spacing.md,
              paddingBottom: minimalDesktop ? 0 : insets.bottom + theme.spacing.md,
              paddingLeft: minimalDesktop ? 0 : theme.spacing.md,
            }}>
            <GlassNavigation
              items={navItems}
              activeKey={activeKey}
              collapsed={collapsed}
              appearance={minimalDesktop ? 'minimal' : 'glass'}
              onSelect={handleSelect}
              onLogoPress={() => router.navigate('/')}
              footer={
                <View style={{ gap: theme.spacing.sm }}>
                  <ThemeControl variant={collapsed ? 'icon' : 'segmented'} />
                  <NavigationFooterLink
                    label="Account"
                    icon="person-circle-outline"
                    collapsed={collapsed}
                    onPress={() => router.navigate('/account')}
                  />
                  <NavigationFooterLink
                    collapsed={collapsed}
                    onPress={() => router.navigate('/design')}
                  />
                </View>
              }
              style={{
                flex: 1,
                width: collapsed ? theme.layout.sidebarRailWidth : theme.layout.sidebarWidth,
              }}
            />
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          {!showSidebar ? (
            <View
              style={{
                paddingTop: headerTopInset,
                height: headerTopInset + 56,
                paddingLeft: insets.left + theme.spacing.lg,
                paddingRight: insets.right + theme.spacing.lg,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: theme.spacing.md,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  flexShrink: 1,
                  minWidth: 0,
                }}>
                <BrandMark size={26} />
                <Text variant="subheading" numberOfLines={1}>
                  Lavender
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                <IconButton
                  icon="person-circle-outline"
                  label="Account"
                  size="md"
                  onPress={() => router.navigate('/account')}
                />
                <IconButton
                  icon="color-palette-outline"
                  label="Design system"
                  size="md"
                  onPress={() => router.navigate('/design')}
                />
                <ThemeControl variant="icon" />
              </View>
            </View>
          ) : null}

          <View style={{ flex: 1 }}>
            <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
          </View>

          {showSidebar ? (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                right: theme.spacing.xl,
                bottom: insets.bottom + theme.spacing.lg,
                width: collapsed ? 320 : 380,
              }}>
              {miniPlayer}
            </View>
          ) : (
            <>
              {miniPlayer ? (
                <View
                  pointerEvents="box-none"
                  style={{
                    position: 'absolute',
                    left: theme.spacing.md,
                    right: theme.spacing.md,
                    bottom: chromeBottom + theme.layout.tabBarHeight + theme.spacing.sm,
                  }}>
                  {miniPlayer}
                </View>
              ) : null}
              {/* Now Playing is a full-screen listening view on phones: its
                  transport row needs the space the floating tab bar would
                  cover, and the screen provides its own way back. */}
              {!isNowPlaying ? (
                <View
                  style={{
                    position: 'absolute',
                    left: theme.spacing.md,
                    right: theme.spacing.md,
                    bottom: chromeBottom,
                  }}>
                  <GlassTabBar items={navItems} activeKey={activeKey} onSelect={handleSelect} />
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
      <NowPlayingArtworkTransition />
    </View>
  );
}
