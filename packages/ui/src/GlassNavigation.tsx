import { iconSize, useTheme } from '@lavender/design-system';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandMark } from './BrandMark';
import { GlassSurface } from './GlassSurface';
import { Icon, type IconName } from './Icon';
import { Interactive } from './interaction/Interactive';
import { NavigationItem } from './NavigationItem';
import type { NavItem } from './navigation';
import { Text } from './Text';

export type NavigationAppearance = 'glass' | 'minimal';

export interface GlassNavigationProps {
  items: NavItem[];
  activeKey: string;
  onSelect: (item: NavItem) => void;
  /** Rail layout: icons only, for tablet widths. */
  collapsed?: boolean;
  /**
   * `glass` is the Liquid Glass rail used on tablet/mobile; `minimal` is the
   * flush, near-white desktop sidebar.
   */
  appearance?: NavigationAppearance;
  onLogoPress?: () => void;
  /** Pinned to the bottom (theme control, design-system link). */
  footer?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Desktop/tablet navigation. One information architecture, two materials:
 * a floating Liquid Glass rail on tablet, and a flush minimal sidebar on
 * desktop. Never a stretched mobile tab bar.
 */
export function GlassNavigation({
  items,
  activeKey,
  onSelect,
  collapsed = false,
  appearance = 'glass',
  onLogoPress,
  footer,
  style,
}: GlassNavigationProps) {
  const theme = useTheme();
  const minimal = appearance === 'minimal';

  const content = (
    <>
      <Interactive
        onPress={onLogoPress}
        accessibilityLabel="Lavender Music home"
        accessibilityRole="link"
        focusRadius={theme.radius.control}
        style={{
          borderRadius: theme.radius.control,
          paddingVertical: theme.spacing.xs,
        }}>
        {() => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: collapsed ? 0 : theme.spacing.sm,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}>
            <BrandMark size={minimal ? 25 : 28} />
            {collapsed ? null : (
              <View>
                <Text variant="headline" style={{ letterSpacing: -0.2 }}>
                  Lavender
                </Text>
                <Text variant="label" tone="tertiary" style={{ fontSize: 9, letterSpacing: 1.4 }}>
                  Music
                </Text>
              </View>
            )}
          </View>
        )}
      </Interactive>

      <View
        style={{
          height: theme.border.hairline,
          backgroundColor: theme.colors.divider,
          marginVertical: minimal ? theme.spacing.lg : theme.spacing.md,
          marginHorizontal: collapsed ? 6 : theme.spacing.sm,
        }}
      />

      <View style={{ gap: minimal ? 2 : theme.spacing.xs }}>
        {items.map((item) => (
          <NavigationItem
            key={item.key}
            label={item.label}
            icon={item.icon}
            activeIcon={item.activeIcon}
            active={item.key === activeKey}
            collapsed={collapsed}
            appearance={minimal ? 'minimal' : 'default'}
            onPress={() => onSelect(item)}
          />
        ))}
      </View>

      {footer ? (
        <>
          <View style={{ flex: 1 }} />
          <View
            style={{
              paddingTop: theme.spacing.md,
              marginTop: theme.spacing.md,
              borderTopWidth: theme.border.hairline,
              borderTopColor: theme.colors.divider,
              alignItems: collapsed ? 'center' : 'stretch',
              gap: theme.spacing.sm,
            }}>
            {footer}
          </View>
        </>
      ) : null}
    </>
  );

  if (minimal) {
    return (
      <View
        style={[
          {
            flex: 1,
            paddingTop: theme.spacing.xl,
            paddingBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.lg,
            backgroundColor: theme.colors.backgroundElevated,
            borderRightWidth: theme.border.hairline,
            borderRightColor: theme.colors.border,
          },
          style,
        ]}>
        {content}
      </View>
    );
  }

  return (
    <GlassSurface
      material="navigation"
      cornerRadius={theme.radius.glass}
      style={[
        { paddingVertical: theme.spacing.md, paddingHorizontal: collapsed ? 8 : 10 },
        style,
      ]}>
      {content}
    </GlassSurface>
  );
}

/** Compact "design system" entry used in the sidebar footer. */
export function NavigationFooterLink({
  label = 'Design system',
  collapsed = false,
  onPress,
  icon = 'color-palette-outline',
}: {
  label?: string;
  collapsed?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const theme = useTheme();

  return (
    <Interactive
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="link"
      focusRadius={theme.radius.control}
      style={{ borderRadius: theme.radius.control }}>
      {({ hovered }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: theme.spacing.sm,
            height: 34,
            paddingHorizontal: collapsed ? 0 : theme.spacing.sm,
            borderRadius: theme.radius.control,
            backgroundColor: hovered ? theme.colors.hover : 'transparent',
          }}>
          <Icon name={icon} size={iconSize.md} color={theme.colors.textSecondary} />
          {collapsed ? null : (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {label}
            </Text>
          )}
        </View>
      )}
    </Interactive>
  );
}
