import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import type { Album, Collection, Playlist, Track } from '@lavender/shared';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { ArtworkGrid, type ArtworkGridItem } from '../ArtworkGrid';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { gridColumns, useBreakpoint } from '../hooks/useBreakpoint';
import { OnlineTrendingSection } from '../online/OnlineTrendingSection';
import { AlbumCard } from '../music/AlbumCard';
import { FeaturedAlbumHero } from '../music/FeaturedAlbumHero';
import { PlaylistCard } from '../music/PlaylistCard';
import { TrackRow } from '../music/TrackRow';
import { usePersonalization } from '../personalization/PersonalizationProvider';
import { PersonalizedSections } from '../personalization/PersonalizedSections';
import { Screen } from '../Screen';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function toGridItem(album: Album): ArtworkGridItem {
  return {
    id: album.id,
    title: album.title,
    subtitle: album.artistName,
    palette: album.palette,
  };
}

/** Home uses the shared local catalog and the app-wide playback engine. */
export function HomeScreen() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';
  const columns = gridColumns(breakpoint);
  const quickAccessColumns = Math.min(columns, 4);
  const library = useLibrary();
  const { catalog, albumById, tracksForAlbum, tracksForPlaylist } = library;
  const player = usePlayer();
  const router = useRouter();
  const personal = usePersonalization();
  // With personalization off, Home must not display history-derived content.
  const recentTracks = personal.enabled ? personal.recentTracks : [];

  const featured = albumById(catalog.home.featuredAlbumId);
  const madeForYou = catalog.home.madeForYouMixIds
    .map((id) => catalog.mixes.find((mix) => mix.id === id))
    .filter((mix): mix is Collection => Boolean(mix));
  const suggestedPlaylists = catalog.home.suggestedPlaylistIds
    .map((id) => catalog.playlists.find((playlist) => playlist.id === id))
    .filter((playlist): playlist is Playlist => Boolean(playlist));
  const recommendedAlbums = catalog.home.recommendedAlbumIds
    .map(albumById)
    .filter((album): album is Album => Boolean(album));
  const quickAccess = catalog.home.quickAccessPlaylistIds
    .map((id) => catalog.playlists.find((playlist) => playlist.id === id))
    .filter((playlist): playlist is Playlist => Boolean(playlist));
  const newReleases = catalog.home.newReleaseAlbumIds
    .map(albumById)
    .filter((album): album is Album => Boolean(album));

  const playAlbum = (albumId: string) => {
    const tracks = tracksForAlbum(albumId);
    const first = tracks[0];
    if (first) player.play(first, tracks);
  };

  const playPlaylist = (playlist: Playlist) => {
    const tracks = tracksForPlaylist(playlist);
    const first = tracks[0];
    if (first) player.play(first, tracks);
  };

  const playMix = (mix: Collection) => {
    const tracks = (mix.trackIds ?? [])
      .map((id) => catalog.tracks.find((track) => track.id === id))
      .filter((track): track is Track => Boolean(track));
    const queue = tracks.length > 0 ? tracks : catalog.tracks.slice(0, 6);
    const first = queue[0];
    if (first) player.play(first, queue);
  };

  const openLibrary = () => router.navigate('/library');
  const openBrowse = () => router.navigate('/browse');

  return (
    <Screen
      eyebrow="YOUR MUSIC"
      title={greetingForHour(new Date().getHours())}
      subtitle="Your music, picked up right where you left it."
      actions={
        <>
          <PrimaryButton
            label="Shuffle library"
            icon="shuffle"
            onPress={() => player.playShuffled(catalog.tracks)}
          />
          <SecondaryButton label="Open library" icon="albums-outline" onPress={openLibrary} />
        </>
      }>
      {featured ? (
        <FeaturedAlbumHero
          album={featured}
          onPlay={() => playAlbum(featured.id)}
          onShuffle={() => player.playShuffled(tracksForAlbum(featured.id))}
          onDetails={openBrowse}
          genreName={catalog.genres.find((genre) => genre.id === featured.genreId)?.name}
        />
      ) : null}

      <OnlineTrendingSection />

      {recentTracks.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Recently played"
            subtitle="From your real listening history"
            actionLabel="Your history"
            onActionPress={() => router.navigate('/personalization')}
          />
          <Surface bordered padding="sm">
            {recentTracks.slice(0, isCompact ? 3 : 5).map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                divider={index > 0}
                showAlbum
                isCurrent={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                isFavorite={library.isFavorite(track.id)}
                isSaved={library.isSavedOnlineTrack(track.id)}
                onPress={() => player.play(track, recentTracks)}
                onToggleFavorite={() => library.toggleFavorite(track.id)}
                onToggleSave={
                  track.provider ? () => library.toggleOnlineTrackSaved(track) : undefined
                }
              />
            ))}
          </Surface>
        </View>
      ) : null}

      <PersonalizedSections />

      {madeForYou.length > 0 && !personal.model.personalized ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Made for you"
            subtitle="A few thoughtful places to start listening"
            actionLabel="Explore all"
            onActionPress={openBrowse}
          />
          <View style={{ gap: theme.spacing.xl }}>
            {suggestedPlaylists.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Playlists picked for you" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
                  {suggestedPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                      onPress={() => playPlaylist(playlist)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {recommendedAlbums.length > 0 ? (
              <View style={{ gap: theme.spacing.sm }}>
                <SectionHeader title="Albums to spend time with" />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
                  {recommendedAlbums.map((album) => (
                    <AlbumCard
                      key={album.id}
                      album={album}
                      width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                      onPress={() => playAlbum(album.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.sm }}>
              <SectionHeader title="Listening collections" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
                {madeForYou.map((mix) => (
                  <ArtworkCard
                    key={mix.id}
                    title={mix.title}
                    subtitle={mix.subtitle}
                    palette={mix.palette}
                    width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                    onPress={() => playMix(mix)}
                    accessibilityLabel={`Play ${mix.title}`}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      ) : null}

      {quickAccess.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Quick access"
            subtitle="Your favorite playlists, ready when you are"
            actionLabel="All playlists"
            onActionPress={openLibrary}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm }}>
            {quickAccess.map((playlist) => (
              <View
                key={playlist.id}
                style={{
                  width: `${100 / quickAccessColumns}%`,
                  paddingHorizontal: theme.spacing.sm,
                  paddingBottom: theme.spacing.lg,
                }}>
                <PlaylistCard playlist={playlist} onPress={() => playPlaylist(playlist)} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {newReleases.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="New releases"
            subtitle="New from the artists you love"
            actionLabel="Browse"
            onActionPress={openBrowse}
          />
          <ArtworkGrid
            items={newReleases.map(toGridItem)}
            columns={columns}
            onSelect={(item) => playAlbum(item.id)}
          />
        </View>
      ) : null}
    </Screen>
  );
}
