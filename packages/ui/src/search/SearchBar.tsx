import { fontFamily, useTheme } from '@lavender/design-system';
import { useState } from 'react';
import { Platform, Pressable, TextInput, View, type TextStyle } from 'react-native';

import { GlassSurface } from '../GlassSurface';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Icon } from '../Icon';

const webInputReset = Platform.select<TextStyle>({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
});

export interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  accessibilityLabel?: string;
  autoFocus?: boolean;
  /** Slightly shorter field used inside library toolbars. */
  compact?: boolean;
}

/** Prominent glass search field with an explicit clear control. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Artists, songs, albums, playlists',
  onSubmit,
  accessibilityLabel = 'Search',
  autoFocus = false,
  compact = false,
}: SearchBarProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const minimalDesktop = breakpoint === 'expanded' || breakpoint === 'wide';
  const [focused, setFocused] = useState(false);

  const frame = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
    height: compact ? 40 : 48,
    paddingHorizontal: theme.spacing.lg,
    flex: 1,
    borderWidth: minimalDesktop ? 0 : theme.border.hairline,
    borderColor: focused ? theme.colors.accent : theme.colors.borderStrong,
    shadowColor: theme.colors.accent,
    shadowOpacity: focused ? 0.28 : 0,
    shadowRadius: focused ? 18 : 0,
    shadowOffset: { width: 0, height: 6 },
  };

  const field = (
    <>
      <Icon name="search" size={compact ? 16 : 18} color={theme.colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        accessibilityLabel={accessibilityLabel}
        style={[
          {
            flex: 1,
            color: theme.colors.text,
            fontFamily,
            fontSize: compact
              ? theme.typography.callout.fontSize
              : theme.typography.body.fontSize,
            paddingVertical: theme.spacing.sm,
          },
          webInputReset,
        ]}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={10}
          onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={18} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </>
  );

  if (minimalDesktop) {
    return (
      <View
        style={[
          frame,
          {
            borderRadius: theme.radius.control,
            backgroundColor: theme.colors.surface,
            borderWidth: theme.border.hairline,
            borderColor: focused ? theme.colors.accent : theme.colors.border,
          },
        ]}>
        {field}
      </View>
    );
  }

  return (
    <GlassSurface
      material={compact ? 'thin' : 'regular'}
      cornerRadius={theme.radius.pill}
      tintColor={theme.colors.accent}
      style={frame}>
      {field}
    </GlassSurface>
  );
}
