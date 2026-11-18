import { useTheme } from '@lavender/design-system';
import { useState } from 'react';
import { View } from 'react-native';

import { Chip } from '../../Chip';
import { EmptyState } from '../../feedback/EmptyState';
import { ErrorState } from '../../feedback/ErrorState';
import { LoadingState } from '../../feedback/LoadingState';
import { Skeleton } from '../../feedback/Skeleton';
import { Surface } from '../../Surface';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

type FeedbackPhase = 'loading' | 'empty' | 'error';

/** Feedback states plus the skeleton language. */
export function FeedbackSection() {
  const theme = useTheme();
  const [phase, setPhase] = useState<FeedbackPhase>('loading');

  return (
    <ShowcaseSection
      title="Feedback"
      description="States are calm and centered: one icon disc, one sentence, at most one action. Skeletons pulse gently and hold still under reduced motion.">
      <View style={{ gap: theme.spacing.xl }}>
        <View>
          <SpecimenLabel>State preview</SpecimenLabel>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
            {(['loading', 'empty', 'error'] as const).map((value) => (
              <Chip
                key={value}
                label={value}
                selected={phase === value}
                onPress={() => setPhase(value)}
              />
            ))}
          </View>
          <Surface
            tone="muted"
            bordered
            padding="lg"
            style={{ minHeight: 210, justifyContent: 'center' }}>
            {phase === 'loading' ? <LoadingState label="Loading your library" /> : null}
            {phase === 'empty' ? (
              <EmptyState
                title="No playlists yet"
                description="Playlists you create will appear here, ready for the next quiet evening."
                actionLabel="New playlist"
                onAction={() => setPhase('loading')}
              />
            ) : null}
            {phase === 'error' ? (
              <ErrorState onRetry={() => setPhase('loading')} />
            ) : null}
          </Surface>
        </View>

        <View>
          <SpecimenLabel>Skeletons</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            <View style={{ width: 168, gap: theme.spacing.sm }}>
              <Skeleton height={168} cornerRadius={theme.radius.artwork} />
              <Skeleton height={14} width="80%" />
              <Skeleton height={12} width="55%" />
            </View>

            <Surface tone="muted" bordered padding="sm" style={{ flex: 1, minWidth: 240, gap: theme.spacing.sm }}>
              {[0, 1, 2].map((row) => (
                <View key={row} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <Skeleton width={40} height={40} cornerRadius={8} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton height={12} width="70%" />
                    <Skeleton height={10} width="45%" />
                  </View>
                  <Skeleton width={32} height={10} />
                </View>
              ))}
            </Surface>
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}
