import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  describeProviderError,
  isAbortError,
  type MusicProvider,
} from '@lavender/music-providers';
import type { ProviderAlbum, ProviderArtist, ProviderPlaylist, Track } from '@lavender/shared';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { SecondaryButton } from '../buttons/SecondaryButton';
import { ErrorState } from '../feedback/ErrorState';
import { LoadingState } from '../feedback/LoadingState';
import { TrackCollectionSheet } from '../music/TrackCollectionSheet';
import { Sheet } from '../overlays/Sheet';
import { Text } from '../Text';

export type OnlineTarget =
  | { kind: 'album'; item: ProviderAlbum }
  | { kind: 'artist'; item: ProviderArtist }
  | { kind: 'playlist'; item: ProviderPlaylist };

interface DetailState {
  tracks: Track[];
  loading: boolean;
  error: Error | null;
}

function openExternal(url: string | undefined) {
  if (!url) return;
  void Linking.openURL(url).catch(() => undefined);
}

/**
 * Loads provider details only when the listener asks for them, so search and
 * Home stay light and a failure here never breaks the rest of the screen.
 */
export function OnlineDetailSheet({
  target,
  provider,
  onClose,
}: {
  target: OnlineTarget | null;
  provider: MusicProvider;
  onClose: () => void;
}) {
  const theme = useTheme();
  const library = useLibrary();
  const player = usePlayer();
  const [state, setState] = useState<DetailState>({ tracks: [], loading: false, error: null });
  const [nonce, setNonce] = useState(0);
  const cacheOnlineTracks = library.cacheOnlineTracks;

  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    setState({ tracks: [], loading: true, error: null });

    const load = async (): Promise<Track[]> => {
      if (target.kind === 'artist') {
        if (!provider.getArtist) throw new Error('This provider does not expose artists.');
        const detail = await provider.getArtist(target.item.providerArtistId, {
          signal: controller.signal,
        });
        return detail.tracks;
      }
      if (target.kind === 'album') {
        if (!provider.getAlbum) throw new Error('This provider does not expose albums.');
        const detail = await provider.getAlbum(target.item.providerAlbumId, {
          signal: controller.signal,
        });
        return detail.tracks;
      }
      if (!provider.getPlaylist) throw new Error('This provider does not expose playlists.');
      const detail = await provider.getPlaylist(target.item.providerPlaylistId, {
        signal: controller.signal,
      });
      return detail.tracks;
    };

    void load()
      .then((tracks) => {
        if (controller.signal.aborted) return;
        setState({ tracks, loading: false, error: null });
        cacheOnlineTracks(tracks);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || isAbortError(caught)) return;
        setState({
          tracks: [],
          loading: false,
          error: caught instanceof Error ? caught : new Error('The provider did not respond.'),
        });
      });

    return () => controller.abort();
  }, [cacheOnlineTracks, nonce, provider, target]);

  if (!target) return null;

  let title: string;
  let subtitle: string;
  let artworkUri: string | undefined;
  let palette: ProviderAlbum['palette'];
  if (target.kind === 'artist') {
    title = target.item.name;
    subtitle = target.item.handle
      ? `@${target.item.handle} · ${provider.name}`
      : provider.name;
    artworkUri = target.item.artworkUri;
    palette = target.item.palette;
  } else if (target.kind === 'album') {
    title = target.item.title;
    subtitle = `${target.item.artistName}${
      target.item.year ? ` · ${target.item.year}` : ''
    } · ${provider.name}`;
    artworkUri = target.item.artworkUri;
    palette = target.item.palette;
  } else {
    title = target.item.name;
    subtitle = `${target.item.creatorName} · ${provider.name}`;
    artworkUri = target.item.artworkUri;
    palette = target.item.palette;
  }

  if (state.loading) {
    return (
      <Sheet visible onClose={onClose} title={title} subtitle={subtitle}>
        <LoadingState label={`Loading from ${provider.name}…`} />
      </Sheet>
    );
  }

  if (state.error) {
    const described = describeProviderError(state.error);
    return (
      <Sheet visible onClose={onClose} title={title} subtitle={subtitle}>
        <ErrorState
          title={described.title}
          description={described.message}
          onRetry={described.retryable ? () => setNonce((value) => value + 1) : undefined}
        />
      </Sheet>
    );
  }

  const isSaved =
    target.kind === 'album'
      ? library.isSavedOnlineAlbum(target.item.id)
      : target.kind === 'artist'
        ? library.isFollowingOnlineArtist(target.item.id)
        : library.isSavedOnlinePlaylist(target.item.id);

  const toggleSaved = () => {
    if (target.kind === 'album') library.toggleOnlineAlbumSaved(target.item);
    else if (target.kind === 'artist') library.toggleOnlineArtistFollowed(target.item);
    else library.toggleOnlinePlaylistSaved(target.item);
  };
  const externalUrl = target.item.externalUrl;

  return (
    <TrackCollectionSheet
      visible
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      palette={palette}
      artworkUri={artworkUri}
      tracks={state.tracks}
      emptyMessage="This collection has no playable tracks right now."
      isPlaying={player.isPlaying}
      currentTrackId={player.currentTrack?.id}
      isFavorite={library.isFavorite}
      onToggleFavorite={(id) => {
        const track = state.tracks.find((item) => item.id === id);
        if (track && !library.isSavedOnlineTrack(track.id)) {
          library.toggleOnlineTrackSaved(track);
        }
        library.toggleFavorite(id);
      }}
      onPlay={() => {
        const first = state.tracks[0];
        if (first) player.play(first, state.tracks);
      }}
      onShuffle={() => {
        if (state.tracks.length > 0) player.playShuffled(state.tracks);
      }}
      onSelectTrack={(track) => player.play(track, state.tracks)}
      extraActions={
        <>
          <SecondaryButton
            label={
              target.kind === 'artist'
                ? isSaved
                  ? 'Following'
                  : 'Follow'
                : isSaved
                  ? 'Saved'
                  : 'Save'
            }
            icon={isSaved ? 'bookmark' : 'bookmark-outline'}
            size="sm"
            onPress={toggleSaved}
          />
          {externalUrl ? (
            <SecondaryButton
              label="Open original"
              icon="open-outline"
              size="sm"
              onPress={() => openExternal(externalUrl)}
            />
          ) : null}
        </>
      }>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="caption" tone="tertiary">
          Metadata and playback provided by {provider.name}. Availability and licensing are
          controlled by the provider.
        </Text>
      </View>
    </TrackCollectionSheet>
  );
}
