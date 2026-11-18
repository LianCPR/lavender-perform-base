import {
  elevationStyle,
  useTheme,
  type ElevationKey,
  type SpacingKey,
} from '@lavender/design-system';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

export type SurfaceTone = 'base' | 'muted' | 'strong' | 'elevated';

export interface SurfaceProps extends ViewProps {
  tone?: SurfaceTone;
  cornerRadius?: number;
  padding?: SpacingKey | number;
  elevation?: ElevationKey;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The neutral counterpart to GlassSurface: solid token backgrounds with an
 * optional hairline border and one elevation level. Use glass for chrome and
 * Surface for content cards, sheets and insets.
 */
export function Surface({
  tone = 'base',
  cornerRadius,
  padding = 'none',
  elevation = 'none',
  bordered = false,
  style,
  children,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();
  const background = {
    base: theme.colors.surface,
    muted: theme.colors.surfaceMuted,
    strong: theme.colors.surfaceStrong,
    elevated: theme.colors.backgroundElevated,
  }[tone];
  const inset = typeof padding === 'number' ? padding : theme.spacing[padding];

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: background,
          borderRadius: cornerRadius ?? theme.radius.card,
          padding: inset,
        },
        bordered && {
          borderWidth: theme.border.hairline,
          borderColor: theme.colors.border,
        },
        elevation !== 'none' && elevationStyle(theme.elevation[elevation]),
        style,
      ]}>
      {children}
    </View>
  );
}
