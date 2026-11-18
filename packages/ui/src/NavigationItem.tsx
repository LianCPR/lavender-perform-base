import { iconSize, useReducedMotion, useTheme } from '@lavender/design-system';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Interactive } from './interaction/Interactive';
import { Text } from './Text';

export interface NavigationItemProps {
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  active?: boolean;
  /** Sidebar rail: icon only. */
  collapsed?: boolean;
  /** `row` for sidebar/rail, `stacked` for the bottom tab bar. */
  layout?: 'row' | 'stacked';
  /** `minimal` quiets the active treatment for the desktop sidebar. */
  appearance?: 'default' | 'minimal';
  onPress?: () => void;
  /** Lets the tab bar place its shared touch lens before the press resolves. */
  onPressIn?: () => void;
  onPressOut?: () => void;
  /** 1-based position, announced so the tab list has a spoken order. */
  accessibleIndex?: number;
  accessibleCount?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One navigation destination.
 *
 * Row layout carries the sidebar; stacked layout carries the tab bar. Both share
 * the same icon logic, active treatment and interaction states.
 */
export function NavigationItem({
  label,
  icon,
  activeIcon,
  active = false,
  collapsed = false,
  layout = 'row',
  appearance = 'default',
  onPress,
  onPressIn,
  onPressOut,
  accessibleIndex,
  accessibleCount,
  style,
}: NavigationItemProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const minimal = appearance === 'minimal';
  // The selected tab's lens fades in and out instead of snapping, so moving
  // between tabs reads as one light traveling across the bar.
  const selection = useRef(new Animated.Value(active ? 1 : 0)).current;
  const foreground = active
    ? minimal
      ? theme.colors.accentText
      : theme.colors.navActiveText
    : theme.colors.navIdleText;
  const activeBackground = minimal
    ? theme.colors.accentSubtle
    : theme.colors.navActiveBackground;

  useEffect(() => {
    if (layout !== 'stacked') return;
    if (reducedMotion) {
      selection.setValue(active ? 1 : 0);
      return;
    }
    const animation = Animated.timing(selection, {
      toValue: active ? 1 : 0,
      duration: theme.motion.base,
      easing: Easing.bezier(...theme.motion.easingBezier.standard),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, layout, reducedMotion, selection, theme.motion]);

  if (layout === 'stacked') {
    return (
      <Interactive
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityValue={
          accessibleIndex && accessibleCount
            ? { text: `${accessibleIndex} of ${accessibleCount}` }
            : undefined
        }
        accessibilityState={{ selected: active }}
        focusRadius={theme.radius.pill}
        pressedScale={0.94}
        style={[{ flex: 1, borderRadius: theme.radius.pill }, style]}>
        {({ hovered, pressed }) => (
          <View
            style={{
              position: 'relative',
              height: theme.layout.tabBarHeight - theme.spacing.sm,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.xs,
              overflow: 'hidden',
              backgroundColor: hovered && !active ? theme.colors.hover : 'transparent',
              opacity: pressed ? 0.86 : 1,
            }}>
            {/* The selection lens belongs to the tab bar (one shared surface),
                so a tab only animates its own icon and label on selection. */}
            <Animated.View
              pointerEvents="none"
              style={{
                transform: [
                  {
                    scale: selection.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1.06],
                    }),
                  },
                ],
              }}>
              <Icon
                name={active && activeIcon ? activeIcon : icon}
                size={iconSize.xl}
                color={foreground}
              />
            </Animated.View>
            <Animated.View pointerEvents="none" style={{ opacity: selection.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }}>
              <Text
                variant="micro"
                numberOfLines={1}
                style={{
                  color: foreground,
                  fontSize: 11,
                  lineHeight: 13,
                  letterSpacing: 0,
                  fontWeight: active ? '700' : theme.typography.micro.fontWeight,
                }}>
                {label}
              </Text>
            </Animated.View>
          </View>
        )}
      </Interactive>
    );
  }

  return (
    <Interactive
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      focusRadius={theme.radius.control}
      style={[{ borderRadius: theme.radius.control }, style]}>
      {({ hovered }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: minimal ? theme.spacing.sm : theme.spacing.md,
            height: minimal ? 44 : 48,
            paddingHorizontal: collapsed ? 0 : theme.spacing.md,
            borderRadius: minimal ? theme.radius.sm : theme.radius.control,
            backgroundColor: active
              ? activeBackground
              : hovered
                ? theme.colors.hover
                : 'transparent',
          }}>
          <Icon
            name={active && activeIcon ? activeIcon : icon}
            size={minimal ? iconSize.lg : iconSize.xl}
            color={foreground}
          />
          {collapsed ? null : (
            <View style={{ flex: 1 }}>
              <Text
                variant="callout"
                numberOfLines={1}
                style={{
                  color: foreground,
                  fontSize: minimal ? 14 : undefined,
                  fontWeight: active ? '600' : '500',
                }}>
                {label}
              </Text>
            </View>
          )}
        </View>
      )}
    </Interactive>
  );
}
