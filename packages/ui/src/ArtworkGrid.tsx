import { useTheme } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ArtworkCard } from './ArtworkCard';

export interface ArtworkGridItem {
  id: string;
  title: string;
  subtitle?: string;
  palette: ArtworkPalette;
  monogram?: string;
}

export interface ArtworkGridProps {
  items: ArtworkGridItem[];
  columns: number;
  onSelect?: (item: ArtworkGridItem) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Percentage-width grid: columns come from the active breakpoint, so the same
 * markup works from a 375pt phone to a wide desktop window.
 */
export function ArtworkGrid({ items, columns, onSelect, style }: ArtworkGridProps) {
  const theme = useTheme();
  const gap = theme.spacing.lg;

  return (
    <View
      style={[
        { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gap / 2 },
        style,
      ]}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            width: `${100 / columns}%`,
            paddingHorizontal: gap / 2,
            paddingBottom: gap,
          }}>
          <ArtworkCard
            title={item.title}
            subtitle={item.subtitle}
            palette={item.palette}
            monogram={item.monogram}
            onPress={onSelect ? () => onSelect(item) : undefined}
          />
        </View>
      ))}
    </View>
  );
}
