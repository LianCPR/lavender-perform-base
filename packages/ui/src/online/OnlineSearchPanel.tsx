import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  buildLocalDuplicateIndex,
  describeProviderError,
  partitionOnlineDuplicates,
  type MusicProvider,
} from '@lavender/music-providers';
import type { ProviderAlbum, ProviderArtist, ProviderPlaylist, Track } from '@lavender/shared';
import { useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { EmptyState } from '../feedback/EmptyState';
import { ErrorState } from '../feedback/ErrorState';
import { LoadingState } from '../feedback/LoadingState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { TrackRow } from '../music/TrackRow';
import { OnlineDetailSheet, type OnlineTarget } from './OnlineDetailSheet';
import { useOnlineSearch } from './useOnlineSearch';

function openExternal(url: string | undefined) {
  if (!url) return;
  void Linking.openURL(url).catch(() => undefined);
}

const cardWidth = {
  compact: 148,
  medium: 160,
  expanded: 176,
  wide: 184,
};

/**
 * Online results are visually separated from the local library and never
 * pretend to be local files: every row/section is labelled with its provider.
 */
export function OnlineSearchPanel({
  query,
  provider,
}: {
  query: string;
  provider: MusicProvider;
}) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const library = useLibrary();
  const player = usePlayer();
  const [target, setTarget] = useState<OnlineTarget | null>(null);
  const search = useOnlineSearch(provider, query, { enabled: query.trim().length >= 2 });
  const width = cardWidth[breakpoint];

  const localOnlyTracks = useMemo(
    () => library.allTracks.filter((track) => !track.provider),
    [library.allTracks],
  );

  const partitioned = useMemo(() => {
    const index = buildLocalDuplicateIndex(localOnlyTracks);
    return partitionOnlineDuplicates(search.results.tracks, index);
  }, [localOnlyTracks, search.results.tracks]);

  if (query.trim().length === 1) {
    return (
      <Text variant="callout" tone="secondary">
        Keep typing — online search starts after two characters.
      </Text>
    );
  }

  if (search.loading && search.results.tracks.length === 0) {
    return <LoadingState label={`Searching ${provider.name}…`} />;
  }

  if (search.error && search.results.tracks.length === 0) {
    const described = describeProviderError(search.error);
    return (
      <ErrorState
        title={described.title}
        description={described.message}
        onRetry={described.retryable ? search.retry : undefined}
      />
    );
  }

  const { albums, artists, playlists } = search.results;
  const hasAnything =
    partitioned.unique.length + albums.length + artists.length + playlists.length > 0;

  if (!hasAnything && !search.loading) {
    return (
      <View style={{ gap: theme.spacing.md }}>
        <EmptyState
          icon="globe-outline"
          title={`No online matches for “${query.trim()}”`}
          description={`${provider.name} did not return tracks, albums, artists or playlists for that search. Try another spelling or a broader term.`}
        />
        {partitioned.duplicates.length > 0 ? (
          <Text variant="caption" tone="tertiary" style={{ textAlign: 'center' }}>
            {partitioned.duplicates.length} matching result
            {partitioned.duplicates.length === 1 ? ' is' : 's are'} already in your library.
          </Text>
        ) : null}
      </View>
    );
  }

  const favouriteOnline = (track: Track) => {
    if (!library.isSavedOnlineTrack(track.id)) library.toggleOnlineTrackSaved(track);
    library.toggleFavorite(track.id);
  };

  const playFrom = (track: Track) => {
    library.cacheOnlineTracks(partitioned.unique);
    library.recordPlayed(track.id);
    player.play(track, partitioned.unique);
  };

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <SectionHeader
        title={`Online · ${provider.name}`}
        subtitle="Authorized provider results, separate from your local library"
      />

      {search.partialFailures > 0 ? (
        <Text variant="caption" tone="tertiary">
          Some {provider.name} categories are temporarily unavailable. Showing what loaded.
        </Text>
      ) : null}

      {partitioned.duplicates.length > 0 ? (
        <Text variant="caption" tone="tertiary">
          {partitioned.duplicates.length} online track
          {partitioned.duplicates.length === 1 ? '' : 's'} also exist in your local library and{' '}
          {partitioned.duplicates.length === 1 ? 'is' : 'are'} hidden here to avoid duplicates. Your
          local copy remains the one that plays offline.
        </Text>
      ) : null}

      {partitioned.unique.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Songs" subtitle={`${partitioned.unique.length} from ${provider.name}`} />
          <Surface bordered padding="sm">
            {partitioned.unique.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                divider={index > 0}
                showAlbum
                isCurrent={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                isFavorite={library.isFavorite(track.id)}
                isSaved={library.isSavedOnlineTrack(track.id)}
                onPress={() => playFrom(track)}
                onToggleFavorite={() => favouriteOnline(track)}
                onToggleSave={() => library.toggleOnlineTrackSaved(track)}
              />
            ))}
          </Surface>
        </View>
      ) : null}

      {albums.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Albums" subtitle={`${albums.length} from ${provider.name}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            {albums.map((album: ProviderAlbum) => (
              <ArtworkCard
                key={album.id}
                title={album.title}
                subtitle={album.artistName}
                palette={album.palette}
                artworkUri={album.artworkUri}
                width={width}
                onPress={() => setTarget({ kind: 'album', item: album })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {artists.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Artists" subtitle={`${artists.length} from ${provider.name}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            {artists.map((artist: ProviderArtist) => (
              <ArtworkCard
                key={artist.id}
                title={artist.name}
                subtitle={artist.handle ? `@${artist.handle}` : provider.name}
                palette={artist.palette}
                artworkUri={artist.artworkUri}
                width={width}
                onPress={() => setTarget({ kind: 'artist', item: artist })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {playlists.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Playlists"
            subtitle={`${playlists.length} from ${provider.name}`}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            {playlists.map((playlist: ProviderPlaylist) => (
              <ArtworkCard
                key={playlist.id}
                title={playlist.name}
                subtitle={`${playlist.creatorName} · ${playlist.trackCount} tracks`}
                palette={playlist.palette}
                artworkUri={playlist.artworkUri}
                width={width}
                onPress={() => setTarget({ kind: 'playlist', item: playlist })}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
          flexWrap: 'wrap',
        }}>
        {search.hasMore ? (
          <SecondaryButton
            label={search.loadingMore ? 'Loading…' : 'Load more'}
            icon="chevron-down"
            size="sm"
            loading={search.loadingMore}
            onPress={search.loadMore}
          />
        ) : (
          <View />
        )}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${provider.name} in a new tab`}
          onPress={() => openExternal(provider.capabilities.attribution.url)}>
          <Text variant="caption" tone="tertiary">
            Powered by {provider.name} · Open catalog
          </Text>
        </Pressable>
      </View>

      <OnlineDetailSheet target={target} provider={provider} onClose={() => setTarget(null)} />
    </View>
  );
}
