import { iconSize, useTheme } from '@lavender/design-system';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassSurface } from '../GlassSurface';
import { Icon, type IconName } from '../Icon';
import { Interactive } from '../interaction/Interactive';

export type IconButtonVariant = 'glass' | 'solid' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls need an accessible name. */
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Selected/toggled state (favorites, repeat, shuffle). */
  selected?: boolean;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  style?: StyleProp<ViewStyle>;
}

const dimensions: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 30, icon: iconSize.sm },
  md: { box: 36, icon: iconSize.md },
  lg: { box: 44, icon: iconSize.lg },
};

/** Circular icon-only control. Never render it without a `label`. */
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  selected = false,
  variant = 'ghost',
  size = 'md',
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const tokens = dimensions[size];
  const foreground = selected
    ? theme.colors.navActiveText
    : variant === 'ghost'
      ? theme.colors.navIdleText
      : theme.colors.text;

  const box: ViewStyle = {
    width: tokens.box,
    height: tokens.box,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Interactive
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      focusRadius={theme.radius.pill}
      style={[box, style]}>
      {({ hovered }) => {
        if (variant === 'glass') {
          return (
            <GlassSurface
              material="thin"
              cornerRadius={theme.radius.pill}
              elevated={false}
              style={[box, { alignItems: 'center' }]}>
              <Icon name={icon} size={tokens.icon} color={foreground} />
            </GlassSurface>
          );
        }

        return (
          <View
            style={[
              box,
              {
                backgroundColor: selected
                  ? theme.colors.navActiveBackground
                  : variant === 'solid'
                    ? theme.colors.surfaceMuted
                    : 'transparent',
              },
              hovered && !selected && { backgroundColor: theme.colors.hover },
            ]}>
            <Icon name={icon} size={tokens.icon} color={foreground} />
          </View>
        );
      }}
    </Interactive>
  );
}
