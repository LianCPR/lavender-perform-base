import { useTheme } from '@lavender/design-system';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Compact, pill-shaped filter control. Selection uses the accent fill. */
export function Chip({ label, selected = false, icon, onPress, style }: ChipProps) {
  const theme = useTheme();
  const foreground = selected ? theme.colors.accent : theme.colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 32,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          backgroundColor: selected ? theme.colors.accentSubtle : theme.colors.surfaceMuted,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {icon ? <Icon name={icon} size={13} color={foreground} /> : null}
      <View>
        <Text variant="caption" style={{ color: foreground, fontWeight: selected ? '700' : '500' }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
