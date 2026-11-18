import { useTheme } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useBreakpoint } from './hooks/useBreakpoint';
import { Icon } from './Icon';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  style,
}: SectionHeaderProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';

  return (
    <View style={[{ gap: 4 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <LinearGradient
            colors={theme.colors.accentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ width: 22, height: 3, borderRadius: 2, marginBottom: 4 }}
          />
          <Text variant={isCompact ? 'subheading' : 'sectionHeading'} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 2,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 2,
            })}>
            <Text variant="caption" tone="accent" style={{ fontWeight: '600' }}>
              {actionLabel}
            </Text>
            <Icon name="chevron-forward" size={13} color={theme.colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
