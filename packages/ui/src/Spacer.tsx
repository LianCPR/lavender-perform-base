import { useTheme, type SpacingKey } from '@lavender/design-system';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export interface SpacerProps {
  /** Spacing token (or raw px) for fixed spacing. */
  size?: SpacingKey | number;
  /** Spacing along the row instead of the column. */
  horizontal?: boolean;
  /** Grow to fill available space (like `flex: 1`). */
  flex?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Explicit spacing instead of stray margins. */
export function Spacer({ size = 'md', horizontal = false, flex = false, style }: SpacerProps) {
  const theme = useTheme();
  const value = typeof size === 'number' ? size : theme.spacing[size];

  if (flex) {
    return <View style={[{ flex: 1 }, style]} />;
  }

  return (
    <View
      aria-hidden
      style={[horizontal ? { width: value } : { height: value }, style]}
    />
  );
}
