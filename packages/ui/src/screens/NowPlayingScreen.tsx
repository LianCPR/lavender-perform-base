import { useReducedMotion, useTheme } from '@lavender/design-system';
import { formatDuration } from '@lavender/shared';
import { demoLyrics, useLibrary, type MockLyricLine } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
  type RefObject,
} from 'react';
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { GlassSurface } from '../GlassSurface';
import { Icon, type IconName } from '../Icon';
import { Interactive } from '../interaction/Interactive';
import { PlaybackProgress } from '../PlaybackProgress';
import { Screen } from '../Screen';
import { Surface } from '../Surface';
import { Text } from '../Text';
import { useBreakpoint } from '../hooks/useBreakpoint';
import {
  beginNowPlayingCollapse,
  cancelNowPlayingTransition,
  registerHeroArtworkRect,
  useNowPlayingTransition,
} from '../motion/NowPlayingTransition';
import { TrackRow } from '../music/TrackRow';
import { withAlpha } from '../utils/color';

type PlayerPanel = 'queue' | 'lyrics';

/** The full listening view consumes the same player context as the Home mini player. */
export function NowPlayingScreen() {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const breakpoint = useBreakpoint();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const player = usePlayer();
  const library = useLibrary();
  const [panel, setPanel] = useState<PlayerPanel>('queue');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const artworkMotion = useRef(new Animated.Value(1)).current;
  const panelOpacity = useRef(new Animated.Value(1)).current;
  const panelShift = useRef(new Animated.Value(1)).current;
  const lyricScroll = useRef<ScrollViewInstance | null>(null);
  const lyricOffsets = useRef<number[]>([]);
  const currentTrack = player.currentTrack;
  const isWide = breakpoint === 'expanded' || breakpoint === 'wide';
  // Phones trade 20px of cover for a first paint that includes the Up Next /
  // Lyrics tabs, so the page reads as a complete player rather than a scroll.
  const artworkSize = Math.min(
    isWide ? 420 : breakpoint === 'medium' ? 360 : 260,
    Math.max(240, windowWidth - (isWide ? 600 : 48)),
  );
  const progress = player.durationSec > 0 ? player.positionSec / player.durationSec : 0;
  // Five transport controls plus a 64px play button only just exceed a 320px
  // phone's content column, so compact tightens the gaps and the primary button.
  const transportGap = breakpoint === 'compact' ? theme.spacing.sm : theme.spacing.md;
  const playSize = breakpoint === 'compact' ? 60 : 64;
  const isFavorite = currentTrack ? library.isFavorite(currentTrack.id) : false;
  const lyrics = currentTrack ? demoLyrics[currentTrack.id] : undefined;

  // Shared geometry with the mini player: this cover's real window rect is what
  // the expansion overlay flies to.
  const transition = useNowPlayingTransition();
  const heroRef = useRef<ComponentRef<typeof View> | null>(null);
  const measureHero = useCallback(() => {
    heroRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      if (width > 0 && height > 0) registerHeroArtworkRect({ x, y, width, height });
    });
  }, []);
  // Leaving mid-flight must never strand the overlay above the next screen.
  useEffect(() => () => cancelNowPlayingTransition(), []);

  const queueIndex = currentTrack
    ? player.queue.findIndex((track) => track.id === currentTrack.id)
    : -1;
  const upcomingIndices = useMemo(() => {
    if (queueIndex < 0) return player.queue.map((_, index) => index);
    const upcoming = player.queue.map((_, index) => index).filter((index) => index > queueIndex);
    if (player.repeat === 'all') {
      upcoming.push(...player.queue.map((_, index) => index).filter((index) => index < queueIndex));
    }
    return upcoming;
  }, [player.queue, player.repeat, queueIndex]);

  const activeLyricIndex = lyrics?.reduce(
    (active, line, index) => (line.timeSec <= player.positionSec ? index : active),
    -1,
  ) ?? -1;

  useEffect(() => {
    if (reducedMotion) {
      artworkMotion.setValue(1);
      return;
    }
    artworkMotion.setValue(0.94);
    const animation = Animated.spring(artworkMotion, {
      toValue: 1,
      damping: 19,
      stiffness: 150,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [artworkMotion, currentTrack?.id, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      panelOpacity.setValue(1);
      return;
    }
    // A panel change is a small materialization, not a page swap: it rises 8px
    // and resolves while the outgoing content is already gone.
    panelOpacity.setValue(0.55);
    panelShift.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: theme.motion.slow,
        easing: Easing.bezier(...theme.motion.easingBezier.materialize),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(panelShift, {
        toValue: 1,
        overshootClamping: true,
        useNativeDriver: Platform.OS !== 'web',
        ...theme.motion.spring.settle,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [panel, panelOpacity, panelShift, reducedMotion, theme.motion]);

  useEffect(() => {
    if (activeLyricIndex < 0) return;
    const y = lyricOffsets.current[activeLyricIndex];
    if (y !== undefined) {
      lyricScroll.current?.scrollTo({ y: Math.max(0, y - 72), animated: !reducedMotion });
    }
  }, [activeLyricIndex, currentTrack?.id, reducedMotion]);

  const playAlbum = useCallback(() => {
    if (!currentTrack) return;
    const albumTracks = library.tracksForAlbum(currentTrack.albumId);
    const selected = albumTracks.find((track) => track.id === currentTrack.id) ?? albumTracks[0];
    if (selected) player.play(selected, albumTracks);
    setOptionsOpen(false);
  }, [currentTrack, library, player]);

  const openPanel = (nextPanel: PlayerPanel) => {
    setPanel(nextPanel);
    setOptionsOpen(false);
  };

  if (!currentTrack) {
    return (
      <Screen eyebrow="NOW PLAYING" title="Choose something to play" subtitle="Your listening space is ready.">
        <Surface bordered padding="xl" style={{ alignItems: 'center' }}>
          <Text variant="callout" tone="secondary" style={{ textAlign: 'center' }}>
            Select a track with an audio file, or import your own music to start listening.
          </Text>
          <View style={{ height: theme.spacing.md }} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <PrimaryButton label="Import music" icon="cloud-upload-outline" onPress={() => router.navigate('/library')} />
            <SecondaryButton label="Browse" icon="compass-outline" onPress={() => router.navigate('/browse')} />
          </View>
        </Surface>
      </Screen>
    );
  }

  // The cover's palette bleeds into the canvas behind everything else: a single
  // soft wash from the top, thin enough that the neutral base still reads.
  const paletteDeep = theme.artwork[currentTrack.palette][1];
  const wash = theme.isDark ? 0.18 : 0.13;

  return (
    <View style={{ flex: 1 }}>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <LinearGradient
          colors={[withAlpha(paletteDeep, wash), withAlpha(paletteDeep, wash * 0.4), withAlpha(paletteDeep, 0)]}
          locations={[0, 0.3, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      </View>

      <Screen
        eyebrow="NOW PLAYING"
        title="Now Playing"
        subtitle={breakpoint === 'compact' ? undefined : 'Your listening space, in one place.'}
        actions={
          <SecondaryButton
            label="Back to Home"
            icon="chevron-back"
            size="sm"
            onPress={() => {
              // Falls back to a direct navigation when motion is reduced or the
              // mini player has never been measured.
              beginNowPlayingCollapse({
                palette: currentTrack.palette,
                uri: currentTrack.artworkUri,
                trackId: currentTrack.id,
              });
            }}
          />
        }
        // The compact shell hides its tab bar here, so the page only needs a
        // small tail instead of the usual floating-chrome clearance.
        contentStyle={{ paddingBottom: breakpoint === 'compact' ? 32 : 170 }}>
      {player.error ? (
        <Surface bordered padding="md" style={{ backgroundColor: theme.colors.dangerSubtle }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Icon name="alert-circle-outline" size={20} color={theme.colors.danger} />
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <Text variant="headline" style={{ color: theme.colors.danger }}>
                Playback error
              </Text>
              <Text variant="secondary" tone="secondary">
                {player.error}
              </Text>
            </View>
            {currentTrack.provider ? (
              <SecondaryButton
                label="Try again"
                icon="refresh"
                size="sm"
                onPress={player.togglePlayback}
              />
            ) : (
              <SecondaryButton
                label="Import"
                icon="cloud-upload-outline"
                size="sm"
                onPress={() => router.navigate('/library')}
              />
            )}
          </View>
        </Surface>
      ) : null}

      <View
        style={{
          flexDirection: isWide ? 'row' : 'column',
          alignItems: isWide ? 'flex-start' : 'center',
          gap: theme.spacing.xl,
        }}>
        <View
          style={{
            flex: isWide ? 1 : undefined,
            width: isWide ? undefined : '100%',
            alignItems: 'center',
            gap: breakpoint === 'compact' ? theme.spacing.md : theme.spacing.lg,
          }}>
          <Animated.View
            accessibilityLabel={currentTrack.albumTitle + ' album artwork'}
            style={[
              {
                width: '100%',
                maxWidth: artworkSize,
                aspectRatio: 1,
                borderRadius: theme.radius.card,
                overflow: 'hidden',
                ...theme.elevation.medium,
              },
              { transform: [{ scale: artworkMotion }] },
              // Hidden while the overlay cover is still in flight, so there is
              // exactly one cover on screen at any moment.
              { opacity: transition.hideHero ? 0 : 1 },
            ]}>
            <View ref={heroRef} onLayout={measureHero} style={StyleSheet.absoluteFill}>
              <Artwork
                palette={currentTrack.palette}
                uri={currentTrack.artworkUri}
                style={{ width: '100%', height: '100%', borderRadius: theme.radius.card }}
              />
            </View>
          </Animated.View>

          <View style={{ width: '100%', maxWidth: artworkSize, gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xxs }}>
                <Text variant="sectionHeading" numberOfLines={1}>{currentTrack.title}</Text>
                <Text variant="callout" tone="secondary" numberOfLines={1}>{currentTrack.artistName}</Text>
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {currentTrack.albumTitle}
                  {currentTrack.provider
                    ? ` · ${currentTrack.provider.toUpperCase()} · Authorized stream`
                    : currentTrack.audio?.format
                      ? ` · ${currentTrack.audio.format.toUpperCase()}`
                      : ' · No audio file'}
                </Text>
                {currentTrack.provider ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                    <Icon name="globe-outline" size={13} color={theme.colors.textTertiary} />
                    <Text variant="caption" tone="tertiary">
                      Streaming from {currentTrack.provider}
                    </Text>
                    {currentTrack.externalUrl ? (
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel="Open the original track at the provider"
                        onPress={() => {
                          const url = currentTrack.externalUrl;
                          if (url) void Linking.openURL(url).catch(() => undefined);
                        }}>
                        <Text variant="caption" tone="accent" style={{ fontWeight: '600' }}>
                          Open original
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
              <IconButton
                icon={isFavorite ? 'heart' : 'heart-outline'}
                label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                selected={isFavorite}
                size="lg"
                onPress={() => library.toggleFavorite(currentTrack.id)}
              />
              <IconButton
                icon="ellipsis-horizontal"
                label="More track options"
                size="lg"
                onPress={() => setOptionsOpen(true)}
              />
            </View>

            <View style={{ gap: theme.spacing.xs }}>
              <PlaybackProgress
                value={progress}
                variant="standard"
                onSeek={player.seekToFraction}
                accessibilityLabel="Seek through track"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="numeric" tone="tertiary">{formatDuration(player.positionSec)}</Text>
                <Text variant="numeric" tone="tertiary">{formatDuration(player.durationSec)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: transportGap }}>
              <IconButton
                icon="shuffle"
                label={player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'}
                selected={player.shuffle}
                size="lg"
                onPress={player.toggleShuffle}
              />
              <IconButton icon="play-skip-back" label="Previous track" size="lg" onPress={player.previous} />
              <Interactive
                accessibilityLabel={player.isPlaying ? 'Pause' : 'Play'}
                onPress={player.togglePlayback}
                pressedScale={0.94}
                style={{ width: playSize, height: playSize, borderRadius: theme.radius.pill }}>
                {({ hovered }) => (
                  <View
                    style={{
                      width: playSize,
                      height: playSize,
                      borderRadius: theme.radius.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.colors.text,
                      opacity: hovered ? 0.88 : 1,
                    }}>
                    <Icon
                      name={player.isPlaying ? 'pause' : 'play'}
                      size={breakpoint === 'compact' ? 23 : 25}
                      color={theme.colors.background}
                    />
                  </View>
                )}
              </Interactive>
              <IconButton icon="play-skip-forward" label="Next track" size="lg" onPress={player.next} />
              <IconButton
                icon="repeat"
                label={'Repeat ' + player.repeat}
                selected={player.repeat !== 'off'}
                size="lg"
                onPress={player.cycleRepeat}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon name="volume-low" size={16} color={theme.colors.textTertiary} />
              <View style={{ flex: 1 }}>
                <PlaybackProgress
                  value={player.volume}
                  variant="thin"
                  onSeek={player.setVolume}
                  accessibilityLabel="Volume"
                />
              </View>
              <Icon name="volume-high" size={16} color={theme.colors.textTertiary} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.lg }}>
              <Text variant="caption" tone={player.shuffle ? 'accent' : 'tertiary'}>
                {player.shuffle ? 'Shuffle on' : 'Shuffle off'}
              </Text>
              <Text variant="caption" tone="tertiary">
                {player.repeat === 'one' ? 'Repeat one' : player.repeat === 'all' ? 'Repeat all' : 'Repeat off'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ flex: isWide ? 1 : undefined, width: isWide ? undefined : '100%', minWidth: 0 }}>
          <Surface
            bordered
            padding={breakpoint === 'compact' ? 'sm' : 'md'}
            style={{ height: breakpoint === 'compact' ? 440 : 540, gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <PanelTab active={panel === 'queue'} icon="list-outline" label="Up Next" onPress={() => setPanel('queue')} />
              <PanelTab active={panel === 'lyrics'} icon="musical-notes-outline" label="Lyrics" onPress={() => setPanel('lyrics')} />
              {panel === 'queue' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginLeft: 'auto' }}>
                  <Text variant="caption" tone="tertiary">
                    {upcomingIndices.length + 1} tracks
                  </Text>
                  {player.queue.length > 0 ? (
                    <IconButton
                      icon="trash-outline"
                      label="Clear queue"
                      size="sm"
                      onPress={player.clearQueue}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            <Animated.View
              style={{
                flex: 1,
                opacity: panelOpacity,
                transform: [
                  {
                    translateY: panelShift.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                  },
                  {
                    scale: panelShift.interpolate({ inputRange: [0, 1], outputRange: [0.99, 1] }),
                  },
                ],
              }}>
              {panel === 'queue' ? (
                <QueuePanel
                  currentTrack={currentTrack}
                  currentIndex={queueIndex}
                  upcomingIndices={upcomingIndices}
                  queue={player.queue}
                  isPlaying={player.isPlaying}
                  shuffle={player.shuffle}
                  isFavorite={library.isFavorite}
                  onSelect={player.selectQueueTrack}
                  onMove={player.moveQueueItem}
                  onRemove={player.removeQueueItem}
                  onToggleFavorite={library.toggleFavorite}
                />
              ) : (
                <LyricsPanel
                  lyricScroll={lyricScroll}
                  lyricOffsets={lyricOffsets}
                  lyrics={lyrics}
                  activeIndex={activeLyricIndex}
                  onSeek={(timeSec) => {
                    if (player.durationSec > 0) player.seekToFraction(timeSec / player.durationSec);
                  }}
                />
              )}
            </Animated.View>
          </Surface>
        </View>
      </View>

      <Modal
        visible={optionsOpen}
        transparent
        animationType={reducedMotion ? 'none' : 'fade'}
        statusBarTranslucent
        onRequestClose={() => setOptionsOpen(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
            backgroundColor: theme.colors.scrim,
          }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close track options"
            onPress={() => setOptionsOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <GlassSurface
            material="overlay"
            cornerRadius={theme.radius.card}
            style={{ width: '100%', maxWidth: 420, padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ gap: 2, flex: 1 }}>
                <Text variant="subheading">Track options</Text>
                <Text variant="caption" tone="secondary" numberOfLines={1}>
                  {currentTrack.title + ' · ' + currentTrack.albumTitle}
                </Text>
              </View>
              <IconButton icon="close" label="Close options" onPress={() => setOptionsOpen(false)} />
            </View>
            <PrimaryButton label="Play this album" icon="play" onPress={playAlbum} />
            <SecondaryButton label="View Up Next" icon="list-outline" onPress={() => openPanel('queue')} />
            <SecondaryButton label="View lyrics" icon="musical-notes-outline" onPress={() => openPanel('lyrics')} />
          </GlassSurface>
        </View>
        </Modal>
      </Screen>
    </View>
  );
}

function PanelTab({
  active,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Interactive
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      focusRadius={theme.radius.control}
      style={{ flex: 1, borderRadius: theme.radius.control }}>
      {({ hovered }) => (
        <View
          style={{
            minHeight: 40,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.xs,
            borderRadius: theme.radius.control,
            backgroundColor: active ? theme.colors.surfaceMuted : hovered ? theme.colors.hover : 'transparent',
          }}>
          <Icon name={icon} size={16} color={active ? theme.colors.text : theme.colors.textTertiary} />
          <Text variant="caption" style={{ fontWeight: active ? '600' : '500' }}>{label}</Text>
        </View>
      )}
    </Interactive>
  );
}

function QueuePanel({
  currentTrack,
  currentIndex,
  upcomingIndices,
  queue,
  isPlaying,
  shuffle,
  isFavorite,
  onSelect,
  onMove,
  onRemove,
  onToggleFavorite,
}: {
  currentTrack: NonNullable<ReturnType<typeof usePlayer>['currentTrack']>;
  currentIndex: number;
  upcomingIndices: number[];
  queue: ReturnType<typeof usePlayer>['queue'];
  isPlaying: boolean;
  shuffle: boolean;
  isFavorite: (id: string) => boolean;
  onSelect: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: theme.spacing.xs, paddingBottom: theme.spacing.xs, gap: 2 }}>
        <Text variant="label" tone="tertiary">NOW PLAYING</Text>
        <QueueTrack
          track={currentTrack}
          index={currentIndex}
          isCurrent
          isPlaying={isPlaying}
          isFavorite={isFavorite(currentTrack.id)}
          onToggleFavorite={onToggleFavorite}
          onSelect={() => currentIndex >= 0 && onSelect(currentIndex)}
          onMove={onMove}
          onRemove={onRemove}
        />
      </View>
      <View style={{ height: theme.border.hairline, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.xs }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.xs }}>
        <Text variant="label" tone="tertiary">UP NEXT</Text>
        {shuffle ? <Text variant="micro" tone="accent">RANDOM ORDER</Text> : null}
      </View>
      {upcomingIndices.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
          <Text variant="secondary" tone="secondary" style={{ textAlign: 'center' }}>
            Nothing else is queued. Choose another album or playlist to keep listening.
          </Text>
        </View>
      ) : (
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: theme.spacing.xs, paddingBottom: theme.spacing.sm }}>
          {upcomingIndices.map((index, rowIndex) => {
            const track = queue[index];
            if (!track) return null;
            return (
              <QueueTrack
                key={track.id}
                track={track}
                index={index}
                displayIndex={rowIndex + 1}
                isCurrent={false}
                isPlaying={false}
                isFavorite={isFavorite(track.id)}
                onToggleFavorite={onToggleFavorite}
                onSelect={() => onSelect(index)}
                onMove={onMove}
                onRemove={onRemove}
                canMoveUp={rowIndex > 0}
                canMoveDown={rowIndex < upcomingIndices.length - 1}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function QueueTrack({
  track,
  index,
  displayIndex,
  isCurrent,
  isPlaying,
  isFavorite,
  onSelect,
  onMove,
  onRemove,
  onToggleFavorite,
  canMoveUp = false,
  canMoveDown = false,
}: {
  track: NonNullable<ReturnType<typeof usePlayer>['currentTrack']>;
  index: number;
  displayIndex?: number;
  isCurrent: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRemove: (index: number) => void;
  onToggleFavorite: (trackId: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xxs }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <TrackRow
          track={track}
          index={displayIndex}
          isCurrent={isCurrent}
          isPlaying={isPlaying}
          isFavorite={isFavorite}
          showAlbum
          onPress={onSelect}
          onToggleFavorite={() => onToggleFavorite(track.id)}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton
          icon="chevron-up"
          label={'Move ' + track.title + ' earlier'}
          size="sm"
          disabled={!canMoveUp}
          onPress={() => onMove(index, index - 1)}
        />
        <IconButton
          icon="chevron-down"
          label={'Move ' + track.title + ' later'}
          size="sm"
          disabled={!canMoveDown}
          onPress={() => onMove(index, index + 1)}
        />
        <IconButton
          icon="trash-outline"
          label={'Remove ' + track.title + ' from queue'}
          size="sm"
          onPress={() => onRemove(index)}
          style={{ marginLeft: theme.spacing.xxs }}
        />
      </View>
    </View>
  );
}

function LyricsPanel({
  lyricScroll,
  lyricOffsets,
  lyrics,
  activeIndex,
  onSeek,
}: {
  lyricScroll: RefObject<ScrollViewInstance | null>;
  lyricOffsets: MutableRefObject<number[]>;
  lyrics: MockLyricLine[] | undefined;
  activeIndex: number;
  onSeek: (timeSec: number) => void;
}) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  if (!lyrics?.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg }}>
        <Icon name="musical-notes-outline" size={28} color={theme.colors.textTertiary} />
        <Text variant="secondary" tone="secondary" style={{ textAlign: 'center', marginTop: theme.spacing.md }}>
          Lyrics are not available for this track yet.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      ref={lyricScroll}
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.md, padding: theme.spacing.md }}>
      {lyrics.map((line, index) => {
        const active = index === activeIndex;
        return (
          <Pressable
            key={line.timeSec + '-' + line.text}
            accessibilityRole="button"
            accessibilityLabel={'Seek to lyric: ' + line.text}
            onPress={() => onSeek(line.timeSec)}
            onLayout={(event) => {
              const y = event.nativeEvent.layout.y;
              lyricOffsets.current[index] = y;
              if (index === activeIndex) {
                lyricScroll.current?.scrollTo({ y: Math.max(0, y - 72), animated: !reducedMotion });
              }
            }}
            style={{
              borderLeftWidth: active ? 2 : 0,
              borderLeftColor: theme.colors.accent,
              paddingLeft: active ? theme.spacing.sm : theme.spacing.sm + 2,
              opacity: active ? 1 : 0.58,
            }}>
            <Text
              variant={active ? 'subheading' : 'callout'}
              tone={active ? 'primary' : 'secondary'}
              style={{ lineHeight: active ? 30 : 26 }}>
              {line.text}
            </Text>
          </Pressable>
        );
      })}
      {reducedMotion ? null : <View style={{ height: theme.spacing.xl }} />}
    </ScrollView>
  );
}
