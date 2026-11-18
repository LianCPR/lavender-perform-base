import { iconSize, useTheme } from '@lavender/design-system';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SecondaryButton } from '../buttons/SecondaryButton';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Calm empty state: quiet icon disc, one line of guidance, one action. */
export function EmptyState({
  icon = 'disc-outline',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View
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
          backgroundColor: theme.colors.surfaceMuted,
          borderWidth: theme.border.hairline,
          borderColor: theme.colors.border,
        }}>
        <Icon name={icon} size={iconSize.xl} color={theme.colors.textTertiary} />
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text variant="subheading" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        {description ? (
          <Text variant="secondary" tone="secondary" style={{ textAlign: 'center' }}>
            {description}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <SecondaryButton label={actionLabel} onPress={onAction} size="sm" icon="add" />
      ) : null}
    </View>
  );
}
