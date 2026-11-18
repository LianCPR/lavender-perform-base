import { fontFamily, useTheme } from '@lavender/design-system';
import { formatTotalDuration, pluralize, type Playlist } from '@lavender/shared';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, TextInput, View, type TextStyle } from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { Text } from '../Text';
import { TrackCollectionSheet } from './TrackCollectionSheet';

const webInputReset = Platform.select<TextStyle>({
  web: { outlineStyle: 'none' } as unknown as TextStyle,
});

type PlaylistMode = 'browse' | 'rename' | 'delete';

export interface PlaylistDetailProps {
  playlist: Playlist | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Playlist details with local management.
 *
 * Rename and delete are handled inline inside this one sheet rather than with
 * stacked dialogs: only one overlay is ever mounted, which keeps web modals
 * predictable. Curated catalog playlists are read-only.
 */
export function PlaylistDetail({ playlist, visible, onClose }: PlaylistDetailProps) {
  const theme = useTheme();
  const library = useLibrary();
  const player = usePlayer();
  const [mode, setMode] = useState<PlaylistMode>('browse');
  const [picking, setPicking] = useState(false);
  const [nameDraft, setNameDraft] = useState(playlist?.name ?? '');

  // Reset transient editing state whenever the sheet closes or changes playlist.
  useEffect(() => {
    if (visible) {
      setNameDraft(playlist?.name ?? '');
      setMode('browse');
    } else {
      setPicking(false);
    }
  }, [playlist?.id, playlist?.name, visible]);

  if (!playlist) return null;

  const tracks = library.tracksForPlaylist(playlist);
  const canEdit = library.userPlaylists.some((item) => item.id === playlist.id);
  const availableTracks = library.catalog.tracks.filter(
    (track) => !playlist.trackIds.includes(track.id),
  );
  const totalDuration = formatTotalDuration(
    tracks.reduce((total, track) => total + track.durationSec, 0),
  );

  return (
    <TrackCollectionSheet
      visible={visible}
      onClose={onClose}
      title={playlist.name}
      subtitle={`${pluralize(tracks.length, 'song')} · ${totalDuration}${
        playlist.curated ? ' · Curated' : ''
      }`}
      description={playlist.description}
      palette={playlist.palette}
      tracks={tracks}
      currentTrackId={player.currentTrack?.id}
      isPlaying={player.isPlaying}
      isFavorite={library.isFavorite}
      onToggleFavorite={library.toggleFavorite}
      onPlay={() => {
        const first = tracks[0];
        if (first) player.play(first, tracks);
      }}
      onShuffle={() => {
        if (tracks.length > 0) player.playShuffled(tracks);
      }}
      onSelectTrack={(track) => player.play(track, tracks)}
      onRemoveTrack={
        canEdit && mode === 'browse'
          ? (track) => library.removeTrackFromPlaylist(playlist.id, track.id)
          : undefined
      }
      emptyMessage="This playlist is empty. Add a few songs to get started."
      extraActions={
        canEdit && mode === 'browse' ? (
          <>
            <SecondaryButton
              label="Rename"
              icon="create-outline"
              size="sm"
              onPress={() => setMode('rename')}
            />
            <SecondaryButton
              label="Delete"
              icon="trash-outline"
              size="sm"
              onPress={() => setMode('delete')}
            />
          </>
        ) : null
      }>
      {canEdit && mode === 'rename' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="tertiary">
            PLAYLIST NAME
          </Text>
          <View
            style={{
              borderRadius: theme.radius.control,
              borderWidth: theme.border.hairline,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              paddingHorizontal: theme.spacing.md,
            }}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              returnKeyType="done"
              autoFocus
              accessibilityLabel="Playlist name"
              placeholder="Playlist name"
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={() => {
                if (!nameDraft.trim()) return;
                library.renamePlaylist(playlist.id, nameDraft);
                setMode('browse');
              }}
              style={[
                {
                  color: theme.colors.text,
                  fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  paddingVertical: theme.spacing.md,
                },
                webInputReset,
              ]}
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
            <SecondaryButton
              label="Cancel"
              size="sm"
              onPress={() => {
                setNameDraft(playlist.name);
                setMode('browse');
              }}
            />
            <PrimaryButton
              label="Save name"
              size="sm"
              disabled={!nameDraft.trim()}
              onPress={() => {
                library.renamePlaylist(playlist.id, nameDraft);
                setMode('browse');
              }}
            />
          </View>
        </View>
      ) : null}

      {canEdit && mode === 'delete' ? (
        <View
          style={{
            gap: theme.spacing.sm,
            padding: theme.spacing.md,
            borderRadius: theme.radius.card,
            borderWidth: theme.border.hairline,
            borderColor: theme.colors.borderStrong,
            backgroundColor: theme.colors.dangerSubtle,
          }}>
          <Text variant="subheading">Delete this playlist?</Text>
          <Text variant="secondary" tone="secondary">
            “{playlist.name}” and its saved track order will be removed from this device. Songs stay
            in your catalog.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm }}>
            <SecondaryButton label="Keep playlist" size="sm" onPress={() => setMode('browse')} />
            <PrimaryButton
              label="Delete playlist"
              icon="trash-outline"
              size="sm"
              onPress={() => {
                library.deletePlaylist(playlist.id);
                onClose();
              }}
            />
          </View>
        </View>
      ) : null}

      {canEdit && mode === 'browse' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <SecondaryButton
            label={picking ? 'Hide song picker' : 'Add songs'}
            icon={picking ? 'chevron-up' : 'add'}
            size="sm"
            onPress={() => setPicking((current) => !current)}
          />

          {picking ? (
            availableTracks.length === 0 ? (
              <Text variant="secondary" tone="secondary">
                Every song in the catalog is already in this playlist.
              </Text>
            ) : (
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: 220 }}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: theme.spacing.xs }}>
                {availableTracks.map((track) => (
                  <View
                    key={track.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                    }}>
                    <Artwork palette={track.palette} size={32} cornerRadius={7} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="caption" numberOfLines={1}>
                        {track.title}
                      </Text>
                      <Text variant="micro" tone="secondary" numberOfLines={1}>
                        {track.artistName}
                      </Text>
                    </View>
                    <IconButton
                      icon="add-circle-outline"
                      label={`Add ${track.title} to ${playlist.name}`}
                      size="sm"
                      onPress={() => library.addTracksToPlaylist(playlist.id, [track.id])}
                    />
                  </View>
                ))}
              </ScrollView>
            )
          ) : null}
        </View>
      ) : null}
    </TrackCollectionSheet>
  );
}
