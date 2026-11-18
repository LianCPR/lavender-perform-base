import { useTheme } from '@lavender/design-system';
import { searchCatalog, useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import { getActiveProvider } from '@lavender/music-providers';
import { pluralize, type Album, type ID, type Track } from '@lavender/shared';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip } from '../Chip';
import { EmptyState } from '../feedback/EmptyState';
import { OnlineSearchPanel } from '../online/OnlineSearchPanel';
import { PlaylistDetail } from '../music/PlaylistDetail';
import { TrackCollectionSheet } from '../music/TrackCollectionSheet';
import { TrackRow } from '../music/TrackRow';
import { SearchBar } from '../search/SearchBar';
import { SearchResultRow } from '../search/SearchResultRow';
import { Screen } from '../Screen';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';

type SearchDetailTarget = { kind: 'album' | 'artist'; id: ID };

/** Search: live, case-insensitive filtering of the local catalog. */
export function SearchScreen() {
  const theme = useTheme();
  const library = useLibrary();
  const player = usePlayer();
  const provider = useMemo(() => getActiveProvider(), []);
  const [scope, setScope] = useState<'all' | 'local' | 'online'>('all');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<SearchDetailTarget | null>(null);
  const [playlistId, setPlaylistId] = useState<ID | null>(null);

  const results = useMemo(
    () => searchCatalog(library.catalog, library.playlists, query, 30),
    [library.catalog, library.playlists, query],
  );

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const playTrack = (track: Track) => {
    library.recordSearch(trimmed);
    player.play(track, library.tracksForAlbum(track.albumId));
  };

  const playAlbum = (album: Album) => {
    const tracks = library.tracksForAlbum(album.id);
    const first = tracks[0];
    if (first) player.play(first, tracks);
  };

  const detail = (() => {
    if (!target) return null;
    if (target.kind === 'album') {
      const album = library.albumById(target.id);
      if (!album) return null;
      return {
        title: album.title,
        subtitle: `${album.artistName} · ${album.year} · ${pluralize(album.trackCount, 'song')}`,
        palette: album.palette,
        tracks: library.tracksForAlbum(album.id),
        albums: [] as Album[],
      };
    }
    const artist = library.artistById(target.id);
    if (!artist) return null;
    const albums = library.catalog.albums.filter((album) => album.artistId === artist.id);
    return {
      title: artist.name,
      subtitle: pluralize(albums.length, 'album'),
      palette: artist.palette,
      tracks: library.tracksForArtist(artist.id),
      albums,
    };
  })();

  const playlist = playlistId ? library.playlistById(playlistId) : undefined;

  const clearSearch = () => setQuery('');

  return (
    <Screen
      title="Search"
      subtitle={
        provider
          ? `Search your library, or the ${provider.name} open catalog when you are online.`
          : 'Find songs, albums, artists, playlists and genres in your catalog.'
      }>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        onSubmit={() => library.recordSearch(trimmed)}
      />

      {provider ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Chip
            label="All"
            icon="apps-outline"
            selected={scope === 'all'}
            onPress={() => setScope('all')}
          />
          <Chip
            label="Local library"
            icon="phone-portrait-outline"
            selected={scope === 'local'}
            onPress={() => setScope('local')}
          />
          <Chip
            label={`Online · ${provider.name}`}
            icon="globe-outline"
            selected={scope === 'online'}
            onPress={() => setScope('online')}
          />
        </View>
      ) : null}

      {!hasQuery && scope === 'online' ? (
        <Text variant="callout" tone="secondary">
          Type at least two characters to search {provider?.name ?? 'the online catalog'}.
          Online playback uses streams authorized by the provider.
        </Text>
      ) : null}

      {!hasQuery && scope !== 'online' ? (
        <>
          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Recent searches"
              subtitle={library.recentSearches.length > 0 ? 'Saved on this device' : undefined}
              actionLabel={library.recentSearches.length > 0 ? 'Clear all' : undefined}
              onActionPress={library.recentSearches.length > 0 ? library.clearSearches : undefined}
            />
            {library.recentSearches.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {library.recentSearches.map((term) => (
                  <Chip
                    key={term}
                    label={term}
                    icon="time-outline"
                    onPress={() => setQuery(term)}
                  />
                ))}
              </View>
            ) : (
              <Text variant="callout" tone="secondary">
                Search for an artist, song or album — your recent searches show up here.
              </Text>
            )}
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader title="Search categories" subtitle="Jump straight into a genre" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {library.catalog.genres.map((genre) => (
                <Chip
                  key={genre.id}
                  label={genre.name}
                  icon="musical-notes-outline"
                  onPress={() => setQuery(genre.name)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader title="Recently played" subtitle="Pick up where you left off" />
            {library.recentTracks.length > 0 ? (
              <Surface bordered padding="sm">
                {library.recentTracks.slice(0, 5).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    divider={index > 0}
                    isCurrent={player.currentTrack?.id === track.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                    isFavorite={library.isFavorite(track.id)}
                    onPress={() => playTrack(track)}
                    onToggleFavorite={() => library.toggleFavorite(track.id)}
                  />
                ))}
              </Surface>
            ) : (
              <Text variant="callout" tone="secondary">
                Play something and it will appear here.
              </Text>
            )}
          </View>
        </>
      ) : null}

      {hasQuery && scope !== 'online' ? (
        results.total === 0 ? (
          scope === 'local' ? (
            <EmptyState
              icon="search-outline"
              title={`No matches for “${trimmed}”`}
              description="Try a different spelling, an artist name, or one of the genres above."
              actionLabel="Clear search"
              onAction={clearSearch}
            />
          ) : (
            <Text variant="callout" tone="secondary">
              Nothing in your library matches “{trimmed}”. Online results appear below when a
              provider is connected.
            </Text>
          )
        ) : (
        <>
          {results.tracks.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title="Songs"
                subtitle={pluralize(results.tracks.length, 'match', 'matches')}
              />
              <Surface bordered padding="sm">
                {results.tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    divider={index > 0}
                    showAlbum
                    isCurrent={player.currentTrack?.id === track.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                    isFavorite={library.isFavorite(track.id)}
                    onPress={() => playTrack(track)}
                    onToggleFavorite={() => library.toggleFavorite(track.id)}
                  />
                ))}
              </Surface>
            </View>
          ) : null}

          {results.albums.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Albums" subtitle={pluralize(results.albums.length, 'album')} />
              <Surface bordered padding="sm">
                {results.albums.map((album, index) => (
                  <View
                    key={album.id}
                    style={{
                      borderTopWidth: index > 0 ? theme.border.hairline : 0,
                      borderTopColor: theme.colors.divider,
                    }}>
                    <SearchResultRow
                      title={album.title}
                      subtitle={`${album.artistName} · ${album.year}`}
                      palette={album.palette}
                      kind="album"
                      onPress={() => {
                        library.recordSearch(trimmed);
                        setTarget({ kind: 'album', id: album.id });
                      }}
                      onPlay={() => playAlbum(album)}
                    />
                  </View>
                ))}
              </Surface>
            </View>
          ) : null}

          {results.artists.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Artists" subtitle={pluralize(results.artists.length, 'artist')} />
              <Surface bordered padding="sm">
                {results.artists.map((artist, index) => (
                  <View
                    key={artist.id}
                    style={{
                      borderTopWidth: index > 0 ? theme.border.hairline : 0,
                      borderTopColor: theme.colors.divider,
                    }}>
                    <SearchResultRow
                      title={artist.name}
                      subtitle={`${pluralize(
                        library.catalog.albums.filter((album) => album.artistId === artist.id).length,
                        'album',
                      )}`}
                      palette={artist.palette}
                      kind="artist"
                      onPress={() => {
                        library.recordSearch(trimmed);
                        setTarget({ kind: 'artist', id: artist.id });
                      }}
                      onPlay={() => {
                        const tracks = library.tracksForArtist(artist.id);
                        const first = tracks[0];
                        if (first) player.play(first, tracks);
                      }}
                    />
                  </View>
                ))}
              </Surface>
            </View>
          ) : null}

          {results.playlists.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title="Playlists"
                subtitle={pluralize(results.playlists.length, 'playlist')}
              />
              <Surface bordered padding="sm">
                {results.playlists.map((item, index) => (
                  <View
                    key={item.id}
                    style={{
                      borderTopWidth: index > 0 ? theme.border.hairline : 0,
                      borderTopColor: theme.colors.divider,
                    }}>
                    <SearchResultRow
                      title={item.name}
                      subtitle={pluralize(item.trackIds.length, 'song')}
                      palette={item.palette}
                      kind="playlist"
                      onPress={() => {
                        library.recordSearch(trimmed);
                        setPlaylistId(item.id);
                      }}
                    />
                  </View>
                ))}
              </Surface>
            </View>
          ) : null}

          {results.genres.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader title="Genres" subtitle={pluralize(results.genres.length, 'genre')} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.sm }}>
                {results.genres.map((genre) => (
                  <Chip
                    key={genre.id}
                    label={genre.name}
                    icon="grid-outline"
                    onPress={() => setQuery(genre.name)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
        )
      ) : null}

      {hasQuery && scope !== 'local' ? (
        provider ? (
          <OnlineSearchPanel query={trimmed} provider={provider} />
        ) : (
          <EmptyState
            icon="globe-outline"
            title="Online music is off"
            description="This build does not have an online provider enabled. Your local library still works."
          />
        )
      ) : null}

      {detail ? (
        <TrackCollectionSheet
          visible
          onClose={() => setTarget(null)}
          title={detail.title}
          subtitle={detail.subtitle}
          palette={detail.palette}
          tracks={detail.tracks}
          currentTrackId={player.currentTrack?.id}
          isPlaying={player.isPlaying}
          isFavorite={library.isFavorite}
          onToggleFavorite={library.toggleFavorite}
          onPlay={() => {
            const first = detail.tracks[0];
            if (first) player.play(first, detail.tracks);
          }}
          onShuffle={() => {
            if (detail.tracks.length > 0) player.playShuffled(detail.tracks);
          }}
          onSelectTrack={(track) => player.play(track, detail.tracks)}
        />
      ) : null}

      {playlist ? (
        <PlaylistDetail playlist={playlist} visible onClose={() => setPlaylistId(null)} />
      ) : null}
    </Screen>
  );
}
