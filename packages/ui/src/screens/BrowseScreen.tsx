import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import { pluralize, type Album, type Collection, type ID, type Track } from '@lavender/shared';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { BrowseSection } from '../browse/BrowseSection';
import { GenreCard } from '../browse/GenreCard';
import { MoodCard } from '../browse/MoodCard';
import { gridColumns, useBreakpoint } from '../hooks/useBreakpoint';
import { AlbumCard } from '../music/AlbumCard';
import { FeaturedAlbumHero } from '../music/FeaturedAlbumHero';
import { PlaylistCard } from '../music/PlaylistCard';
import { PlaylistDetail } from '../music/PlaylistDetail';
import { TrackCollectionSheet } from '../music/TrackCollectionSheet';
import { Screen } from '../Screen';

type BrowseTarget =
  | { kind: 'album'; id: ID }
  | { kind: 'artist'; id: ID }
  | { kind: 'playlist'; id: ID }
  | { kind: 'genre'; id: ID }
  | { kind: 'mood'; id: ID }
  | { kind: 'collection'; id: ID };

interface DetailView {
  title: string;
  subtitle: string;
  description?: string;
  palette: Album['palette'];
  tracks: Track[];
  albums: Album[];
}

/** Browse: discovery rails, genres and moods, all from the local catalog. */
export function BrowseScreen() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';
  const columns = gridColumns(breakpoint);
  const categoryColumns = isCompact ? 2 : breakpoint === 'medium' ? 3 : 5;
  const moodColumns = isCompact ? 2 : breakpoint === 'medium' ? 2 : 3;
  const { catalog, playlists, playlistById, tracksForAlbum, tracksForArtist, isFavorite, toggleFavorite } =
    useLibrary();
  const player = usePlayer();
  const [target, setTarget] = useState<BrowseTarget | null>(null);

  const featuredAlbums = catalog.browse.featuredAlbumIds
    .map((id) => catalog.albums.find((album) => album.id === id))
    .filter((album): album is Album => Boolean(album));
  const featured = featuredAlbums[0];
  const newReleases = catalog.browse.newReleaseAlbumIds
    .map((id) => catalog.albums.find((album) => album.id === id))
    .filter((album): album is Album => Boolean(album));
  const recommendedPlaylists = catalog.browse.recommendedPlaylistIds
    .map((id) => playlists.find((playlist) => playlist.id === id))
    .filter((playlist): playlist is NonNullable<typeof playlist> => Boolean(playlist));
  const curatedCollections = catalog.browse.curatedCollectionIds
    .map((id) => catalog.mixes.find((mix) => mix.id === id))
    .filter((mix): mix is Collection => Boolean(mix));

  const playTracks = (tracks: Track[], shuffle = false) => {
    if (tracks.length === 0) return;
    if (shuffle) player.playShuffled(tracks);
    else {
      const first = tracks[0];
      if (first) player.play(first, tracks);
    }
  };

  const albumTracks = (album: Album) => tracksForAlbum(album.id);

  const detail = (() => {
    if (!target) return null;
    switch (target.kind) {
      case 'album': {
        const album = catalog.albums.find((item) => item.id === target.id);
        if (!album) return null;
        const view: DetailView = {
          title: album.title,
          subtitle: `${album.artistName} · ${album.year} · ${pluralize(album.trackCount, 'song')}`,
          palette: album.palette,
          tracks: albumTracks(album),
          albums: [],
        };
        return view;
      }
      case 'artist': {
        const artist = catalog.artists.find((item) => item.id === target.id);
        if (!artist) return null;
        const albums = catalog.albums.filter((album) => album.artistId === artist.id);
        const view: DetailView = {
          title: artist.name,
          subtitle: `${pluralize(albums.length, 'album')} · ${pluralize(
            tracksForArtist(artist.id).length,
            'song',
          )}`,
          description: 'Everything from this artist in your local catalog.',
          palette: artist.palette,
          tracks: tracksForArtist(artist.id),
          albums,
        };
        return view;
      }
      case 'genre': {
        const genre = catalog.genres.find((item) => item.id === target.id);
        if (!genre) return null;
        const albums = catalog.albums.filter((album) => album.genreId === genre.id);
        const view: DetailView = {
          title: genre.name,
          subtitle: `${pluralize(albums.length, 'album')} in this category`,
          description: `A starting point for ${genre.name.toLowerCase()} listening.`,
          palette: genre.palette,
          tracks: albums.flatMap((album) => tracksForAlbum(album.id)),
          albums,
        };
        return view;
      }
      case 'mood': {
        const mood = catalog.moods.find((item) => item.id === target.id);
        if (!mood) return null;
        const view: DetailView = {
          title: mood.name,
          subtitle: pluralize(mood.trackIds.length, 'song'),
          description: mood.description,
          palette: mood.palette,
          tracks: mood.trackIds
            .map((id) => catalog.tracks.find((track) => track.id === id))
            .filter((track): track is Track => Boolean(track)),
          albums: [],
        };
        return view;
      }
      case 'collection': {
        const mix = catalog.mixes.find((item) => item.id === target.id);
        if (!mix) return null;
        const view: DetailView = {
          title: mix.title,
          subtitle: mix.subtitle,
          description: 'A curated listening collection.',
          palette: mix.palette,
          tracks: (mix.trackIds ?? [])
            .map((id) => catalog.tracks.find((track) => track.id === id))
            .filter((track): track is Track => Boolean(track)),
          albums: [],
        };
        return view;
      }
      default:
        return null;
    }
  })();

  const playlist = target?.kind === 'playlist' ? playlistById(target.id) : undefined;

  return (
    <Screen
      eyebrow="DISCOVER"
      title="Browse"
      subtitle="New releases, genres and moods — a quiet way into the catalog.">
      <BrowseSection title="Featured discovery" subtitle="Picked for this week">
        {featured ? (
          <FeaturedAlbumHero
            album={featured}
            onPlay={() => playTracks(albumTracks(featured))}
            onShuffle={() => playTracks(albumTracks(featured), true)}
            onDetails={() => setTarget({ kind: 'album', id: featured.id })}
            genreName={catalog.genres.find((genre) => genre.id === featured.genreId)?.name}
          />
        ) : null}

        {featuredAlbums.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
            {featuredAlbums.slice(1).map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                onPress={() => setTarget({ kind: 'album', id: album.id })}
              />
            ))}
          </ScrollView>
        ) : null}
      </BrowseSection>

      <BrowseSection
        title="Browse categories"
        subtitle="Every corner of the local catalog"
        actionLabel={`${catalog.genres.length} categories`}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {catalog.genres.map((genre) => (
            <View
              key={genre.id}
              style={{ width: `${100 / categoryColumns}%`, padding: 6 }}>
              <GenreCard
                genre={genre}
                albumCount={catalog.albums.filter((album) => album.genreId === genre.id).length}
                onPress={() => setTarget({ kind: 'genre', id: genre.id })}
              />
            </View>
          ))}
        </View>
      </BrowseSection>

      <BrowseSection title="Mood & activities" subtitle="Listen by moment, not just genre">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
          {catalog.moods.map((mood) => (
            <View key={mood.id} style={{ width: `${100 / moodColumns}%`, padding: 6 }}>
              <MoodCard
                mood={mood}
                trackCount={mood.trackIds.length}
                onPress={() => setTarget({ kind: 'mood', id: mood.id })}
              />
            </View>
          ))}
        </View>
      </BrowseSection>

      {recommendedPlaylists.length > 0 ? (
        <BrowseSection title="Recommended playlists" subtitle="Editorial collections and your own">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
            {recommendedPlaylists.map((item) => (
              <PlaylistCard
                key={item.id}
                playlist={item}
                width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                onPress={() => setTarget({ kind: 'playlist', id: item.id })}
              />
            ))}
          </ScrollView>
        </BrowseSection>
      ) : null}

      <BrowseSection title="New releases" subtitle="Recently added to the catalog">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm }}>
          {newReleases.map((album) => (
            <View
              key={album.id}
              style={{
                width: `${100 / columns}%`,
                paddingHorizontal: theme.spacing.sm,
                paddingBottom: theme.spacing.lg,
              }}>
              <AlbumCard
                album={album}
                showYear
                onPress={() => setTarget({ kind: 'album', id: album.id })}
              />
            </View>
          ))}
        </View>
      </BrowseSection>

      {curatedCollections.length > 0 ? (
        <BrowseSection title="Curated collections" subtitle="Long-form listening">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
            {curatedCollections.map((mix) => (
              <ArtworkCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                palette={mix.palette}
                width={{ compact: 148, medium: 168, expanded: 184, wide: 192 }[breakpoint]}
                onPress={() => setTarget({ kind: 'collection', id: mix.id })}
                accessibilityLabel={`Open ${mix.title}`}
              />
            ))}
          </ScrollView>
        </BrowseSection>
      ) : null}

      {detail ? (
        <TrackCollectionSheet
          visible
          onClose={() => setTarget(null)}
          title={detail.title}
          subtitle={detail.subtitle}
          description={detail.description}
          palette={detail.palette}
          tracks={detail.tracks}
          currentTrackId={player.currentTrack?.id}
          isPlaying={player.isPlaying}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onPlay={() => playTracks(detail.tracks)}
          onShuffle={() => playTracks(detail.tracks, true)}
          onSelectTrack={(track) => player.play(track, detail.tracks)}>
          {detail.albums.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.md }}>
              {detail.albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  width={132}
                  onPress={() => setTarget({ kind: 'album', id: album.id })}
                />
              ))}
            </ScrollView>
          ) : null}
        </TrackCollectionSheet>
      ) : null}

      {playlist ? (
        <PlaylistDetail playlist={playlist} visible onClose={() => setTarget(null)} />
      ) : null}
    </Screen>
  );
}
