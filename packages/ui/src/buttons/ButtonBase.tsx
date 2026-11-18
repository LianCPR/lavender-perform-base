import {
  elevationStyle,
  iconSize,
  useTheme,
  type TypographyVariant,
} from '@lavender/design-system';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { GlassSurface } from '../GlassSurface';
import { Icon, type IconName } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Text } from '../Text';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'tinted' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonBaseProps {
  label?: string;
  icon?: IconName;
  trailingIcon?: IconName;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const sizeTokens: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; gap: number; icon: number; text: TypographyVariant }
> = {
  sm: { height: 34, paddingHorizontal: 14, gap: 6, icon: iconSize.sm, text: 'caption' },
  md: { height: 42, paddingHorizontal: 18, gap: 8, icon: iconSize.md, text: 'callout' },
  lg: { height: 50, paddingHorizontal: 22, gap: 10, icon: iconSize.lg, text: 'headline' },
};

/**
 * The only button implementation.
 *
 * Variants map to intent, not visuals: `primary` fills with the high-contrast
 * accent, `secondary` is a neutral raised surface, `glass` is Liquid Glass,
 * `tinted` uses the accent wash and `ghost` is text-only.
 */
export function ButtonBase({
  label,
  icon,
  trailingIcon,
  variant = 'secondary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: ButtonBaseProps) {
  const theme = useTheme();
  const tokens = sizeTokens[size];
  const isDisabled = disabled || loading;

  const foreground =
    variant === 'primary'
      ? theme.colors.onAccent
      : variant === 'tinted'
        ? theme.colors.accent
        : variant === 'ghost'
          ? theme.colors.textSecondary
          : theme.colors.text;

  const content = (
    <View style={[styles.content, { gap: tokens.gap }]}>
      {loading ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Icon name={icon} size={tokens.icon} color={foreground} />
      ) : null}
      {label ? (
        <Text variant={tokens.text} numberOfLines={1} style={{ color: foreground }}>
          {label}
        </Text>
      ) : null}
      {trailingIcon && !loading ? (
        <Icon name={trailingIcon} size={tokens.icon} color={foreground} />
      ) : null}
    </View>
  );

  const frame: ViewStyle = {
    height: tokens.height,
    paddingHorizontal: tokens.paddingHorizontal,
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
  };

  return (
    <Interactive
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      focusRadius={theme.radius.pill}
      style={[{ borderRadius: theme.radius.pill }, fullWidth && styles.fullWidth, style]}>
      {({ hovered }) => {
        if (variant === 'glass') {
          return (
            <GlassSurface material="thin" cornerRadius={theme.radius.pill} style={frame}>
              {hovered ? (
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.hover }]}
                />
              ) : null}
              {content}
            </GlassSurface>
          );
        }

        const background =
          variant === 'primary'
            ? theme.colors.accentStrong
            : variant === 'secondary'
              ? theme.colors.surface
              : variant === 'tinted'
                ? theme.colors.accentSubtle
                : 'transparent';

        return (
          <View
            style={[
              frame,
              styles.frame,
              { backgroundColor: background },
              variant === 'secondary' && {
                borderWidth: theme.border.hairline,
                borderColor: theme.colors.border,
              },
              variant !== 'ghost' && elevationStyle(theme.elevation.low),
              hovered && { opacity: 0.92 },
            ]}>
            {content}
          </View>
        );
      }}
    </Interactive>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
