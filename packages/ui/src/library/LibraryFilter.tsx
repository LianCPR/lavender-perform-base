import { useTheme } from '@lavender/design-system';
import { ScrollView } from 'react-native';

import { Chip } from '../Chip';

export type LibraryFilterKey =
  | 'all'
  | 'recent'
  | 'songs'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'favorites'
  | 'online';

export const LIBRARY_FILTERS: { key: LibraryFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'recent', label: 'Recently played' },
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'online', label: 'Online' },
];

export interface LibraryFilterProps {
  value: LibraryFilterKey;
  onChange: (value: LibraryFilterKey) => void;
}

/** Horizontally scrollable category chips; the active category is persisted. */
export function LibraryFilter({ value, onChange }: LibraryFilterProps) {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingRight: theme.spacing.sm }}>
      {LIBRARY_FILTERS.map((item) => (
        <Chip
          key={item.key}
          label={item.label}
          selected={value === item.key}
          onPress={() => onChange(item.key)}
        />
      ))}
    </ScrollView>
  );
}
