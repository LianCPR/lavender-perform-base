import { useTheme } from '@lavender/design-system';
import type { ArtworkPalette, Track } from '@lavender/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { Sheet } from '../overlays/Sheet';
import { Text } from '../Text';
import { TrackRow } from './TrackRow';

export interface TrackCollectionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  palette: ArtworkPalette;
  tracks: Track[];
  onPlay: () => void;
  onShuffle: () => void;
  onSelectTrack?: (track: Track, index: number) => void;
  isPlaying?: boolean;
  currentTrackId?: string;
  isFavorite?: (trackId: string) => boolean;
  onToggleFavorite?: (trackId: string) => void;
  onRemoveTrack?: (track: Track) => void;
  artworkUri?: string;
  /** Rendered under the header buttons (provider attribution, save actions). */
  /** Extra header actions (rename, delete, add tracks…). */
  extraActions?: ReactNode;
  /** Additional content between the header and the track list. */
  children?: ReactNode;
  emptyMessage?: string;
}

/**
 * One detail view for every track-backed collection.
 *
 * Album, artist, genre, mood and curated-collection sheets share this layout,
 * so play/shuffle semantics and the track list never diverge between screens.
 */
export function TrackCollectionSheet({
  visible,
  onClose,
  title,
  subtitle,
  description,
  palette,
  tracks,
  onPlay,
  onShuffle,
  onSelectTrack,
  isPlaying = false,
  currentTrackId,
  isFavorite,
  onToggleFavorite,
  onRemoveTrack,
  artworkUri,
  extraActions,
  children,
  emptyMessage = 'Nothing here yet.',
}: TrackCollectionSheetProps) {
  const theme = useTheme();
  const canPlay = tracks.length > 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        <Artwork
          palette={palette}
          uri={artworkUri}
          size={84}
          cornerRadius={theme.radius.card}
        />
        <View style={{ flex: 1, gap: theme.spacing.sm, minWidth: 0 }}>
          {description ? (
            <Text variant="secondary" tone="secondary" numberOfLines={3}>
              {description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <PrimaryButton label="Play" icon="play" size="sm" disabled={!canPlay} onPress={onPlay} />
            <SecondaryButton
              label="Shuffle"
              icon="shuffle"
              size="sm"
              disabled={!canPlay}
              onPress={onShuffle}
            />
            {extraActions}
          </View>
        </View>
      </View>

      {children}

      <View style={{ gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="label" tone="tertiary">
            TRACKS
          </Text>
          <Text variant="caption" tone="tertiary">
            {tracks.length}
          </Text>
        </View>

        {tracks.length === 0 ? (
          <Text variant="secondary" tone="secondary" style={{ paddingVertical: theme.spacing.md }}>
            {emptyMessage}
          </Text>
        ) : (
          tracks.map((track, index) => (
            <View key={track.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TrackRow
                  track={track}
                  index={index + 1}
                  isCurrent={currentTrackId === track.id}
                  isPlaying={isPlaying && currentTrackId === track.id}
                  isFavorite={isFavorite?.(track.id) ?? false}
                  showAlbum
                  divider={index > 0}
                  onPress={
                    onSelectTrack ? () => onSelectTrack(track, index) : undefined
                  }
                  onToggleFavorite={
                    onToggleFavorite ? () => onToggleFavorite(track.id) : undefined
                  }
                />
              </View>
              {onRemoveTrack ? (
                <IconButton
                  icon="remove-circle-outline"
                  label={`Remove ${track.title} from playlist`}
                  size="sm"
                  onPress={() => onRemoveTrack(track)}
                />
              ) : null}
            </View>
          ))
        )}
      </View>
    </Sheet>
  );
}
