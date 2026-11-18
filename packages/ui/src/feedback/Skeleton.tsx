import { useReducedMotion, useTheme } from '@lavender/design-system';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  cornerRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder. Pulses opacity only (no gradient sweep) so it stays
 * cheap on native and never distracts; reduced motion renders a static block.
 */
export function Skeleton({ width = '100%', height = 16, cornerRadius, style }: SkeletonProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.62)).current;
  const duration = theme.motion.shimmer / 2;

  useEffect(() => {
    if (reducedMotion) {
      pulse.setValue(0.72);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0.62,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [duration, pulse, reducedMotion]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: cornerRadius ?? theme.radius.xs,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}
