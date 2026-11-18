import { useTheme } from '@lavender/design-system';
import { useLibrary, type LibrarySort } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import { getActiveProvider } from '@lavender/music-providers';
import {
  formatTotalDuration,
  pluralize,
  type Album,
  type Artist,
  type Playlist,
  type Track,
} from '@lavender/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { EmptyLibraryState } from '../feedback/EmptyLibraryState';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { LibraryFilter, type LibraryFilterKey } from '../library/LibraryFilter';
import { PlaylistGrid } from '../library/PlaylistGrid';
import { SortMenu } from '../library/SortMenu';
import { AlbumCard } from '../music/AlbumCard';
import { ArtistCard } from '../music/ArtistCard';
import { PlaylistDetail } from '../music/PlaylistDetail';
import { TrackRow } from '../music/TrackRow';
import { TextPromptSheet } from '../overlays/TextPromptSheet';
import { TrackActionsSheet } from '../overlays/TrackActionsSheet';
import { TrackEditSheet } from '../overlays/TrackEditSheet';
import { OnlineLibrarySection } from '../online/OnlineLibrarySection';
import { SearchBar } from '../search/SearchBar';
import { SearchResultRow } from '../search/SearchResultRow';
import { Screen } from '../Screen';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';

type PromptState = { mode: 'create' } | null;

function compareBy<T>(
  sort: LibrarySort,
  getTitle: (item: T) => string,
  getArtist: (item: T) => string,
  getCreated: (item: T) => string,
) {
  return (a: T, b: T) => {
    if (sort === 'title') return getTitle(a).localeCompare(getTitle(b));
    if (sort === 'artist') return getArtist(a).localeCompare(getArtist(b));
    return getCreated(b).localeCompare(getCreated(a));
  };
}

/** Library: the listener's own songs, collections and playlists. */
export function LibraryScreen() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const isCompact = breakpoint === 'compact';
  const library = useLibrary();
  const player = usePlayer();
  const provider = useMemo(() => getActiveProvider(), []);

  const [filter, setFilter] = useState<LibraryFilterKey>('all');
  const [query, setQuery] = useState('');
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [menuTrack, setMenuTrack] = useState<Track | null>(null);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const { preferences, setSort, setView } = library;
  const normalized = query.trim().toLowerCase();
  const matches = (...values: (string | undefined)[]) =>
    !normalized || values.some((value) => value?.toLowerCase().includes(normalized));

  // Songs: catalog order is the "recently added" proxy for demo tracks.
  const songs = library.catalog.tracks
    .filter((track) => matches(track.title, track.artistName, track.albumTitle))
    .sort((a, b) => {
      if (preferences.sort === 'title') return a.title.localeCompare(b.title);
      if (preferences.sort === 'artist') {
        return a.artistName.localeCompare(b.artistName) || a.title.localeCompare(b.title);
      }
      return 0;
    });

  const albums = library.catalog.albums
    .filter((album) => matches(album.title, album.artistName))
    .sort(compareBy<Album>(
      preferences.sort,
      (album) => album.title,
      (album) => album.artistName,
      (album) => `${album.year}`,
    ));

  const artists = library.catalog.artists
    .filter((artist) => matches(artist.name))
    .sort((a, b) => (preferences.sort === 'recent' ? 0 : a.name.localeCompare(b.name)));

  const playlists = library.playlists
    .filter((playlist) => matches(playlist.name, playlist.description))
    .sort(compareBy<Playlist>(
      preferences.sort,
      (playlist) => playlist.name,
      (playlist) => playlist.name,
      (playlist) => playlist.createdAt,
    ));

  const favorites = library.catalog.tracks
    .filter((track) => library.isFavorite(track.id))
    .filter((track) => matches(track.title, track.artistName, track.albumTitle));

  const recents = library.recentTracks.filter((track) =>
    matches(track.title, track.artistName, track.albumTitle),
  );

  const openPlaylist = openPlaylistId ? library.playlistById(openPlaylistId) : undefined;
  const isListView = preferences.view === 'list';

  const playTrackList = (tracks: Track[], track: Track) => {
    if (track.provider) library.cacheOnlineTracks(tracks);
    player.play(track, tracks);
  };

  const savedOnlineTotal =
    library.savedOnlineTracks.length +
    library.savedOnlineAlbums.length +
    library.followedOnlineArtists.length +
    library.savedOnlinePlaylists.length;

  const handleImport = async () => {
    setImportMessage(null);
    try {
      const result = await library.importMusic();
      if (result.canceled) return;
      const parts: string[] = [];
      if (result.added > 0) parts.push(`Imported ${pluralize(result.added, 'song')}`);
      if (result.failed.length > 0) {
        const first = result.failed[0];
        parts.push(
          `Could not import ${first?.name ?? 'a file'}${first ? ` — ${first.reason}` : ''}`,
        );
      }
      setImportMessage(parts.join(' · ') || 'Nothing was imported.');
    } catch (error) {
      setImportMessage(
        error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.',
      );
    }
  };

  const playAlbum = (album: Album) => {
    const tracks = library.tracksForAlbum(album.id);
    const first = tracks[0];
    if (first) player.play(first, tracks);
  };

  const openArtist = (artist: Artist) => {
    const tracks = library.tracksForArtist(artist.id);
    const first = tracks[0];
    if (first) player.play(first, tracks);
  };

  const renderTrackList = (tracks: Track[], emptyTitle: string, emptyDescription: string) => {
    if (tracks.length === 0) {
      return (
        <EmptyLibraryState
          icon="musical-notes-outline"
          title={emptyTitle}
          description={emptyDescription}
        />
      );
    }

    return (
      <Surface bordered padding="sm">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index + 1}
            divider={index > 0}
            showAlbum
            isCurrent={player.currentTrack?.id === track.id}
            isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
            isFavorite={library.isFavorite(track.id)}
            onPress={() => playTrackList(tracks, track)}
            onToggleFavorite={() => library.toggleFavorite(track.id)}
            onMenu={() => setMenuTrack(track)}
          />
        ))}
      </Surface>
    );
  };

  const renderAlbumCollection = () => {
    if (albums.length === 0) {
      return (
        <EmptyLibraryState
          icon="disc-outline"
          title="No albums found"
          description={
            normalized
              ? 'Nothing in your albums matches that search.'
              : 'Albums from your local catalog will appear here.'
          }
        />
      );
    }

    if (isListView) {
      return (
        <Surface bordered padding="sm">
          {albums.map((album, index) => (
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
                onPlay={() => playAlbum(album)}
              />
            </View>
          ))}
        </Surface>
      );
    }

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm }}>
        {albums.map((album) => (
          <View
            key={album.id}
            style={{
              width: `${100 / (isCompact ? 2 : breakpoint === 'medium' ? 3 : 4)}%`,
              paddingHorizontal: theme.spacing.sm,
              paddingBottom: theme.spacing.lg,
            }}>
            <AlbumCard
              album={album}
              showYear
              onPress={() => playAlbum(album)}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderArtistCollection = () => {
    if (artists.length === 0) {
      return (
        <EmptyLibraryState icon="person-outline" title="No artists found" />
      );
    }

    if (isListView) {
      return (
        <Surface bordered padding="sm">
          {artists.map((artist, index) => (
            <View
              key={artist.id}
              style={{
                borderTopWidth: index > 0 ? theme.border.hairline : 0,
                borderTopColor: theme.colors.divider,
              }}>
              <SearchResultRow
                title={artist.name}
                subtitle={pluralize(
                  library.catalog.albums.filter((album) => album.artistId === artist.id).length,
                  'album',
                )}
                palette={artist.palette}
                kind="artist"
                onPress={() => openArtist(artist)}
                onPlay={() => openArtist(artist)}
              />
            </View>
          ))}
        </Surface>
      );
    }

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -theme.spacing.sm }}>
        {artists.map((artist) => (
          <View
            key={artist.id}
            style={{
              width: `${100 / (isCompact ? 2 : breakpoint === 'medium' ? 3 : 4)}%`,
              paddingHorizontal: theme.spacing.sm,
              paddingBottom: theme.spacing.lg,
            }}>
            <ArtistCard artist={artist} onPress={() => openArtist(artist)} />
          </View>
        ))}
      </View>
    );
  };

  const renderPlaylistCollection = () => (
    <View style={{ gap: theme.spacing.md }}>
      {playlists.length === 0 ? (
        <EmptyLibraryState
          icon="list-outline"
          title="No playlists yet"
          description="Create a playlist and add songs from your catalog."
          actionLabel="New playlist"
          onAction={() => setPrompt({ mode: 'create' })}
        />
      ) : (
        <PlaylistGrid playlists={playlists} onOpen={(item) => setOpenPlaylistId(item.id)} />
      )}
    </View>
  );

  return (
    <Screen
      title="Library"
      subtitle="Your songs, albums, playlists and favorites — saved on this device."
      actions={
        <>
          <PrimaryButton
            label={library.isImporting ? 'Importing…' : 'Import music'}
            icon="cloud-upload-outline"
            size="sm"
            loading={library.isImporting}
            onPress={handleImport}
          />
          <SecondaryButton
            label="New playlist"
            icon="add"
            size="sm"
            onPress={() => setPrompt({ mode: 'create' })}
          />
        </>
      }>
      <View style={{ gap: theme.spacing.md }}>
        {importMessage ? (
          <Text variant="caption" tone="secondary" accessibilityLiveRegion="polite">
            {importMessage}
          </Text>
        ) : null}
        <LibraryFilter value={filter} onChange={setFilter} />

        <View
          style={{
            flexDirection: isCompact ? 'column' : 'row',
            alignItems: isCompact ? 'stretch' : 'center',
            gap: theme.spacing.sm,
          }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search your library"
            accessibilityLabel="Search your library"
            compact
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <SortMenu value={preferences.sort} onChange={setSort} />
            <IconButton
              icon={isListView ? 'grid-outline' : 'list-outline'}
              label={isListView ? 'Switch to grid layout' : 'Switch to list layout'}
              size="md"
              variant="solid"
              onPress={() => setView(isListView ? 'grid' : 'list')}
            />
          </View>
        </View>
      </View>

      {filter === 'all' ? (
        <>
          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Recently played"
              subtitle={
                recents.length > 0
                  ? `${pluralize(recents.length, 'song')} · ${formatTotalDuration(
                      recents.reduce((total, track) => total + track.durationSec, 0),
                    )}`
                  : undefined
              }
              actionLabel={recents.length > 0 ? 'See all' : undefined}
              onActionPress={recents.length > 0 ? () => setFilter('recent') : undefined}
            />
            {recents.length === 0 ? (
              <Text variant="callout" tone="secondary">
                Nothing played yet. Choose a song and it will show up here.
              </Text>
            ) : (
              <Surface bordered padding="sm">
                {recents.slice(0, 5).map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    divider={index > 0}
                    isCurrent={player.currentTrack?.id === track.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                    isFavorite={library.isFavorite(track.id)}
                    onPress={() => playTrackList(recents, track)}
                    onToggleFavorite={() => library.toggleFavorite(track.id)}
                  />
                ))}
              </Surface>
            )}
          </View>

          {library.freshImports.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title="Imported"
                subtitle={`${pluralize(library.freshImports.length, 'file')} on this device`}
                actionLabel="Import more"
                onActionPress={handleImport}
              />
              <Surface bordered padding="sm">
                {library.freshImports.map((record) => (
                  <TrackRow
                    key={record.track.id}
                    track={record.track}
                    divider={record.track.id !== library.freshImports[0]?.track.id}
                    showAlbum
                    isCurrent={player.currentTrack?.id === record.track.id}
                    isPlaying={player.isPlaying && player.currentTrack?.id === record.track.id}
                    isFavorite={library.isFavorite(record.track.id)}
                    onPress={() =>
                      player.play(
                        record.track,
                        library.freshImports.map((item) => item.track),
                      )
                    }
                    onToggleFavorite={() => library.toggleFavorite(record.track.id)}
                    onMenu={() => setMenuTrack(record.track)}
                  />
                ))}
              </Surface>
            </View>
          ) : null}

          {provider && savedOnlineTotal > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              <SectionHeader
                title={`Saved from ${provider.name}`}
                subtitle={`${savedOnlineTotal} online item${savedOnlineTotal === 1 ? '' : 's'} · streaming from ${provider.name}`}
                actionLabel="See all"
                onActionPress={() => setFilter('online')}
              />
              {library.savedOnlineTracks.length > 0 ? (
                <Surface bordered padding="sm">
                  {library.savedOnlineTracks.slice(0, 3).map((track, index) => (
                    <TrackRow
                      key={track.id}
                      track={track}
                      divider={index > 0}
                      showAlbum
                      isCurrent={player.currentTrack?.id === track.id}
                      isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                      isFavorite={library.isFavorite(track.id)}
                      isSaved
                      onPress={() => playTrackList(library.savedOnlineTracks, track)}
                      onToggleFavorite={() => library.toggleFavorite(track.id)}
                      onToggleSave={() => library.toggleOnlineTrackSaved(track)}
                    />
                  ))}
                </Surface>
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Playlists"
              subtitle={pluralize(playlists.length, 'playlist')}
              actionLabel="Manage"
              onActionPress={() => setFilter('playlists')}
            />
            {renderPlaylistCollection()}
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Albums"
              subtitle={pluralize(albums.length, 'album')}
              actionLabel="See all"
              onActionPress={() => setFilter('albums')}
            />
            {renderAlbumCollection()}
          </View>

          <View style={{ gap: theme.spacing.md }}>
            <SectionHeader
              title="Artists"
              subtitle={pluralize(artists.length, 'artist')}
              actionLabel="See all"
              onActionPress={() => setFilter('artists')}
            />
            {renderArtistCollection()}
          </View>
        </>
      ) : null}

      {filter === 'recent' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Recently played" subtitle="Most recent first" />
          {renderTrackList(
            recents,
            'Nothing played yet',
            'Choose a song from Browse or Search and it will appear here.',
          )}
        </View>
      ) : null}

      {filter === 'songs' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Songs" subtitle={pluralize(songs.length, 'song')} />
          {renderTrackList(songs, 'No songs found', 'Try a different search term.')}
        </View>
      ) : null}

      {filter === 'albums' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Albums" subtitle={pluralize(albums.length, 'album')} />
          {renderAlbumCollection()}
        </View>
      ) : null}

      {filter === 'artists' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Artists" subtitle={pluralize(artists.length, 'artist')} />
          {renderArtistCollection()}
        </View>
      ) : null}

      {filter === 'playlists' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Playlists"
            subtitle={`${pluralize(library.userPlaylists.length, 'playlist')} created by you`}
            actionLabel="New playlist"
            onActionPress={() => setPrompt({ mode: 'create' })}
          />
          {renderPlaylistCollection()}
        </View>
      ) : null}

      {filter === 'online' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Online library"
            subtitle={
              provider
                ? `Saved from ${provider.name} · streams stay with the provider`
                : 'No online provider is enabled in this build'
            }
          />
          {provider ? (
            <OnlineLibrarySection provider={provider} />
          ) : (
            <EmptyLibraryState
              icon="globe-outline"
              title="Online music is off"
              description="Set an online provider for this build to search and save streaming music."
            />
          )}
        </View>
      ) : null}

      {filter === 'favorites' ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader title="Favorites" subtitle={pluralize(favorites.length, 'song')} />
          {renderTrackList(
            favorites,
            'No favorites yet',
            'Tap the heart on any song to keep it here.',
          )}
        </View>
      ) : null}

      {/* Sheets are mounted only while open: react-native-web keeps a closed
          Modal portal around, so unmounting is what actually dismisses it. */}
      {openPlaylist ? (
        <PlaylistDetail
          playlist={openPlaylist}
          visible
          onClose={() => setOpenPlaylistId(null)}
        />
      ) : null}

      {menuTrack ? (
        <TrackActionsSheet
          track={menuTrack}
          visible
          onClose={() => setMenuTrack(null)}
          onPlayNext={() => {
            player.playNext(menuTrack);
            setMenuTrack(null);
          }}
          onAddToQueue={() => {
            player.addToQueue(menuTrack);
            setMenuTrack(null);
          }}
          onEdit={
            menuTrack.imported
              ? () => {
                  setEditTrack(menuTrack);
                  setMenuTrack(null);
                }
              : undefined
          }
          onRemove={
            menuTrack.imported
              ? () => {
                  library.removeImportedTrack(menuTrack.id);
                  setMenuTrack(null);
                }
              : undefined
          }
        />
      ) : null}

      {editTrack ? (
        <TrackEditSheet
          track={editTrack}
          visible
          onCancel={() => setEditTrack(null)}
          onSubmit={(values) => {
            library.updateImportedTrack(editTrack.id, values);
            setEditTrack(null);
          }}
        />
      ) : null}

      {prompt ? (
        <TextPromptSheet
          visible
          title="New playlist"
          description="Give your playlist a name. You can add songs right after."
          label="Playlist name"
          initialValue=""
          confirmLabel="Create"
          onCancel={() => setPrompt(null)}
          onSubmit={(value) => {
            library.createPlaylist(value);
            setPrompt(null);
          }}
        />
      ) : null}
    </Screen>
  );
}
