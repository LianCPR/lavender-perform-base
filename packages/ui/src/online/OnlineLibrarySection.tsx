import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import type { MusicProvider } from '@lavender/music-providers';
import type { ProviderAlbum, ProviderArtist, ProviderPlaylist, Track } from '@lavender/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { EmptyLibraryState } from '../feedback/EmptyLibraryState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { TrackRow } from '../music/TrackRow';
import { OnlineDetailSheet, type OnlineTarget } from './OnlineDetailSheet';

const CARD_WIDTH = { compact: 148, medium: 164, expanded: 180, wide: 188 };

/**
 * Saved provider resources are local-first bookmarks: the provider owns the
 * catalog, Lavender remembers what the listener kept. Removing one never
 * deletes anything at the provider.
 */
export function OnlineLibrarySection({ provider }: { provider: MusicProvider }) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const library = useLibrary();
  const player = usePlayer();
  const [target, setTarget] = useState<OnlineTarget | null>(null);

  const tracks = library.savedOnlineTracks;
  const albums = library.savedOnlineAlbums;
  const artists = library.followedOnlineArtists;
  const playlists = library.savedOnlinePlaylists;
  const total = tracks.length + albums.length + artists.length + playlists.length;

  if (total === 0) {
    return (
      <EmptyLibraryState
        icon="globe-outline"
        title={`Nothing saved from ${provider.name} yet`}
        description={`Search online and use the bookmark on a song, album, artist or playlist. Saved online items appear here; the audio stays with ${provider.name}.`}
      />
    );
  }

  const playFrom = (track: Track) => {
    library.cacheOnlineTracks(tracks);
    library.recordPlayed(track.id);
    player.play(track, tracks);
  };

  return (
    <View style={{ gap: theme.spacing.xl }}>
      <Text variant="caption" tone="tertiary">
        Saved from {provider.name}. Online tracks need a connection and are never available offline
        unless the provider explicitly allows it.
      </Text>

      {tracks.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Online songs" subtitle={`${tracks.length} saved`} />
          <Surface bordered padding="sm">
            {tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                divider={index > 0}
                showAlbum
                isCurrent={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                isFavorite={library.isFavorite(track.id)}
                isSaved
                onPress={() => playFrom(track)}
                onToggleFavorite={() => library.toggleFavorite(track.id)}
                onToggleSave={() => library.toggleOnlineTrackSaved(track)}
              />
            ))}
          </Surface>
        </View>
      ) : null}

      {albums.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Online albums" subtitle={`${albums.length} saved`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg }}>
            {albums.map((album: ProviderAlbum) => (
              <ArtworkCard
                key={album.id}
                title={album.title}
                subtitle={album.artistName}
                palette={album.palette}
                artworkUri={album.artworkUri}
                width={CARD_WIDTH[breakpoint]}
                onPress={() => setTarget({ kind: 'album', item: album })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {artists.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Following" subtitle={`${artists.length} artist${artists.length === 1 ? '' : 's'}`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg }}>
            {artists.map((artist: ProviderArtist) => (
              <ArtworkCard
                key={artist.id}
                title={artist.name}
                subtitle={artist.handle ? `@${artist.handle}` : provider.name}
                palette={artist.palette}
                artworkUri={artist.artworkUri}
                width={CARD_WIDTH[breakpoint]}
                onPress={() => setTarget({ kind: 'artist', item: artist })}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {playlists.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Online playlists" subtitle={`${playlists.length} saved`} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg }}>
            {playlists.map((playlist: ProviderPlaylist) => (
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
        </View>
      ) : null}

      <OnlineDetailSheet target={target} provider={provider} onClose={() => setTarget(null)} />
    </View>
  );
}
