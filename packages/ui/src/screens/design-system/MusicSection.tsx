import { useTheme } from '@lavender/design-system';
import { demoCatalog } from '@lavender/music-library';
import { formatDuration } from '@lavender/shared';
import { useState } from 'react';
import { View } from 'react-native';

import { GlassMiniPlayer } from '../../GlassMiniPlayer';
import { gridColumns, useBreakpoint } from '../../hooks/useBreakpoint';
import { AlbumCard } from '../../music/AlbumCard';
import { ArtistCard } from '../../music/ArtistCard';
import { PlaylistCard } from '../../music/PlaylistCard';
import { TrackRow } from '../../music/TrackRow';
import { PlaybackProgress } from '../../PlaybackProgress';
import { Surface } from '../../Surface';
import { Text } from '../../Text';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

const noop = () => undefined;
const DEMO_DURATION = 245;

/** Music cards, rows, progress and the mini player. */
export function MusicSection() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const columns = Math.min(gridColumns(breakpoint), 4);

  const [favorites, setFavorites] = useState<string[]>(['tr-soft-focus']);
  const [playingId, setPlayingId] = useState<string | null>('tr-soft-focus');
  const [progress, setProgress] = useState(0.32);
  const [isPlaying, setIsPlaying] = useState(false);

  const tracks = demoCatalog.tracks.slice(0, 4);
  const nowPlaying = tracks[0];
  const playlist = demoCatalog.playlists[0];
  const artist = demoCatalog.artists[0];

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <ShowcaseSection
      title="Music UI"
      description="Artwork stays square (only artists are circular). Rows, cards and players share one typography and interaction language.">
      <View style={{ gap: theme.spacing.xl }}>
        <View>
          <SpecimenLabel>Cards</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8 }}>
            {demoCatalog.albums.slice(0, 2).map((album) => (
              <View key={album.id} style={{ width: `${100 / columns}%`, padding: 8 }}>
                <AlbumCard album={album} showYear onPress={noop} />
              </View>
            ))}
            {playlist ? (
              <View style={{ width: `${100 / columns}%`, padding: 8 }}>
                <PlaylistCard playlist={playlist} onPress={noop} />
              </View>
            ) : null}
            {artist ? (
              <View style={{ width: `${100 / columns}%`, padding: 8 }}>
                <ArtistCard artist={artist} onPress={noop} />
              </View>
            ) : null}
          </View>
        </View>

        <View>
          <SpecimenLabel>Track rows (tap a row, toggle a heart)</SpecimenLabel>
          <Surface tone="muted" padding="sm" bordered>
            {tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index + 1}
                showAlbum
                divider={index > 0}
                isPlaying={playingId === track.id}
                isFavorite={favorites.includes(track.id)}
                onPress={() => setPlayingId(track.id)}
                onToggleFavorite={() => toggleFavorite(track.id)}
              />
            ))}
          </Surface>
        </View>

        <View>
          <SpecimenLabel>Playback progress</SpecimenLabel>
          <View style={{ gap: theme.spacing.md, maxWidth: 420 }}>
            <PlaybackProgress value={progress} />
            <PlaybackProgress value={progress} variant="standard" onSeek={setProgress} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="playback" tone="tertiary">
                {formatDuration(progress * DEMO_DURATION)}
              </Text>
              <Text variant="playback" tone="tertiary">
                {formatDuration(DEMO_DURATION)}
              </Text>
            </View>
            <Text variant="playback" tone="tertiary">
              Tap the standard track to seek — the fill and handle follow.
            </Text>
          </View>
        </View>

        <View>
          <SpecimenLabel>Mini player</SpecimenLabel>
          <View style={{ maxWidth: 420 }}>
            {nowPlaying ? (
              <GlassMiniPlayer
                title={nowPlaying.title}
                artist={nowPlaying.artistName}
                palette={nowPlaying.palette}
                isPlaying={isPlaying}
                progress={progress}
                isFavorite={favorites.includes(nowPlaying.id)}
                onTogglePlay={() => setIsPlaying((value) => !value)}
                onNext={() => setProgress(0)}
                onToggleFavorite={() => toggleFavorite(nowPlaying.id)}
                onSeek={setProgress}
              />
            ) : null}
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}
