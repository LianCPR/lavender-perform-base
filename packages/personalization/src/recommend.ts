import type { Track } from '@lavender/shared';

import type {
  DailyMix,
  RecommendationCatalog,
  RecommendationModel,
  RecommendationSection,
  RecommendedPlaylist,
  TasteProfile,
} from './types.ts';

export interface RecommendationInput {
  catalog: RecommendationCatalog;
  profile: TasteProfile;
  history: { trackId: string; artistName: string; playedAt: string }[];
  dismissed?: string[];
  seed?: number;
  now?: Date;
  enabled?: boolean;
}

function normalized(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function genreNameFor(track: Track, catalog: RecommendationCatalog): string | undefined {
  if (track.genre) return track.genre;
  const album = catalog.albums.find((item) => item.id === track.albumId);
  if (!album?.genreId) return undefined;
  return catalog.genres.find((genre) => genre.id === album.genreId)?.name;
}

function uniqueTracks(tracks: Track[], cap: number, seed: string): Track[] {
  const seen = new Set<string>();
  return tracks
    .filter((track) => {
      if (seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    })
    .sort((a, b) => hash(`${a.id}:${seed}`) - hash(`${b.id}:${seed}`))
    .slice(0, cap);
}

/** Tracks close to one song, used by “More Like This”. */
export function similarTracks(
  track: Track,
  catalog: RecommendationCatalog,
  limit = 6,
): Track[] {
  const genre = genreNameFor(track, catalog);
  return uniqueTracks(
    catalog.tracks.filter((candidate) => candidate.id !== track.id),
    catalog.tracks.length,
    track.id,
  )
    .map((candidate) => {
      let score = 0;
      if (candidate.artistId === track.artistId || normalized(candidate.artistName) === normalized(track.artistName)) {
        score += 4;
      }
      if (genre && genreNameFor(candidate, catalog) === genre) score += 3;
      if (track.mood && candidate.mood === track.mood) score += 1;
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate)
    .slice(0, limit);
}

export function buildRecommendations(input: RecommendationInput): RecommendationModel {
  const { catalog, profile, history } = input;
  if (input.enabled === false) {
    return { personalized: false, sections: [], dailyMixes: [], playlists: [] };
  }

  const dismissed = new Set(input.dismissed ?? []);
  const now = input.now ?? new Date();
  const seed = `${input.seed ?? 0}:${dayKey(now)}`;
  const personalized = profile.hasHistory && history.length > 0;

  const artistAffinity = new Map(profile.artists.map((artist) => [normalized(artist.name), artist.plays]));
  const genreAffinity = new Map(profile.genres.map((genre) => [normalized(genre.name), genre.plays]));
  const recentArtists = new Set(history.slice(0, 5).map((entry) => normalized(entry.artistName)));
  const playedArtists = new Set(history.map((entry) => normalized(entry.artistName)));
  const playedTrackIds = new Set(history.map((entry) => entry.trackId));

  const scoreTrack = (track: Track): number => {
    const genre = normalized(genreNameFor(track, catalog));
    const affinity =
      (artistAffinity.get(normalized(track.artistName)) ?? 0) * 4 +
      (genreAffinity.get(genre) ?? 0) * 2 +
      (recentArtists.has(normalized(track.artistName)) ? 2 : 0);
    const novelty = personalized && playedTrackIds.has(track.id) ? -1.5 : 0;
    const jitter = (hash(`${track.id}:${seed}`) % 1000) / 1000;
    return affinity + novelty + jitter;
  };

  const ranked = [...catalog.tracks].sort((a, b) => scoreTrack(b) - scoreTrack(a));
  const sections: RecommendationSection[] = [];

  const addSection = (section: RecommendationSection) => {
    if (section.tracks.length === 0 || dismissed.has(section.id)) return;
    // Sections are lenses on the same taste, so overlap is allowed; each
    // section is deduplicated by uniqueTracks/source lists.
    sections.push(section);
  };

  if (personalized) {
    addSection({
      id: 'for-you',
      title: 'Recommended for you',
      subtitle: 'Built from the artists and genres you actually play',
      tracks: ranked.slice(0, 8),
    });

    const recentCandidates = ranked.filter((track) =>
      recentArtists.has(normalized(track.artistName)),
    );
    addSection({
      id: 'based-on-recent',
      title: 'Based on your recent listening',
      subtitle:
        history[0]?.artistName
          ? `More in the orbit of ${history[0].artistName}`
          : 'From the artists you played this week',
      tracks: recentCandidates.slice(0, 6),
    });

    const favoriteGenres = profile.genres.slice(0, 2).map((genre) => normalized(genre.name));
    addSection({
      id: 'favorite-genres',
      title: 'Your favorite genres',
      subtitle: profile.genres.length
        ? `${profile.genres[0]?.name ?? 'Your'} and ${profile.genres[1]?.name ?? 'related'} listening`
        : 'Genres from your listening history',
      tracks: ranked
        .filter((track) => favoriteGenres.includes(normalized(genreNameFor(track, catalog))))
        .slice(0, 6),
    });

    const discovery = ranked.filter(
      (track) => !playedArtists.has(normalized(track.artistName)),
    );
    addSection({
      id: 'discover-artists',
      title: 'Discover new artists',
      subtitle: 'Artists you have not played yet, matched to your taste',
      tracks: discovery.slice(0, 6),
    });

    const lastEntry = history[0];
    const lastTrack = lastEntry
      ? catalog.tracks.find((track) => track.id === lastEntry.trackId)
      : undefined;
    if (lastTrack) {
      addSection({
        id: 'more-like-this',
        title: `Because you played ${lastTrack.title}`,
        subtitle: `Similar songs around ${lastTrack.artistName}`,
        tracks: similarTracks(lastTrack, catalog, 5),
      });
    }
  } else {
    addSection({
      id: 'for-you',
      title: 'Start here',
      subtitle: 'A starting point until we know what you like',
      tracks: uniqueTracks(catalog.tracks, 8, seed),
    });
    addSection({
      id: 'discover-artists',
      title: 'A few artists to try',
      subtitle: 'Discovery before there is listening history',
      tracks: ranked.slice(0, 6),
    });
  }

  const dailyMixes: DailyMix[] = [];
  if (personalized) {
    const addMix = (mix: DailyMix) => {
      if (mix.tracks.length > 0 && !dismissed.has(mix.id)) dailyMixes.push(mix);
    };

    const topGenre = profile.genres[0];
    if (topGenre) {
      const genreTracks = ranked.filter(
        (track) => normalized(genreNameFor(track, catalog)) === normalized(topGenre.name),
      );
      const fill = ranked.filter((track) => !genreTracks.includes(track));
      addMix({
        id: 'daily-mix-genre',
        title: `${topGenre.name} Mix`,
        subtitle: 'Your daily mix · refreshed today',
        palette: catalog.genres.find((genre) => normalized(genre.name) === normalized(topGenre.name))?.palette ?? 'lavender',
        tracks: uniqueTracks([...genreTracks, ...fill], 8, `${seed}:genre`),
      });
    }

    const topArtist = profile.artists[0];
    if (topArtist) {
      const artistTracks = ranked.filter(
        (track) => normalized(track.artistName) === normalized(topArtist.name),
      );
      if (artistTracks.length > 0) {
        const genre = normalized(genreNameFor(artistTracks[0] as Track, catalog));
        const fill = ranked.filter(
          (track) =>
            !artistTracks.includes(track) && normalized(genreNameFor(track, catalog)) === genre,
        );
        addMix({
          id: 'daily-mix-artist',
          title: `${topArtist.name} Mix`,
          subtitle: 'Your daily mix · refreshed today',
          palette: artistTracks[0]?.palette ?? 'lavender',
          tracks: uniqueTracks([...artistTracks, ...fill], 8, `${seed}:artist`),
        });
      }
    }

    const topMood = profile.moods[0];
    if (topMood && catalog.moods) {
      const mood = catalog.moods.find((item) => normalized(item.name) === normalized(topMood.name));
      if (mood) {
        const moodTracks = ranked.filter((track) => mood.trackIds.includes(track.id));
        addMix({
          id: 'daily-mix-mood',
          title: `${mood.name} Mix`,
          subtitle: 'Your daily mix · refreshed today',
          palette: 'haze',
          tracks: uniqueTracks(moodTracks, 8, `${seed}:mood`),
        });
      }
    }
  }

  // Playlists are scored as a set: their artists and genres against the same
  // profile used for tracks, so the reason can name a real affinity.
  const playlists: RecommendedPlaylist[] = personalized
    ? catalog.playlists
        .map((playlist) => {
          const playlistTracks = playlist.trackIds
            .map((id) => catalog.tracks.find((track) => track.id === id))
            .filter((track): track is Track => Boolean(track));
          const score = playlistTracks.reduce((total, track) => {
            const genre = normalized(genreNameFor(track, catalog));
            return (
              total +
              (artistAffinity.get(normalized(track.artistName)) ?? 0) +
              (genreAffinity.get(genre) ?? 0)
            );
          }, 0);
          const reason = playlistTracks.some((track) =>
            recentArtists.has(normalized(track.artistName)),
          )
            ? 'Artists from your recent listening'
            : `Matches ${profile.genres[0]?.name ?? 'your'} taste`;
          return { playlist, score, reason };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ playlist, reason }) => ({ playlist, reason }))
    : [];

  return { personalized, sections, dailyMixes, playlists };
}

/** The Home greeting can reflect a rising listener without inventing data. */
export function listeningTrendLabel(profile: TasteProfile): string {
  if (!profile.hasHistory) return 'Listen to something to begin';
  if (profile.trend.direction === 'rising') return 'More listening than last week';
  if (profile.trend.direction === 'cooling') return 'A quieter week than before';
  return 'A steady week of listening';
}

