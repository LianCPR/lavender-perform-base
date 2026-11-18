import { useTheme } from '@lavender/design-system';
import type { LibrarySort } from '@lavender/music-library';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { Sheet } from '../overlays/Sheet';
import { Text } from '../Text';

const SORT_OPTIONS: { key: LibrarySort; label: string; description: string }[] = [
  { key: 'recent', label: 'Recently added', description: 'Newest collections first' },
  { key: 'title', label: 'Alphabetical', description: 'From A to Z' },
  { key: 'artist', label: 'Artist', description: 'Grouped by artist name' },
];

export interface SortMenuProps {
  value: LibrarySort;
  onChange: (value: LibrarySort) => void;
}

/** Compact sort trigger with a glass option sheet. */
export function SortMenu({ value, onChange }: SortMenuProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((option) => option.key === value) ?? SORT_OPTIONS[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sort library, currently ${current?.label ?? 'recently added'}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          height: 40,
          paddingHorizontal: theme.spacing.md,
          borderRadius: theme.radius.pill,
          borderWidth: theme.border.hairline,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          opacity: pressed ? 0.8 : 1,
        })}>
        <Icon name="swap-vertical" size={14} color={theme.colors.textSecondary} />
        <Text variant="caption" tone="secondary">
          {current?.label ?? 'Sort'}
        </Text>
      </Pressable>

      {open ? (
        <Sheet
          visible
          onClose={() => setOpen(false)}
          title="Sort library"
          subtitle="Applies to albums, artists and playlists"
          maxWidth={420}>
        {SORT_OPTIONS.map((option) => {
          const selected = option.key === value;
          return (
            <Interactive
              key={option.key}
              onPress={() => {
                onChange(option.key);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              focusRadius={theme.radius.control}
              style={{ borderRadius: theme.radius.control }}>
              {({ hovered }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radius.control,
                    backgroundColor: selected
                      ? theme.colors.accentSubtle
                      : hovered
                        ? theme.colors.hover
                        : 'transparent',
                  }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text variant="headline">{option.label}</Text>
                    <Text variant="caption" tone="secondary">
                      {option.description}
                    </Text>
                  </View>
                  {selected ? (
                    <Icon name="checkmark" size={16} color={theme.colors.accent} />
                  ) : null}
                </View>
              )}
            </Interactive>
          );
          })}
        </Sheet>
      ) : null}
    </>
  );
}
