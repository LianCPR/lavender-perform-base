import { useTheme } from '@lavender/design-system';
import { pluralize, type Album } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useWindowDimensions, View } from 'react-native';

import { Artwork } from '../Artwork';
import { IconButton } from '../buttons/IconButton';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { SecondaryButton } from '../buttons/SecondaryButton';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Text } from '../Text';
import { withAlpha } from '../utils/color';

export interface FeaturedAlbumHeroProps {
  album: Album;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  description?: string;
  /** Optional genre label shown in the wide details column. */
  genreName?: string;
  onPlay: () => void;
  onShuffle: () => void;
  onDetails?: () => void;
}

/**
 * The featured album panel.
 *
 * The cover's own palette tints a glass-like wash, so the panel feels like it
 * belongs to the record instead of being a generic card. Compact widths keep a
 * single action row (one labelled button plus icon controls) and wide layouts
 * fill the right side with the album's details. Shared by Home and Browse.
 */
export function FeaturedAlbumHero({
  album,
  eyebrow = 'FEATURED ALBUM',
  description,
  genreName,
  onPlay,
  onShuffle,
  onDetails,
}: FeaturedAlbumHeroProps) {
  const theme = useTheme();
  const breakpoint = useBreakpoint();
  const { width } = useWindowDimensions();
  const isCompact = breakpoint === 'compact';
  // The facts column needs a genuinely roomy card. On tablet-sized windows it
  // squeezes the title and forces every action onto its own row.
  const showFacts = width >= 1180;
  const isNarrow = breakpoint === 'compact' || breakpoint === 'medium';
  const to = theme.artwork[album.palette][1];
  const glow = theme.isDark ? 0.26 : 0.34;
  const tint: [string, string, string] = [
    withAlpha(to, glow),
    withAlpha(to, glow * 0.34),
    withAlpha(to, 0),
  ];
  // A 320px phone leaves roughly 160px for the text column once the cover and
  // gutters are removed, so the compact cover stays deliberately small.
  const artworkSize = { compact: 88, medium: 132, expanded: 148, wide: 208 }[breakpoint];
  // Below 360px the full artist · year · track-count line cannot fit beside the
  // cover; the count stays available through the details control instead of
  // wrapping a lone "songs" onto a second line.
  const metadata =
    isCompact && width < 360
      ? `${album.artistName} · ${album.year}`
      : `${album.artistName} · ${album.year} · ${pluralize(album.trackCount, 'song')}`;
  const facts: { label: string; value: string }[] = [
    { label: 'Artist', value: album.artistName },
    { label: 'Released', value: String(album.year) },
    { label: 'Songs', value: pluralize(album.trackCount, 'song') },
  ];
  if (genreName) facts.push({ label: 'Genre', value: genreName });

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        borderWidth: theme.border.hairline,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}>
      <LinearGradient
        colors={tint}
        start={{ x: 0.05, y: 0.1 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, width: '68%', bottom: 0 }}
      />
      <View
        style={{
          padding: isNarrow ? theme.spacing.md : theme.spacing.xl,
          gap: isCompact ? theme.spacing.md : 0,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: isNarrow ? 'flex-start' : 'center',
            gap: isNarrow ? theme.spacing.md : theme.spacing.xl,
          }}>
          <Artwork
            palette={album.palette}
            size={artworkSize}
            elevated
            cornerRadius={theme.radius.md}
          />

          <View style={{ flex: 1, gap: theme.spacing.xs, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LinearGradient
                colors={theme.colors.accentGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: 16, height: 2, borderRadius: 1 }}
              />
              <Text variant="label" tone="accent">
                {eyebrow}
              </Text>
            </View>
            <Text variant={isCompact ? 'subheading' : 'display'} numberOfLines={2}>
              {album.title}
            </Text>
            <Text variant="callout" tone="secondary" numberOfLines={1}>
              {metadata}
            </Text>
            {description ? (
              <Text variant="secondary" tone="tertiary" numberOfLines={2}>
                {description}
              </Text>
            ) : null}

            {!isCompact ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: theme.spacing.sm,
                  marginTop: theme.spacing.sm,
                }}>
                <PrimaryButton label="Play album" icon="play" size="sm" onPress={onPlay} />
                <SecondaryButton label="Shuffle" icon="shuffle" size="sm" onPress={onShuffle} />
                {onDetails ? (
                  <SecondaryButton
                    label="Details"
                    icon="information-circle-outline"
                    size="sm"
                    onPress={onDetails}
                  />
                ) : null}
              </View>
            ) : null}
          </View>

          {showFacts ? (
            <View
              style={{
                width: 272,
                alignSelf: 'stretch',
                justifyContent: 'center',
                paddingLeft: theme.spacing.xl,
                borderLeftWidth: theme.border.hairline,
                borderLeftColor: theme.colors.divider,
              }}>
              <Text variant="label" tone="tertiary" style={{ marginBottom: 6 }}>
                Album details
              </Text>
              {facts.map((fact) => (
                <View
                  key={fact.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing.sm,
                    paddingVertical: 8,
                    borderTopWidth: theme.border.hairline,
                    borderTopColor: theme.colors.divider,
                  }}>
                  <Text variant="caption" tone="tertiary">
                    {fact.label}
                  </Text>
                  <Text variant="secondary" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'right' }}>
                    {fact.value}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {isCompact ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}>
            <PrimaryButton label="Play" icon="play" size="md" onPress={onPlay} style={{ flex: 1 }} />
            <IconButton
              icon="shuffle"
              label="Shuffle album"
              variant="glass"
              size="lg"
              onPress={onShuffle}
            />
            {onDetails ? (
              <IconButton
                icon="information-circle-outline"
                label="Album details"
                variant="glass"
                size="lg"
                onPress={onDetails}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
