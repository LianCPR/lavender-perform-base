import { useReducedMotion, useTheme } from '@lavender/design-system';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type AccessibilityValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface InteractionState {
  hovered: boolean;
  pressed: boolean;
  focused: boolean;
}

export interface InteractiveProps {
  /** Render prop so each component styles its own hover/press/focus look. */
  children: (state: InteractionState) => ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed; defaults to the motion token. */
  pressedScale?: number;
  /** Radius of the inset focus ring. */
  focusRadius?: number;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  hitSlop?: number;
  testID?: string;
}

/**
 * The shared interaction surface.
 *
 * Every pressable component in the library renders through this so hover,
 * pressed, focused and disabled states — and their timing — stay identical
 * everywhere. Press-in is a fast, clamped spring (the control answers the
 * finger immediately); release settles with a slower spring instead of snapping.
 * Only `transform` is animated, and glass opacity is never touched.
 */
export function Interactive({
  children,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  disabled = false,
  style,
  pressedScale,
  focusRadius,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  accessibilityValue,
  hitSlop,
  testID,
}: InteractiveProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const target = pressed && !disabled ? (pressedScale ?? theme.motion.pressedScale) : 1;

    if (reducedMotion) {
      scale.setValue(target);
      return;
    }

    const spring = pressed ? theme.motion.spring.press : theme.motion.spring.settle;
    const animation = Animated.spring(scale, {
      toValue: target,
      overshootClamping: true,
      useNativeDriver: Platform.OS !== 'web',
      ...spring,
    });
    animation.start();
    return () => animation.stop();
  }, [pressed, disabled, pressedScale, reducedMotion, scale, theme.motion]);

  const cursor: ViewStyle['cursor'] = disabled || !onPress ? 'auto' : 'pointer';

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled }}
      accessibilityValue={accessibilityValue}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        setPressed(true);
        onPressIn?.();
      }}
      onPressOut={() => {
        setPressed(false);
        onPressOut?.();
      }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => {
        setHovered(false);
        setPressed(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        style,
        {
          transform: [{ scale }],
          opacity: disabled ? theme.opacity.disabled : 1,
          cursor,
        },
      ]}>
      {children({ hovered, pressed, focused })}
      {focused && !disabled ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: focusRadius ?? theme.radius.control,
              borderWidth: theme.border.medium,
              borderColor: theme.colors.focusRing,
            },
          ]}
        />
      ) : null}
    </AnimatedPressable>
  );
}
