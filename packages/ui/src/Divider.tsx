import { useTheme, type SpacingKey } from '@lavender/design-system';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from './Text';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Horizontal inset in spacing units. */
  inset?: SpacingKey;
  /** Optional centered caption between two rules. */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** A 1px rule. Dividers are the only separators inside panels. */
export function Divider({ orientation = 'horizontal', inset = 'none', label, style }: DividerProps) {
  const theme = useTheme();
  const insetValue = theme.spacing[inset];
  const line = { backgroundColor: theme.colors.divider, flex: 1, height: 1 };

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          { width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.divider },
          style,
        ]}
      />
    );
  }

  if (!label) {
    return (
      <View
        style={[
          { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: insetValue },
          style,
        ]}
      />
    );
  }

  return (
    <View style={[styles.row, { paddingHorizontal: insetValue, gap: theme.spacing.md }, style]}>
      <View style={line} />
      <Text variant="label" tone="tertiary">
        {label}
      </Text>
      <View style={line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
