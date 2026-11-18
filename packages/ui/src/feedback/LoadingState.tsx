import { useTheme } from '@lavender/design-system';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '../Text';

export interface LoadingStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Centered spinner. Uses the accent color, never a gray loader. */
export function LoadingState({ label = 'Loading', style }: LoadingStateProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.xxl,
        },
        style,
      ]}>
      <ActivityIndicator color={theme.colors.accent} />
      <Text variant="secondary" tone="secondary">
        {label}
      </Text>
    </View>
  );
}
