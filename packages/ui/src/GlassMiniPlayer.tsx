import { elevationStyle, iconSize, useReducedMotion, useTheme } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import type { TransitionRect } from './motion/NowPlayingTransition';

import { Artwork } from './Artwork';
import { IconButton } from './buttons/IconButton';
import { GlassSurface } from './GlassSurface';
import { Icon } from './Icon';
import { Interactive } from './interaction/Interactive';
import { PlaybackProgress } from './PlaybackProgress';
import { Text } from './Text';

export type MiniPlayerAppearance = 'glass' | 'minimal';

export interface GlassMiniPlayerProps {
  title: string;
  artist: string;
  palette: ArtworkPalette;
  isPlaying: boolean;
  /** 0–1 playback position. */
  progress: number;
  isFavorite?: boolean;
  onPress?: () => void;
  onTogglePlay?: () => void;
  onNext?: () => void;
  onToggleFavorite?: () => void;
  onSeek?: (fraction: number) => void;
  /** Playback or missing-file error shown instead of the artist line. */
  error?: string | null;
  isBuffering?: boolean;
  /** Hides favorite/skip controls on narrow surfaces. */
  compact?: boolean;
  /**
   * `glass` is the floating Liquid Glass player used on mobile/tablet;
   * `minimal` is the solid desktop player.
   */
  appearance?: MiniPlayerAppearance;
  /** Ambient artwork tint for the glass variant. */
  tintColor?: string;
  /** Second artwork color for the opposite edge of the glass. */
  tintSecondary?: string;
  /** Provider or imported cover; keeps the player and Now Playing identical. */
  uri?: string;
  /** Reports the artwork's window rect so it can expand into Now Playing. */
  onArtworkRect?: (rect: TransitionRect) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating player surface. Presentational only: all state arrives through props
 * from `@lavender/music-player`, which owns the audio engine.
 */
export function GlassMiniPlayer({
  title,
  artist,
  palette,
  isPlaying,
  progress,
  isFavorite = false,
  onPress,
  onTogglePlay,
  onNext,
  onToggleFavorite,
  onSeek,
  error,
  isBuffering = false,
  compact = false,
  appearance = 'glass',
  tintColor,
  tintSecondary,
  uri,
  onArtworkRect,
  style,
}: GlassMiniPlayerProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  // Pressing the player flexes the whole material, not just the row: the glass
  // and the artwork tint answer together.
  const [surfacePressed, setSurfacePressed] = useState(false);
  // A new track swaps the cover with a short settle instead of a hard cut, and
  // never moves the text: both lines are single-line with fixed geometry.
  const artworkSwap = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion) {
      artworkSwap.setValue(1);
      return;
    }
    artworkSwap.setValue(0.4);
    const animation = Animated.timing(artworkSwap, {
      toValue: 1,
      duration: theme.motion.release,
      easing: Easing.bezier(...theme.motion.easingBezier.standard),
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [artworkSwap, palette, reducedMotion, theme.motion, title, uri]);
  const artworkRef = useRef<ComponentRef<typeof View> | null>(null);
  const measureArtwork = useCallback(() => {
    artworkRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) onArtworkRect?.({ x, y, width, height });
    });
  }, [onArtworkRect]);
  const trackIdentity = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        flex: 1,
      }}>
      <Animated.View
        ref={artworkRef}
        onLayout={measureArtwork}
        style={{
          opacity: artworkSwap,
          transform: [
            { scale: artworkSwap.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) },
          ],
        }}>
        <Artwork palette={palette} uri={uri} size={42} cornerRadius={9} />
      </Animated.View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        <Text
          variant="secondary"
          tone="secondary"
          numberOfLines={1}
          style={error ? { color: theme.colors.danger } : undefined}>
          {error ?? artist}
        </Text>
      </View>
    </View>
  );

  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {onPress ? (
          <Interactive
            onPress={onPress}
            onPressIn={() => setSurfacePressed(true)}
            onPressOut={() => setSurfacePressed(false)}
            pressedScale={0.99}
            accessibilityLabel={`Now playing ${title} by ${artist}`}
            focusRadius={theme.radius.sm}
            style={{ flex: 1, borderRadius: theme.radius.sm }}>
            {({ hovered }) => (
              <View style={{ opacity: hovered ? 0.9 : 1 }}>{trackIdentity}</View>
            )}
          </Interactive>
        ) : (
          <View style={{ flex: 1 }}>{trackIdentity}</View>
        )}

        {onToggleFavorite && !compact ? (
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            selected={isFavorite}
            size="md"
            onPress={onToggleFavorite}
          />
        ) : null}

        {onNext && !compact ? (
          <IconButton icon="play-skip-forward" label="Next track" size="md" onPress={onNext} />
        ) : null}

        <Interactive
          onPress={onTogglePlay}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          focusRadius={theme.radius.pill}
          pressedScale={0.94}>
          {({ hovered }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: theme.radius.pill,
                backgroundColor: appearance === 'minimal'
                  ? theme.colors.accentSubtle
                  : theme.colors.navActiveBackground,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                opacity: hovered ? 0.92 : 1,
              }}>
              {/* The control is part of the material: a bevel and a light ramp
                  catch the same light as the surface it sits on. */}
              <LinearGradient
                pointerEvents="none"
                colors={theme.isDark
                  ? ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.03)', 'rgba(0,0,0,0.12)']
                  : ['rgba(255,255,255,0.46)', 'rgba(255,255,255,0.08)', 'rgba(120,80,140,0.07)']}
                locations={[0, 0.55, 1]}
                start={{ x: 0.28, y: 0 }}
                end={{ x: 0.72, y: 1 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={iconSize.md + 4}
                color={appearance === 'minimal' ? theme.colors.accentText : theme.colors.navActiveText}
                style={isPlaying ? undefined : { marginLeft: 2 }}
              />
            </View>
          )}
        </Interactive>
      </View>

      <PlaybackProgress
        value={progress}
        onSeek={onSeek}
        style={{ marginTop: theme.spacing.sm }}
      />
      {isBuffering ? (
        <Text variant="micro" tone="tertiary" style={{ marginTop: 2 }}>
          Buffering…
        </Text>
      ) : null}
    </>
  );

  const padding = { paddingTop: 9, paddingHorizontal: 10, paddingBottom: 8 };

  if (appearance === 'minimal') {
    return (
      <View
        style={[
          padding,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.card,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.border,
          },
          elevationStyle(theme.elevation.medium),
          style,
        ]}>
        {content}
      </View>
    );
  }

  return (
    <GlassSurface
      material="player"
      cornerRadius={theme.radius.lg}
      tintColor={tintColor}
      tintSecondary={tintSecondary}
      pressed={surfacePressed}
      style={[padding, style]}>
      {content}
    </GlassSurface>
  );
}
