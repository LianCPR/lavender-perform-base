import { useTheme } from '@lavender/design-system';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { SectionHeader } from '../SectionHeader';

export interface BrowseSectionProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Section rhythm for discovery rails: header plus loosely spaced content. */
export function BrowseSection({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  children,
  style,
}: BrowseSectionProps) {
  const theme = useTheme();

  return (
    <View style={[{ gap: theme.spacing.md }, style]}>
      <SectionHeader
        title={title}
        subtitle={subtitle}
        actionLabel={actionLabel}
        onActionPress={onActionPress}
      />
      {children}
    </View>
  );
}
