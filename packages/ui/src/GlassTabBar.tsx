import { useReducedMotion, useTheme } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassSurface } from './GlassSurface';
import { NavigationItem } from './NavigationItem';
import type { NavItem } from './navigation';

export interface GlassTabBarProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (item: NavItem) => void;
  style?: StyleProp<ViewStyle>;
}

interface TabFrame {
  x: number;
  width: number;
}

/**
 * Pill-shaped floating tab bar with a single travelling selection lens.
 *
 * Apple renders a glass container whose shapes morph into one another rather
 * than four separate highlights. The same idea is reproduced here with shared
 * geometry: the bar measures each tab once, then one indicator springs between
 * measured frames. It stretches slightly along the direction of travel so the
 * material reads as liquid in motion, and it is the only element that carries
 * the lavender selection tint.
 */
export function GlassTabBar({ items, activeKey, onSelect, style }: GlassTabBarProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const itemHeight = theme.layout.tabBarHeight - theme.spacing.sm;
  const [frames, setFrames] = useState<Record<string, TabFrame>>({});
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const activeFrame = frames[activeKey];

  // Two values, not a layout animation: position and a short stretch. Both are
  // transform-only, so the bar never reflows while it travels.
  const offset = useRef(new Animated.Value(0)).current;
  const stretch = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  // Initial placement is instant: the lens must be under the active tab on the
  // first frame, not fly in from the left edge.
  const placed = useRef(false);
  useEffect(() => {
    if (!activeFrame) return;
    if (!placed.current) {
      placed.current = true;
      offset.setValue(activeFrame.x);
      return;
    }
    if (reducedMotion) {
      offset.setValue(activeFrame.x);
      stretch.setValue(0);
      return;
    }
    stretch.stopAnimation();
    const travel = Animated.spring(offset, {
      toValue: activeFrame.x,
      useNativeDriver: Platform.OS !== 'web',
      overshootClamping: true,
      ...theme.motion.spring.travel,
    });
    travel.start();
    // A quick swell that peaks while the lens is in flight and is gone by the
    // time it lands; it is what makes the movement read as morphing.
    const swell = Animated.sequence([
      Animated.timing(stretch, {
        toValue: 1,
        duration: theme.motion.press,
        easing: Easing.bezier(...theme.motion.easingBezier.materialize),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(stretch, {
        toValue: 0,
        duration: theme.motion.tab - theme.motion.press,
        easing: Easing.bezier(...theme.motion.easingBezier.standard),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    swell.start();
    return () => {
      travel.stop();
      swell.stop();
    };
  }, [activeFrame, offset, reducedMotion, stretch, theme.motion]);

  useEffect(() => {
    if (reducedMotion) {
      press.setValue(pressedKey ? 1 : 0);
      return;
    }
    const animation = Animated.spring(press, {
      toValue: pressedKey ? 1 : 0,
      overshootClamping: true,
      useNativeDriver: Platform.OS !== 'web',
      ...(pressedKey ? theme.motion.spring.press : theme.motion.spring.settle),
    });
    animation.start();
    return () => animation.stop();
  }, [pressedKey, press, reducedMotion, theme.motion]);

  const pressedFrame = pressedKey ? frames[pressedKey] : undefined;
  const indicatorWidth = activeFrame?.width ?? 0;

  return (
    <GlassSurface
      material="navigation"
      cornerRadius={theme.radius.pill}
      style={[
        {
          height: theme.layout.tabBarHeight,
          paddingHorizontal: theme.spacing.xs,
          justifyContent: 'center',
        },
        style,
      ]}>
      <View style={{ position: 'relative', height: itemHeight }}>
        {/* Selection lens: the one piece of lavender in the bar. */}
        {activeFrame ? (
          <Animated.View
            testID="tab-lens"
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: indicatorWidth,
              height: itemHeight,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.navActiveBackground,
              borderWidth: 0.5,
              borderTopWidth: 1,
              borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.30)',
              borderTopColor: theme.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.64)',
              overflow: 'hidden',
              transform: [
                { translateX: offset },
                {
                  scaleX: stretch.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            }}>
            <LinearGradient
              colors={theme.isDark
                ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.12)']
                : ['rgba(255,255,255,0.34)', 'rgba(255,255,255,0.04)', 'rgba(87,45,110,0.06)']}
              locations={[0, 0.55, 1]}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
          </Animated.View>
        ) : null}

        {/* Touch lens: contact light under the finger, separate from selection. */}
        {pressedFrame ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pressedFrame.x,
              top: 0,
              width: pressedFrame.width,
              height: itemHeight,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.isDark
                ? 'rgba(255,255,255,0.075)'
                : 'rgba(255,255,255,0.42)',
              opacity: press,
              transform: [
                {
                  scale: press.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }),
                },
              ],
            }}
          />
        ) : null}

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xxs,
            height: itemHeight,
          }}>
          {items.map((item, index) => (
            <View
              key={item.key}
              style={{ flex: 1, height: itemHeight }}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                setFrames((current) => {
                  const previous = current[item.key];
                  if (previous && Math.abs(previous.x - x) < 0.5 && Math.abs(previous.width - width) < 0.5) {
                    return current;
                  }
                  return { ...current, [item.key]: { x, width } };
                });
              }}>
              <NavigationItem
                label={item.label}
                icon={item.icon}
                activeIcon={item.activeIcon}
                active={item.key === activeKey}
                layout="stacked"
                onPress={() => onSelect(item)}
                onPressIn={() => setPressedKey(item.key)}
                onPressOut={() => setPressedKey((current) => (current === item.key ? null : current))}
                accessibleIndex={index + 1}
                accessibleCount={items.length}
              />
            </View>
          ))}
        </View>
      </View>
    </GlassSurface>
  );
}
