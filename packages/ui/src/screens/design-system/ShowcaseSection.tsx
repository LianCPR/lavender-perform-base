import { useTheme } from '@lavender/design-system';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '../../Text';

export interface ShowcaseSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/** One labeled block in the showcase. */
export function ShowcaseSection({ title, description, children }: ShowcaseSectionProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: 2 }}>
        <Text variant="sectionHeading">{title}</Text>
        {description ? (
          <Text variant="secondary" tone="secondary" style={{ maxWidth: 620 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Small caption used above rows of specimens. */
export function SpecimenLabel({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <Text variant="label" tone="tertiary" style={{ marginBottom: theme.spacing.sm }}>
      {children}
    </Text>
  );
}
