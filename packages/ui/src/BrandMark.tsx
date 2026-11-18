import { useTheme } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from './Icon';

export interface BrandMarkProps {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** The one place the brand gradient is allowed to carry a logo. */
export function BrandMark({ size = 28, style }: BrandMarkProps) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={theme.colors.accentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.32 },
        style,
      ]}>
      <View style={styles.inner}>
        <Icon name="musical-notes" size={size * 0.54} color="#FFFFFF" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
