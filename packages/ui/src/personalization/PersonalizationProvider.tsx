import { useLibrary } from '@lavender/music-library';
import { usePlayer } from '@lavender/music-player';
import {
  buildRecommendations,
  buildTasteProfile,
  createHistoryEntry,
  historyTrack,
  listenThreshold,
  qualifiesListen,
  type ListeningHistoryEntry,
  type RecommendationModel,
  type TasteProfile,
} from '@lavender/personalization';
import type { Track } from '@lavender/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export interface PersonalizationContextValue {
  enabled: boolean;
  profile: TasteProfile;
  model: RecommendationModel;
  history: ListeningHistoryEntry[];
  recentTracks: Track[];
  refreshSeed: number;
  dismissed: string[];
  refresh: () => void;
  dismiss: (id: string) => void;
  restoreAll: () => void;
}

export const PersonalizationContext = createContext<PersonalizationContextValue | null>(null);

interface ActiveSession {
  track: Track;
  entry: ListeningHistoryEntry;
  lastPosition: number;
  listenedSec: number;
  lastCommittedSec: number;
}

/** Add catalog genre/mood only when they are known; never guess them. */
function enrichTrack(
  track: Track,
  catalog: {
    albums: { id: string; genreId?: string }[];
    genres: { id: string; name: string }[];
    moods: { id: string; name: string; trackIds: string[] }[];
  },
): Track {
  if (track.genre || track.mood) return track;
  const album = catalog.albums.find((item) => item.id === track.albumId);
  const genre = album?.genreId
    ? catalog.genres.find((item) => item.id === album.genreId)?.name
    : undefined;
  const mood = catalog.moods.find((item) => item.trackIds.includes(track.id))?.name;
  return genre || mood ? { ...track, genre, mood } : track;
}

function createSession(track: Track, positionSec: number): ActiveSession {
  const enriched = track;
  return {
    track: enriched,
    entry: createHistoryEntry(enriched, {
      listenedSec: 0,
      playedAt: new Date().toISOString(),
    }),
    lastPosition: Math.max(0, positionSec),
    listenedSec: 0,
    lastCommittedSec: 0,
  };
}

/**
 * Records measured listening and exposes derived, local-first personalization.
 *
 * The tracker only counts playback deltas while the engine reports playing, so
 * pausing, buffering, failed provider streams and seeking do not inflate a
 * listen. A session is committed once it crosses the threshold and updated when
 * it ends; nothing is written to the network here.
 */
export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const library = useLibrary();
  const player = usePlayer();
  const [refreshSeed, setRefreshSeed] = useState(0);
  const sessionRef = useRef<ActiveSession | null>(null);
  const recordListenRef = useRef(library.recordListen);
  recordListenRef.current = library.recordListen;

  const catalog = library.catalog;
  const enabled = library.personalizationEnabled;

  const enrich = useCallback(
    (track: Track) => enrichTrack(track, catalog),
    [catalog],
  );

  const commit = useCallback((session: ActiveSession) => {
    if (!qualifiesListen(session.track.durationSec, session.listenedSec)) return;
    const entry = createHistoryEntry(session.track, {
      id: session.entry.id,
      playedAt: session.entry.playedAt,
      listenedSec: session.listenedSec,
    });
    session.lastCommittedSec = session.listenedSec;
    recordListenRef.current(entry);
  }, []);

  const finalize = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    if (session.listenedSec > session.lastCommittedSec) commit(session);
  }, [commit]);

  // Start/end sessions as the active track or playback state changes. A pause
  // alone does not end a session, so resume continues the same measurement.
  useEffect(() => {
    const track = player.currentTrack;

    if (!enabled) {
      finalize();
      return;
    }
    if (sessionRef.current && (!track || track.id !== sessionRef.current.track.id)) {
      finalize();
    }
    if (!track || !player.isPlaying) {
      return;
    }
    if (!sessionRef.current) {
      sessionRef.current = createSession(enrich(track), player.positionSec);
    }
  }, [enabled, enrich, finalize, player.currentTrack, player.isPlaying, player.positionSec]);

  // Accumulate only small forward position deltas. A seek can jump tens of
  // seconds and must not be counted as listening.
  useEffect(() => {
    const session = sessionRef.current;
    if (!session || !enabled) return;
    if (!player.isPlaying) {
      session.lastPosition = player.positionSec;
      return;
    }
    const delta = player.positionSec - session.lastPosition;
    session.lastPosition = player.positionSec;
    if (delta > 0 && delta <= 3) {
      session.listenedSec = Math.min(
        session.track.durationSec > 0 ? session.track.durationSec : session.listenedSec + delta,
        session.listenedSec + delta,
      );
    }
    if (
      qualifiesListen(session.track.durationSec, session.listenedSec) &&
      (session.lastCommittedSec === 0 || session.listenedSec - session.lastCommittedSec >= 15)
    ) {
      commit(session);
    }
  }, [commit, enabled, player.isPlaying, player.positionSec]);

  useEffect(() => {
    return () => finalize();
  }, [finalize]);

  const history = library.listeningHistory;

  const profile = useMemo(
    () =>
      buildTasteProfile({
        history,
        albums: catalog.albums,
        genres: catalog.genres,
        playlists: library.playlists,
        favoriteTrackIds: library.favoriteTrackIds,
      }),
    [catalog.albums, catalog.genres, history, library.favoriteTrackIds, library.playlists],
  );

  const model = useMemo(
    () =>
      buildRecommendations({
        catalog: {
          tracks: catalog.tracks,
          albums: catalog.albums,
          artists: catalog.artists,
          playlists: library.playlists,
          genres: catalog.genres,
          moods: catalog.moods,
        },
        profile,
        history: history.map((entry) => ({
          trackId: entry.trackId,
          artistName: entry.artistName,
          playedAt: entry.playedAt,
        })),
        dismissed: library.dismissedRecommendations,
        enabled,
        seed: refreshSeed,
      }),
    [
      catalog,
      enabled,
      history,
      library.dismissedRecommendations,
      library.playlists,
      profile,
      refreshSeed,
    ],
  );

  const recentTracks = useMemo(() => {
    const seen = new Set<string>();
    const tracks: Track[] = [];
    for (const entry of history) {
      if (seen.has(entry.trackId)) continue;
      seen.add(entry.trackId);
      tracks.push(enrich(library.trackById(entry.trackId) ?? historyTrack(entry)));
      if (tracks.length >= 10) break;
    }
    return tracks;
  }, [enrich, history, library]);

  const refresh = useCallback(() => setRefreshSeed((value) => value + 1), []);
  const dismiss = useCallback(
    (id: string) => library.dismissRecommendation(id),
    [library],
  );
  const restoreAll = useCallback(() => {
    for (const id of library.dismissedRecommendations) library.restoreRecommendation(id);
  }, [library]);

  const value = useMemo<PersonalizationContextValue>(
    () => ({
      enabled,
      profile,
      model,
      history,
      recentTracks,
      refreshSeed,
      dismissed: library.dismissedRecommendations,
      refresh,
      dismiss,
      restoreAll,
    }),
    [
      dismiss,
      enabled,
      history,
      library.dismissedRecommendations,
      model,
      profile,
      recentTracks,
      refresh,
      refreshSeed,
      restoreAll,
    ],
  );

  return (
    <PersonalizationContext.Provider value={value}>{children}</PersonalizationContext.Provider>
  );
}

export function usePersonalization(): PersonalizationContextValue {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used inside <PersonalizationProvider>.');
  }
  return context;
}

export { listenThreshold };
