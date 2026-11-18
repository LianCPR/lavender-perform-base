import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import type { Track } from '@lavender/shared';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { ArtworkCard } from '../ArtworkCard';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { TrackRow } from '../music/TrackRow';
import { usePersonalization } from './PersonalizationProvider';

const CARD_WIDTH = { compact: 148, medium: 164, expanded: 180, wide: 188 };

/**
 * Personalized Home rows. Every row is dismissible and the copy names the real
 * signal behind it; no section claims personalization before history exists.
 */
export function PersonalizedSections() {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const library = useLibrary();
  const player = usePlayer();
  const personal = usePersonalization();
  const router = useRouter();

  const playQueue = (tracks: Track[], track: Track) => {
    if (tracks.some((item) => item.provider)) library.cacheOnlineTracks(tracks);
    library.recordPlayed(track.id);
    player.play(track, tracks);
  };

  if (!personal.enabled) {
    return (
      <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
        <Text variant="headline">Personalization is off</Text>
        <Text variant="secondary" tone="secondary">
          Your listening is not recorded and recommendations are hidden. Local playback and your
          library keep working.
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <SecondaryButton
            label="Turn on"
            icon="sparkles-outline"
            size="sm"
            onPress={() => library.setPersonalizationEnabled(true)}
          />
          <SecondaryButton
            label="Manage data"
            icon="options-outline"
            size="sm"
            onPress={() => router.navigate('/personalization')}
          />
        </View>
      </Surface>
    );
  }

  const hiddenAll = personal.model.sections.length === 0 && personal.dismissed.length > 0;
  const showDailyMixes =
    personal.model.dailyMixes.length > 0 && !personal.dismissed.includes('daily-mixes');
  const hasContent =
    personal.model.sections.length > 0 ||
    showDailyMixes ||
    personal.model.playlists.length > 0;

  if (!hasContent) {
    return hiddenAll ? (
      <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
        <Text variant="headline">Recommendations are hidden</Text>
        <Text variant="secondary" tone="secondary">
          You dismissed every personal row on Home. You can bring them back.
        </Text>
        <SecondaryButton
          label="Restore suggestions"
          icon="refresh"
          size="sm"
          onPress={personal.restoreAll}
        />
      </Surface>
    ) : null;
  }

  return (
    <View style={{ gap: theme.spacing.xl }}>
      {personal.model.sections.map((section) => (
        <View key={section.id} style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title={section.title}
            subtitle={section.subtitle}
            actionLabel="Hide"
            onActionPress={() => personal.dismiss(section.id)}
          />
          <Surface bordered padding="sm">
            {section.tracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                divider={index > 0}
                showAlbum
                isCurrent={player.currentTrack?.id === track.id}
                isPlaying={player.isPlaying && player.currentTrack?.id === track.id}
                isFavorite={library.isFavorite(track.id)}
                isSaved={library.isSavedOnlineTrack(track.id)}
                onPress={() => playQueue(section.tracks, track)}
                onToggleFavorite={() => library.toggleFavorite(track.id)}
                onToggleSave={
                  track.provider ? () => library.toggleOnlineTrackSaved(track) : undefined
                }
              />
            ))}
          </Surface>
        </View>
      ))}

      {personal.model.playlists.length > 0 ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Playlists that fit"
            subtitle="Your own playlists, matched by the artists and genres you play"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
            {personal.model.playlists.map(({ playlist, reason }) => (
              <ArtworkCard
                key={playlist.id}
                title={playlist.name}
                subtitle={reason}
                palette={playlist.palette}
                width={CARD_WIDTH[breakpoint]}
                onPress={() => {
                  const tracks = library.tracksForPlaylist(playlist);
                  const first = tracks[0];
                  if (first) playQueue(tracks, first);
                }}
                accessibilityLabel={`Play ${playlist.name}`}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {showDailyMixes ? (
        <View style={{ gap: theme.spacing.md }}>
          <SectionHeader
            title="Daily mixes"
            subtitle="Built from your listening and refreshed each day"
            actionLabel="Refresh"
            onActionPress={personal.refresh}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.lg, paddingRight: theme.spacing.sm }}>
            {personal.model.dailyMixes.map((mix) => (
              <ArtworkCard
                key={mix.id}
                title={mix.title}
                subtitle={mix.subtitle}
                palette={mix.palette}
                width={CARD_WIDTH[breakpoint]}
                onPress={() => {
                  const first = mix.tracks[0];
                  if (first) playQueue(mix.tracks, first);
                }}
                accessibilityLabel={`Play ${mix.title}`}
              />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row' }}>
            <SecondaryButton
              label="Hide daily mixes"
              icon="eye-off-outline"
              size="sm"
              onPress={() => personal.dismiss('daily-mixes')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
