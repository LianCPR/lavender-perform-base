import { useReducedMotion, useTheme } from '@lavender/design-system';
import { clamp } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, PanResponder } from 'react-native';
import {
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface PlaybackProgressProps {
  /** Position from 0 to 1. */
  value: number;
  /** `thin` for the mini player, `standard` for the full player. */
  variant?: 'thin' | 'standard';
  /** Enables seeking by tapping anywhere on the track. */
  onSeek?: (fraction: number) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Playback progress.
 *
 * The fill is the only place a gradient is used at small size; the handle only
 * appears in the full player variant. Seeking is expressed as a fraction so the
 * component stays engine-agnostic.
 */
export function PlaybackProgress({
  value,
  variant = 'thin',
  onSeek,
  accessibilityLabel = 'Playback position',
  style,
}: PlaybackProgressProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const width = useRef(0);
  const clamped = clamp(value, 0, 1);
  const height = variant === 'thin' ? 2 : 4;
  const fill = useRef(new Animated.Value(clamped)).current;
  const percent = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  }) as unknown as DimensionValue;
  const knobSize = 10;

  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: clamped,
      duration: reducedMotion ? 0 : 720,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, fill, reducedMotion]);

  const seekFromEvent = useCallback((event: GestureResponderEvent) => {
    if (!onSeek || width.current <= 0) return;
    onSeek(clamp(event.nativeEvent.locationX / width.current, 0, 1));
  }, [onSeek]);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => Boolean(onSeek),
    onMoveShouldSetPanResponder: (_, gesture) => Boolean(onSeek) && Math.abs(gesture.dx) > 1,
    onPanResponderGrant: seekFromEvent,
    onPanResponderMove: seekFromEvent,
    onPanResponderTerminationRequest: () => false,
  }), [onSeek, seekFromEvent]);

  return (
    <View
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
      }}
      style={[
        styles.container,
        { height: Math.max(height, knobSize), justifyContent: 'center' },
        style,
      ]}>
      <View
        style={{
          height,
          borderRadius: height,
          backgroundColor: theme.colors.progressTrack,
          overflow: 'hidden',
        }}>
        <AnimatedGradient
          colors={theme.colors.progressFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: percent }}
        />
      </View>

      {variant === 'standard' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: percent,
            width: knobSize,
            height: knobSize,
            marginLeft: -knobSize / 2,
            borderRadius: knobSize / 2,
            backgroundColor: theme.colors.accent,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.backgroundElevated,
          }}
        />
      ) : null}

      {onSeek ? (
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
          onPress={seekFromEvent}
          {...panResponder.panHandlers}
          style={[StyleSheet.absoluteFill, { cursor: 'pointer' }]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);
