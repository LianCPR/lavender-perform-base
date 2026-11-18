import { useTheme, useThemeMode, type ThemeMode } from '@lavender/design-system';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { GlassSurface } from './GlassSurface';
import { useBreakpoint } from './hooks/useBreakpoint';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ThemeControlProps {
  /** Segmented three-way control, or a single cycling icon button. */
  variant?: 'segmented' | 'icon';
  style?: StyleProp<ViewStyle>;
}

const OPTIONS: { mode: ThemeMode; label: string; icon: IconName }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'contrast-outline' },
];

const CYCLE: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Theme override UI.
 *
 * Phase 01 exposes the switch directly so the theme system is verifiable; the
 * same `setMode` call will be driven by a settings screen in a later phase.
 */
export function ThemeControl({ variant = 'segmented', style }: ThemeControlProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const minimalDesktop = breakpoint === 'expanded' || breakpoint === 'wide';
  const { mode, setMode } = useThemeMode();

  if (variant === 'icon') {
    const current = OPTIONS.find((option) => option.mode === mode) ?? OPTIONS[2];
    const nextMode = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length] ?? 'system';

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Theme: ${current?.label ?? 'System'}. Switch theme`}
        onPress={() => setMode(nextMode)}
        style={({ pressed }) => [
          {
            width: 36,
            height: 36,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceMuted,
            opacity: pressed ? 0.7 : 1,
          },
          style,
        ]}>
        <Icon name={current?.icon ?? 'contrast-outline'} size={18} color={theme.colors.textSecondary} />
      </Pressable>
    );
  }

  const options = OPTIONS.map((option) => {
    const active = option.mode === mode;
    return (
      <Pressable
        key={option.mode}
        accessibilityRole="button"
        accessibilityLabel={`${option.label} theme`}
        accessibilityState={{ selected: active }}
        onPress={() => setMode(option.mode)}
        style={({ pressed }) => ({
          width: 32,
          height: 26,
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? theme.colors.accentSubtle : 'transparent',
          opacity: pressed ? 0.65 : 1,
        })}>
        <Icon
          name={option.icon}
          size={16}
          color={active ? theme.colors.accentText : theme.colors.textSecondary}
        />
        <View style={{ position: 'absolute', opacity: 0 }}>
          <Text variant="caption">{option.label}</Text>
        </View>
      </Pressable>
    );
  });

  const frame = {
    flexDirection: 'row' as const,
    padding: 3,
    gap: 2,
    alignSelf: 'flex-start' as const,
  };

  if (minimalDesktop) {
    return (
      <View
        style={[
          frame,
          {
            borderRadius: theme.radius.pill,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
          style,
        ]}>
        {options}
      </View>
    );
  }

  return (
    <GlassSurface
      material="thin"
      cornerRadius={theme.radius.pill}
      elevated={false}
      style={[frame, style]}>
      {options}
    </GlassSurface>
  );
}
