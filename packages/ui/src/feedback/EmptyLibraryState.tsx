import { useTheme } from '@lavender/design-system';
import { View } from 'react-native';

import { PrimaryButton } from '../buttons/PrimaryButton';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';

export interface EmptyLibraryStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty library panel. Sits on a plain surface (not glass) because it is page
 * content rather than floating chrome.
 */
export function EmptyLibraryState({
  icon = 'albums-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyLibraryStateProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xxxl,
        paddingHorizontal: theme.spacing.xl,
        borderRadius: theme.radius.card,
        borderWidth: theme.border.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.surfaceMuted,
        }}>
        <Icon name={icon} size={22} color={theme.colors.textTertiary} />
      </View>
      <View style={{ alignItems: 'center', gap: 4, maxWidth: 360 }}>
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
        <PrimaryButton label={actionLabel} icon="add" size="sm" onPress={onAction} />
      ) : null}
    </View>
  );
}
