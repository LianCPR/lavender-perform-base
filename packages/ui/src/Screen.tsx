import { useTheme } from '@lavender/design-system';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useBreakpoint } from './hooks/useBreakpoint';
import { Text } from './Text';

export interface ScreenProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Buttons rendered under the title block. */
  actions?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Shared screen frame: responsive gutters, a centered content column and enough
 * bottom padding to clear the floating tab bar and mini player.
 */
export function Screen({ eyebrow, title, subtitle, actions, children, contentStyle }: ScreenProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';
  const gutter = theme.layout.gutter[breakpoint];

  return (
    <ScrollView
      style={styles.fill}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        {
          width: '100%',
          alignSelf: 'center',
          maxWidth: theme.layout.contentMaxWidth + gutter * 2,
          paddingHorizontal: gutter,
          paddingTop: isCompact ? 4 : 28,
          paddingBottom: isCompact ? 210 : 140,
          gap: isCompact ? 24 : 32,
        },
        contentStyle,
      ]}>
      <View style={{ gap: 6 }}>
        {eyebrow ? (
          <Text variant="label" tone="accent">
            {eyebrow}
          </Text>
        ) : null}
        <Text variant={isCompact ? 'largeHeading' : 'display'}>{title}</Text>
        {subtitle ? (
          <Text variant="callout" tone="secondary" style={{ maxWidth: 560 }}>
            {subtitle}
          </Text>
        ) : null}
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
});
