import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  describeProviderError,
  getActiveProvider,
  type MusicProvider,
} from '@lavender/music-providers';
import type { ProviderPlaylist, Track } from '@lavender/shared';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { OnlineDetailSheet, type OnlineTarget } from './OnlineDetailSheet';
import { useProviderHome } from './useProviderHome';

const CARD_WIDTH = { compact: 148, medium: 164, expanded: 180, wide: 188 };

/**
 * Provider discovery for Home. Renders only sections the provider advertises,
 * and disappears quietly if online music is disabled or nothing loads.
 */
export function OnlineTrendingSection() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const provider = useMemo<MusicProvider | null>(() => getActiveProvider(), []);
  const { sections, loading, error, retry } = useProviderHome(provider);
  const library = useLibrary();
  const player = usePlayer();
  const [target, setTarget] = useState<OnlineTarget | null>(null);

  if (!provider?.capabilities.home) return null;

  if (error && sections.length === 0) {
    const described = describeProviderError(error);
    return (
      <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
        <Text variant="headline">{provider.name} is unavailable</Text>
        <Text variant="secondary" tone="secondary">
          {described.message} Trending online music will return when the provider responds.
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {described.retryable ? (
            <SecondaryButton label="Try again" icon="refresh" size="sm" onPress={retry} />
          ) : null}
        </View>
      </Surface>
    );
  }

  if (loading && sections.length === 0) {
    return (
      <View style={{ gap: theme.spacing.sm }}>
        <SectionHeader title={`Trending on ${provider.name}`} subtitle="Loading open catalog picks…" />
      </View>
    );
  }

  return (
    <View style={{ gap: theme.spacing.xl }}>
      {sections.map((section) => (
        <View key={section.id} style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title={section.title}
            subtitle={section.subtitle ?? `From ${provider.name}`}
          />

          {section.tracks.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
              {section.tracks.map((track: Track) => (
                <ArtworkCard
                  key={track.id}
                  title={track.title}
                  subtitle={track.artistName}
                  palette={track.palette}
                  artworkUri={track.artworkUri}
                  width={CARD_WIDTH[breakpoint]}
                  accessibilityLabel={`Play ${track.title} by ${track.artistName} on ${provider.name}`}
                  onPress={() => {
                    library.cacheOnlineTracks(section.tracks);
                    library.recordPlayed(track.id);
                    player.play(track, section.tracks);
                  }}
                />
              ))}
            </ScrollView>
          ) : null}

          {section.playlists.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
              {section.playlists.map((playlist: ProviderPlaylist) => (
                <ArtworkCard
                  key={playlist.id}
                  title={playlist.name}
                  subtitle={`${playlist.creatorName} · ${playlist.trackCount} tracks`}
                  palette={playlist.palette}
                  artworkUri={playlist.artworkUri}
                  width={CARD_WIDTH[breakpoint]}
                  onPress={() => setTarget({ kind: 'playlist', item: playlist })}
                />
              ))}
            </ScrollView>
          ) : null}
        </View>
      ))}

      <Text variant="caption" tone="tertiary">
        Online sections are provided by {provider.name}. Each stream is authorized by the provider;
        availability and licensing are controlled there, not by Lavender.
      </Text>

      <OnlineDetailSheet target={target} provider={provider} onClose={() => setTarget(null)} />
    </View>
  );
}
