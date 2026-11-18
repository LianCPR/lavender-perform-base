import { iconSize, useTheme } from '@lavender/design-system';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SecondaryButton } from '../buttons/SecondaryButton';
import { Icon } from '../Icon';
import { Text } from '../Text';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Error state in the danger tint — the only red-adjacent surface in the app. */
export function ErrorState({
  title = 'Something went wrong',
  description = 'The library could not be loaded. Check your connection and try again.',
  retryLabel = 'Try again',
  onRetry,
  style,
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.xxxl,
          paddingHorizontal: theme.spacing.xl,
          maxWidth: 420,
          alignSelf: 'center',
        },
        style,
      ]}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.dangerSubtle,
        }}>
        <Icon name="alert-circle-outline" size={iconSize.xl} color={theme.colors.danger} />
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="subheading" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text variant="secondary" tone="secondary" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      </View>

      {onRetry ? (
        <SecondaryButton label={retryLabel} icon="refresh" size="sm" onPress={onRetry} />
      ) : null}
    </View>
  );
}
