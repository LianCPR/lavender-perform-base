import { useReducedMotion, useTheme } from '@lavender/design-system';
import { formatDuration, type Track } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export interface TrackRowProps {
  track: Track;
  /** One-based position shown when the row is not playing. */
  index?: number;
  isPlaying?: boolean;
  isCurrent?: boolean;
  isFavorite?: boolean;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  /** Opens per-track actions (queue, edit, remove). */
  onMenu?: () => void;
  /** Show `artist · album` instead of just the artist. */
  showAlbum?: boolean;
  /** Render a hairline above the row (list separators). */
  divider?: boolean;
  /** Saved-to-library state for provider tracks. */
  isSaved?: boolean;
  onToggleSave?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single track line. The row press target and the favorite control are
 * siblings — never nested buttons — so the HTML output stays valid on web.
 */
export function TrackRow({
  track,
  index,
  isPlaying = false,
  isCurrent = false,
  isFavorite = false,
  onPress,
  onToggleFavorite,
  onMenu,
  showAlbum = false,
  divider = false,
  isSaved = false,
  onToggleSave,
  style,
}: TrackRowProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: isCompact ? theme.spacing.xxs : theme.spacing.sm,
          borderTopWidth: divider ? theme.border.hairline : 0,
          borderTopColor: theme.colors.divider,
          backgroundColor: isCurrent ? theme.colors.accentSubtle : 'transparent',
          borderRadius: theme.radius.sm,
          overflow: 'hidden',
        },
        style,
      ]}>
      {isCurrent ? (
        <LinearGradient
          pointerEvents="none"
          colors={theme.colors.progressFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            bottom: 6,
            width: 3,
            borderRadius: 2,
          }}
        />
      ) : null}
      <Interactive
        onPress={onPress}
        accessibilityLabel={`${track.title} by ${track.artistName}`}
        accessibilityState={{ selected: isPlaying }}
        focusRadius={theme.radius.sm}
        style={{ flex: 1, borderRadius: theme.radius.sm }}>
        {({ hovered }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: theme.radius.sm,
              backgroundColor: hovered && !isCurrent ? theme.colors.hover : 'transparent',
            }}>
            <View style={{ width: 18, alignItems: 'center' }}>
              {isPlaying ? (
                <PlayingBars />
              ) : index ? (
                <Text variant="playback" tone="tertiary">
                  {index}
                </Text>
              ) : null}
            </View>

            <Artwork
              palette={track.palette}
              uri={track.artworkUri}
              size={40}
              cornerRadius={8}
              elevated={isCurrent}
            />

            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Text variant="headline" numberOfLines={1} style={isCurrent ? { color: theme.colors.accent } : undefined}>
                {track.title}
              </Text>
              <Text variant="secondary" tone="secondary" numberOfLines={1}>
                {showAlbum ? `${track.artistName} · ${track.albumTitle}` : track.artistName}
              </Text>
            </View>
          </View>
        )}
      </Interactive>

      {track.provider && !isCompact ? (
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 999,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.border,
          }}>
          <Text variant="micro" tone="tertiary" style={{ letterSpacing: 0.4 }}>
            {track.provider.toUpperCase()}
          </Text>
        </View>
      ) : null}

      {!isCompact ? (
        <Text variant="playback" tone="tertiary">
          {formatDuration(track.durationSec)}
        </Text>
      ) : null}

      {onToggleSave ? (
        <IconButton
          icon={isSaved ? 'bookmark' : 'bookmark-outline'}
          label={isSaved ? `Remove ${track.title} from library` : `Save ${track.title} to library`}
          selected={isSaved}
          size="sm"
          onPress={onToggleSave}
        />
      ) : null}

      {onToggleFavorite ? (
        <IconButton
          icon={isFavorite ? 'heart' : 'heart-outline'}
          label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          selected={isFavorite}
          size="sm"
          onPress={onToggleFavorite}
        />
      ) : null}

      {onMenu ? (
        <IconButton
          icon="ellipsis-horizontal"
          label={`Actions for ${track.title}`}
          size="sm"
          onPress={onMenu}
        />
      ) : null}
    </View>
  );
}

/** Three bars that animate only while a track is playing. */
function PlayingBars() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const values = useRef([
    new Animated.Value(0.45),
    new Animated.Value(0.8),
    new Animated.Value(0.6),
  ]).current;

  useEffect(() => {
    if (reducedMotion) return;

    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 1,
            duration: 380 + index * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0.32,
            duration: 380 + index * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reducedMotion, values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {values.map((value, index) => (
        <Animated.View
          key={index}
          style={{
            width: 2,
            borderRadius: 1,
            backgroundColor: theme.colors.accent,
            height: reducedMotion
              ? [6, 14, 9][index]
              : value.interpolate({ inputRange: [0, 1], outputRange: [4, 14] }),
          }}
        />
      ))}
    </View>
  );
}
