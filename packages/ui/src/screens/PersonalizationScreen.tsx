import { useAuth } from '@lavender/backend';
import { useTheme } from '@lavender/design-system';
import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  historyTrack,
  listeningTrendLabel,
  searchHistory,
  type ListeningHistoryEntry,
} from '@lavender/personalization';
import { formatDuration, type Track } from '@lavender/shared';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Switch, TextInput, View } from 'react-native';

import { Artwork } from '../Artwork';
import { Icon } from '../Icon';
import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Interactive } from '../interaction/Interactive';
import { usePersonalization } from '../personalization/PersonalizationProvider';
import { PersonalizedSections } from '../personalization/PersonalizedSections';
import { Screen } from '../Screen';
import { SectionHeader } from '../SectionHeader';
import { Surface } from '../Surface';
import { useSync } from '../SyncHost';
import { Text } from '../Text';

type ConfirmAction = 'clear' | 'reset' | null;

function formatPlayedAt(value: string, compact = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(
    undefined,
    compact
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 2, minWidth: 132 }}>
      <Text variant="label" tone="tertiary">
        {label.toUpperCase()}
      </Text>
      <Text variant="headline">{value}</Text>
      <View
        style={{
          height: 3,
          width: 24,
          borderRadius: 2,
          backgroundColor: theme.colors.accentSoft,
          marginTop: theme.spacing.xs,
        }}
      />
    </View>
  );
}

function HistoryRow({ entry }: { entry: ListeningHistoryEntry }) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const library = useLibrary();
  const player = usePlayer();
  const track: Track = library.trackById(entry.trackId) ?? historyTrack(entry);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        borderTopWidth: theme.border.hairline,
        borderTopColor: theme.colors.divider,
        paddingVertical: theme.spacing.sm,
      }}>
      <Interactive
        onPress={() => player.play(track, [track])}
        accessibilityLabel={`Play ${entry.title} by ${entry.artistName}`}
        focusRadius={theme.radius.sm}
        style={{ flex: 1 }}>
        {({ hovered }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: 2,
              borderRadius: theme.radius.sm,
              backgroundColor: hovered ? theme.colors.hover : 'transparent',
            }}>
            <Artwork
              palette={entry.palette}
              uri={entry.artworkUri}
              size={38}
              cornerRadius={8}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
              <Text variant="headline" numberOfLines={1}>
                {entry.title}
              </Text>
              <Text variant="secondary" tone="secondary" numberOfLines={1}>
                {entry.artistName} · {entry.source === 'online' ? 'Online' : 'Local'} ·{' '}
                {formatPlayedAt(entry.playedAt, breakpoint === 'compact')}
              </Text>
            </View>
          </View>
        )}
      </Interactive>
      <Text variant="playback" tone="tertiary">
        {formatDuration(entry.listenedSec)}
      </Text>
      <IconButton
        icon="trash-outline"
        label={`Delete ${entry.title} from listening history`}
        size="sm"
        onPress={() => library.deleteHistoryEntry(entry.id)}
      />
    </View>
  );
}

/** History, taste, recommendations and every privacy control in one place. */
export function PersonalizationScreen() {
  const theme = useTheme();
  const library = useLibrary();
  const personal = usePersonalization();
  const auth = useAuth();
  const sync = useSync();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const filteredHistory = useMemo(
    () => searchHistory(personal.history, query),
    [personal.history, query],
  );
  const topArtist = personal.profile.artists[0];
  const topGenre = personal.profile.genres[0];
  const signedIn = Boolean(auth.user);

  return (
    <Screen
      eyebrow="PERSONALIZATION"
      title="Your listening, in your hands"
      subtitle="Recommendations are built on this device from what you actually play. Your audio files are never uploaded."
      actions={
        <>
          <SecondaryButton
            label="Refresh recommendations"
            icon="refresh"
            size="sm"
            disabled={!personal.enabled}
            onPress={personal.refresh}
          />
          <SecondaryButton
            label="Account & sync"
            icon="person-circle-outline"
            size="sm"
            onPress={() => router.navigate('/account')}
          />
        </>
      }>
      <Surface bordered padding="lg" style={{ gap: theme.spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            flexWrap: 'wrap',
          }}>
          <View style={{ flex: 1, minWidth: 220, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="sparkles-outline" size={19} color={theme.colors.accent} />
              <Text variant="headline">Personalized recommendations</Text>
            </View>
            <Text variant="secondary" tone="secondary">
              {library.personalizationEnabled
                ? 'On. Listening history feeds your taste profile and Home recommendations.'
                : 'Off. No new listening is recorded and no recommendations are generated.'}
            </Text>
          </View>
          <Switch
            value={library.personalizationEnabled}
            onValueChange={library.setPersonalizationEnabled}
            accessibilityLabel="Personalized recommendations"
            trackColor={{ false: theme.colors.surfaceStrong, true: theme.colors.accentSoft }}
            thumbColor={
              library.personalizationEnabled ? theme.colors.accent : theme.colors.textTertiary
            }
          />
        </View>
        <Text variant="caption" tone="tertiary">
          {signedIn
            ? `History sync is ${sync.status === 'syncing' ? 'running' : 'available'} for ${auth.user?.email}. Only track metadata and play counts sync; audio never does.`
            : 'You are listening as a guest. History stays on this device until you sign in to sync metadata, and local playback works offline either way.'}
        </Text>
      </Surface>

      {personal.enabled ? (
        <>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xl }}>
        <Stat label="Listens" value={String(personal.profile.totalPlays)} />
        <Stat label="Last 7 days" value={String(personal.profile.trend.recentPlays)} />
        <Stat label="Top artist" value={topArtist?.name ?? 'Not enough data'} />
        <Stat label="Top genre" value={topGenre?.name ?? 'Not enough data'} />
      </View>

      <Surface bordered padding="lg" style={{ gap: theme.spacing.md }}>
        <SectionHeader
          title="Music taste profile"
          subtitle={listeningTrendLabel(personal.profile)}
        />
        {personal.profile.hasHistory ? (
          <View style={{ gap: theme.spacing.lg }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" tone="tertiary">
                ARTISTS YOU PLAY
              </Text>
              {personal.profile.artists.slice(0, 5).map((artist, index) => (
                <View
                  key={artist.name}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Text variant="playback" tone="tertiary" style={{ width: 18 }}>
                    {index + 1}
                  </Text>
                  <Text variant="secondary" numberOfLines={1} style={{ flex: 1 }}>
                    {artist.name}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {artist.plays} {artist.plays === 1 ? 'play' : 'plays'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
              {personal.profile.genres.slice(0, 4).map((genre) => (
                <View
                  key={genre.name}
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: 6,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.accentSubtle,
                  }}>
                  <Text variant="caption" tone="accent">
                    {genre.name} · {genre.sharePct}%
                  </Text>
                </View>
              ))}
            </View>

            {personal.profile.moods.length > 0 ? (
              <Text variant="secondary" tone="secondary">
                Moods in your history: {personal.profile.moods.slice(0, 3).map((mood) => mood.name).join(', ')}
              </Text>
            ) : null}

            <Text variant="caption" tone="tertiary">
              {personal.profile.favoriteCount} saved favorite
              {personal.profile.favoriteCount === 1 ? '' : 's'}
              {personal.profile.playlists.length > 0
                ? ` · Most played playlist: ${personal.profile.playlists[0]?.name}`
                : ' · Play a playlist to see it here'}
            </Text>
          </View>
        ) : (
          <Text variant="secondary" tone="secondary">
            There is no taste profile yet. Play a track for roughly 6–30 seconds and it will
            appear here. We never invent listening data.
          </Text>
        )}
      </Surface>
        </>
      ) : (
        <Surface bordered padding="lg" style={{ gap: theme.spacing.sm }}>
          <Text variant="headline">Taste profile paused</Text>
          <Text variant="secondary" tone="secondary">
            Personalization is off, so your history is not being analyzed and these stats are
            hidden. Existing sessions remain below until you delete them.
          </Text>
        </Surface>
      )}

      <View style={{ gap: theme.spacing.md }}>
        <SectionHeader
          title="Your recommendations"
          subtitle="Each row names the real signal it came from"
        />
        <PersonalizedSections />
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <SectionHeader
          title="Listening history"
          subtitle={`${personal.history.length} session${personal.history.length === 1 ? '' : 's'} on this device`}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title, artist, album, genre or mood"
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel="Search listening history"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.text,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 10,
          }}
        />
        {filteredHistory.length > 0 ? (
          <Surface bordered padding="sm">
            {filteredHistory.slice(0, 50).map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </Surface>
        ) : (
          <Surface bordered padding="lg">
            <Text variant="secondary" tone="secondary">
              {personal.history.length === 0
                ? 'Nothing here yet. History starts after a track crosses the listening threshold.'
                : 'No sessions match that search.'}
            </Text>
          </Surface>
        )}
        {personal.history.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            {confirmAction === 'clear' ? (
              <>
                <SecondaryButton
                  label="Confirm delete all history"
                  icon="trash-outline"
                  size="sm"
                  onPress={() => {
                    library.clearListeningHistory();
                    setConfirmAction(null);
                  }}
                />
                <SecondaryButton
                  label="Cancel"
                  size="sm"
                  onPress={() => setConfirmAction(null)}
                />
              </>
            ) : (
              <SecondaryButton
                label="Delete all history"
                icon="trash-outline"
                size="sm"
                onPress={() => setConfirmAction('clear')}
              />
            )}
          </View>
        ) : null}
      </View>

      <Surface bordered padding="lg" style={{ gap: theme.spacing.md }}>
        <SectionHeader
          title="Privacy and data control"
          subtitle="You decide what personalization is allowed to remember"
        />
        <Text variant="secondary" tone="secondary">
          Lavender never uploads local audio for analysis and never infers sensitive personal
          information. When personalization is off, new listening is not recorded and history is not
          used to build recommendations. Existing history stays until you delete it.
        </Text>
        <Text variant="caption" tone="tertiary">
          Deleting history also clears the taste profile. Resetting the taste profile does the
          same but leaves your favorites, playlists and the on/off setting alone.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <SecondaryButton
              label="Reset taste profile"
              icon="refresh"
              size="sm"
              onPress={() => setConfirmAction('reset')}
            />
            <SecondaryButton
              label="Open account"
              icon="person-circle-outline"
              size="sm"
              onPress={() => router.navigate('/account')}
            />
          </View>
        </ScrollView>
        {confirmAction === 'reset' ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <PrimaryButton
              label="Confirm reset"
              icon="refresh"
              size="sm"
              onPress={() => {
                library.resetTasteProfile();
                setConfirmAction(null);
              }}
            />
            <SecondaryButton
              label="Cancel"
              size="sm"
              onPress={() => setConfirmAction(null)}
            />
          </View>
        ) : null}
      </Surface>
    </Screen>
  );
}
