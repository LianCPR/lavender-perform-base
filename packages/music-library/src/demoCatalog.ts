import type {
  Album,
  Artist,
  Collection,
  Genre,
  ID,
  Mood,
  Playlist,
  Track,
} from '@lavender/shared';

/**
 * Local demo catalog.
 *
 * The single source of truth for all demo music: screens never hardcode
 * albums, artists, tracks, playlists or genres. Everything is typed and
 * reference-by-id, so a future library importer can replace the data behind the
 * same shape.
 */
export interface MusicCatalog {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  playlists: Playlist[];
  genres: Genre[];
  moods: Mood[];
  mixes: Collection[];
  home: {
    featuredAlbumId: ID;
    recentlyPlayedAlbumIds: ID[];
    suggestedPlaylistIds: ID[];
    recommendedAlbumIds: ID[];
    madeForYouMixIds: ID[];
    quickAccessPlaylistIds: ID[];
    newReleaseAlbumIds: ID[];
  };
  browse: {
    featuredAlbumIds: ID[];
    newReleaseAlbumIds: ID[];
    recommendedPlaylistIds: ID[];
    curatedCollectionIds: ID[];
  };
}

/** Original, timed placeholder lyric lines for the Now Playing demo. */
export interface MockLyricLine {
  timeSec: number;
  text: string;
}

const artists: Artist[] = [
  { id: 'ar-aurora', name: 'Aurora Veil', palette: 'lavender' },
  { id: 'ar-sable', name: 'Sable & Ivory', palette: 'plum' },
  { id: 'ar-nova', name: 'Nova Lune', palette: 'dusk' },
  { id: 'ar-quiet', name: 'The Quiet Hours', palette: 'haze' },
  { id: 'ar-marlowe', name: 'Marlowe', palette: 'rose' },
  { id: 'ar-elysian', name: 'Elysian Field', palette: 'ocean' },
  { id: 'ar-kito', name: 'Kito Nakamura', palette: 'sage' },
  { id: 'ar-vela', name: 'Vela', palette: 'ember' },
  { id: 'ar-cassian', name: 'Cassian Roe', palette: 'plum' },
  { id: 'ar-june', name: 'June Ash', palette: 'ember' },
];

const albums: Album[] = [
  {
    id: 'al-soft-focus',
    title: 'Soft Focus',
    artistId: 'ar-aurora',
    artistName: 'Aurora Veil',
    year: 2025,
    trackCount: 10,
    palette: 'lavender',
    genreId: 'gn-chill',
  },
  {
    id: 'al-velvet-static',
    title: 'Velvet Static',
    artistId: 'ar-sable',
    artistName: 'Sable & Ivory',
    year: 2024,
    trackCount: 12,
    palette: 'plum',
    genreId: 'gn-rnb',
  },
  {
    id: 'al-midnight-bloom',
    title: 'Midnight Bloom',
    artistId: 'ar-nova',
    artistName: 'Nova Lune',
    year: 2026,
    trackCount: 9,
    palette: 'dusk',
    genreId: 'gn-electronic',
  },
  {
    id: 'al-paper-rooms',
    title: 'Paper Rooms',
    artistId: 'ar-quiet',
    artistName: 'The Quiet Hours',
    year: 2023,
    trackCount: 11,
    palette: 'haze',
    genreId: 'gn-lofi',
  },
  {
    id: 'al-lavender-hour',
    title: 'Lavender Hour',
    artistId: 'ar-marlowe',
    artistName: 'Marlowe',
    year: 2025,
    trackCount: 8,
    palette: 'rose',
    genreId: 'gn-indie',
  },
  {
    id: 'al-north-of-here',
    title: 'North of Here',
    artistId: 'ar-elysian',
    artistName: 'Elysian Field',
    year: 2022,
    trackCount: 13,
    palette: 'ocean',
    genreId: 'gn-jazz',
  },
  {
    id: 'al-glasshouse',
    title: 'Glasshouse',
    artistId: 'ar-kito',
    artistName: 'Kito Nakamura',
    year: 2026,
    trackCount: 7,
    palette: 'sage',
    genreId: 'gn-classical',
  },
  {
    id: 'al-slow-motion',
    title: 'Slow Motion',
    artistId: 'ar-vela',
    artistName: 'Vela',
    year: 2024,
    trackCount: 10,
    palette: 'ember',
    genreId: 'gn-pop',
  },
  {
    id: 'al-concrete-garden',
    title: 'Concrete Garden',
    artistId: 'ar-cassian',
    artistName: 'Cassian Roe',
    year: 2025,
    trackCount: 8,
    palette: 'plum',
    genreId: 'gn-hiphop',
  },
  {
    id: 'al-porch-light',
    title: 'Porch Light',
    artistId: 'ar-june',
    artistName: 'June Ash',
    year: 2023,
    trackCount: 9,
    palette: 'ember',
    genreId: 'gn-acoustic',
  },
];

function track(
  id: string,
  title: string,
  albumId: string,
  durationSec: number,
): Track {
  const album = albums.find((item) => item.id === albumId);
  if (!album) throw new Error(`Unknown album for demo track ${id}`);
  return {
    id,
    title,
    artistId: album.artistId,
    artistName: album.artistName,
    albumId: album.id,
    albumTitle: album.title,
    durationSec,
    palette: album.palette,
  };
}

const tracks: Track[] = [
  track('tr-soft-focus', 'Soft Focus', 'al-soft-focus', 214),
  track('tr-half-light', 'Half Light', 'al-soft-focus', 198),
  track('tr-quiet-company', 'Quiet Company', 'al-soft-focus', 187),
  track('tr-velvet-static', 'Velvet Static', 'al-velvet-static', 236),
  track('tr-paper-thin', 'Paper Thin', 'al-velvet-static', 189),
  track('tr-midnight-bloom', 'Midnight Bloom', 'al-midnight-bloom', 245),
  track('tr-blue-hour', 'Blue Hour', 'al-midnight-bloom', 221),
  track('tr-paper-rooms', 'Paper Rooms', 'al-paper-rooms', 207),
  track('tr-slow-rain', 'Slow Rain', 'al-paper-rooms', 262),
  track('tr-lavender-hour', 'Lavender Hour', 'al-lavender-hour', 233),
  track('tr-golden-thread', 'Golden Thread', 'al-lavender-hour', 195),
  track('tr-north-of-here', 'North of Here', 'al-north-of-here', 251),
  track('tr-glasshouse', 'Glasshouse', 'al-glasshouse', 224),
  track('tr-slow-motion', 'Slow Motion', 'al-slow-motion', 240),
  track('tr-afterglow', 'Afterglow', 'al-slow-motion', 213),
  track('tr-concrete-garden', 'Concrete Garden', 'al-concrete-garden', 208),
  track('tr-night-bus', 'Night Bus', 'al-concrete-garden', 196),
  track('tr-porch-light', 'Porch Light', 'al-porch-light', 211),
  track('tr-cedar-line', 'Cedar Line', 'al-porch-light', 184),
];

export const demoLyrics: Partial<Record<ID, MockLyricLine[]>> = {
  'tr-midnight-bloom': [
    { timeSec: 0, text: 'The city exhales in silver' },
    { timeSec: 18, text: 'Windows wake along the avenue' },
    { timeSec: 39, text: 'We let the blue hour linger' },
    { timeSec: 62, text: 'Soft light gathers at the edges' },
    { timeSec: 86, text: 'A quiet pulse beneath the street' },
    { timeSec: 110, text: 'Morning waits beyond the glass' },
    { timeSec: 138, text: 'We carry the night like a small constellation' },
    { timeSec: 170, text: 'And watch it fade into the day' },
  ],
  'tr-soft-focus': [
    { timeSec: 0, text: 'Let the morning lose its edges' },
    { timeSec: 22, text: 'Leave a little room for quiet' },
    { timeSec: 48, text: 'Every color settles slowly' },
    { timeSec: 76, text: 'Nothing here needs to be hurried' },
    { timeSec: 108, text: 'Stay until the light feels easy' },
    { timeSec: 144, text: 'Let the day arrive in focus' },
  ],
  'tr-slow-rain': [
    { timeSec: 0, text: 'Rain writes softly on the window' },
    { timeSec: 28, text: 'Passing headlights blur to gold' },
    { timeSec: 61, text: 'We keep the kettle singing' },
    { timeSec: 95, text: 'While the afternoon unfolds' },
    { timeSec: 132, text: 'Every drop becomes a rhythm' },
    { timeSec: 176, text: 'Every room becomes a home' },
  ],
};

const playlists: Playlist[] = [
  {
    id: 'pl-late-evening',
    name: 'Late Evening',
    description: 'Soft edges for the last hour of the day.',
    trackIds: ['tr-midnight-bloom', 'tr-blue-hour', 'tr-slow-rain', 'tr-afterglow'],
    palette: 'dusk',
    createdAt: '2025-11-02T20:10:00.000Z',
    curated: true,
  },
  {
    id: 'pl-soft-start',
    name: 'Soft Start',
    description: 'Slow mornings, no sudden movement.',
    trackIds: ['tr-half-light', 'tr-soft-focus', 'tr-golden-thread'],
    palette: 'rose',
    createdAt: '2025-09-18T07:45:00.000Z',
    curated: true,
  },
  {
    id: 'pl-deep-focus',
    name: 'Deep Focus',
    description: 'Instrumental textures for long work.',
    trackIds: ['tr-glasshouse', 'tr-paper-rooms', 'tr-north-of-here'],
    palette: 'haze',
    createdAt: '2025-06-05T09:00:00.000Z',
    curated: true,
  },
  {
    id: 'pl-lavender-sessions',
    name: 'Lavender Sessions',
    description: 'Your own collection.',
    trackIds: ['tr-lavender-hour', 'tr-velvet-static', 'tr-paper-thin', 'tr-slow-motion'],
    palette: 'lavender',
    createdAt: '2026-01-12T18:30:00.000Z',
  },
  {
    id: 'pl-sunday-notes',
    name: 'Sunday Notes',
    description: 'Gentle instrumentals for a slower day.',
    trackIds: ['tr-slow-rain', 'tr-paper-rooms', 'tr-blue-hour'],
    palette: 'haze',
    createdAt: '2026-02-08T10:00:00.000Z',
    curated: true,
  },
  {
    id: 'pl-after-hours',
    name: 'After Hours',
    description: 'Low lights and unhurried melodies.',
    trackIds: ['tr-midnight-bloom', 'tr-afterglow', 'tr-slow-motion'],
    palette: 'dusk',
    createdAt: '2026-03-21T21:00:00.000Z',
    curated: true,
  },
];

const genres: Genre[] = [
  { id: 'gn-pop', name: 'Pop', palette: 'rose' },
  { id: 'gn-rnb', name: 'R&B', palette: 'plum' },
  { id: 'gn-hiphop', name: 'Hip-Hop', palette: 'dusk' },
  { id: 'gn-electronic', name: 'Electronic', palette: 'lavender' },
  { id: 'gn-indie', name: 'Indie', palette: 'sage' },
  { id: 'gn-jazz', name: 'Jazz', palette: 'ocean' },
  { id: 'gn-classical', name: 'Classical', palette: 'haze' },
  { id: 'gn-lofi', name: 'Lo-fi', palette: 'ember' },
  { id: 'gn-acoustic', name: 'Acoustic', palette: 'ocean' },
  { id: 'gn-chill', name: 'Chill', palette: 'lavender' },
];

const moods: Mood[] = [
  {
    id: 'md-focus',
    name: 'Focus',
    description: 'Instrumental textures for long work.',
    palette: 'haze',
    trackIds: ['tr-paper-rooms', 'tr-glasshouse', 'tr-north-of-here', 'tr-quiet-company'],
  },
  {
    id: 'md-relax',
    name: 'Relax',
    description: 'Slow tempos and unhurried melodies.',
    palette: 'rose',
    trackIds: ['tr-soft-focus', 'tr-half-light', 'tr-slow-rain', 'tr-lavender-hour'],
  },
  {
    id: 'md-workout',
    name: 'Workout',
    description: 'A steady pulse for the next set.',
    palette: 'dusk',
    trackIds: ['tr-velvet-static', 'tr-concrete-garden', 'tr-night-bus', 'tr-slow-motion'],
  },
  {
    id: 'md-sleep',
    name: 'Sleep',
    description: 'Quiet, low-light listening for winding down.',
    palette: 'lavender',
    trackIds: ['tr-slow-rain', 'tr-blue-hour', 'tr-paper-thin', 'tr-afterglow'],
  },
  {
    id: 'md-morning',
    name: 'Morning',
    description: 'Soft light and an easy start.',
    palette: 'ember',
    trackIds: ['tr-half-light', 'tr-golden-thread', 'tr-porch-light', 'tr-cedar-line'],
  },
  {
    id: 'md-night-drive',
    name: 'Night Drive',
    description: 'Long roads and city reflections.',
    palette: 'ocean',
    trackIds: ['tr-midnight-bloom', 'tr-afterglow', 'tr-north-of-here', 'tr-slow-motion'],
  },
];

const mixes: Collection[] = [
  {
    id: 'mx-lavender', title: 'Lavender Mix', subtitle: 'Aurora Veil, Marlowe, Vela', palette: 'lavender',
    trackIds: ['tr-soft-focus', 'tr-lavender-hour', 'tr-afterglow', 'tr-blue-hour'],
  },
  {
    id: 'mx-chill', title: 'Chill Mix', subtitle: 'The Quiet Hours, Nova Lune', palette: 'haze',
    trackIds: ['tr-quiet-company', 'tr-slow-rain', 'tr-half-light', 'tr-midnight-bloom'],
  },
  {
    id: 'mx-discovery', title: 'Discovery Mix', subtitle: 'Kito Nakamura, Elysian Field', palette: 'plum',
    trackIds: ['tr-glasshouse', 'tr-north-of-here', 'tr-paper-thin', 'tr-velvet-static'],
  },
  {
    id: 'mx-focus', title: 'Focus Mix', subtitle: 'Instrumental, 2 hours', palette: 'rose',
    trackIds: ['tr-paper-rooms', 'tr-golden-thread', 'tr-quiet-company', 'tr-slow-motion'],
  },
];

export const demoCatalog: MusicCatalog = {
  artists,
  albums,
  tracks,
  playlists,
  genres,
  moods,
  mixes,
  home: {
    featuredAlbumId: 'al-soft-focus',
    recentlyPlayedAlbumIds: [
      'al-soft-focus',
      'al-midnight-bloom',
      'al-lavender-hour',
      'al-slow-motion',
      'al-glasshouse',
    ],
    suggestedPlaylistIds: ['pl-sunday-notes', 'pl-after-hours'],
    recommendedAlbumIds: ['al-paper-rooms', 'al-north-of-here', 'al-velvet-static'],
    madeForYouMixIds: ['mx-lavender', 'mx-chill', 'mx-discovery', 'mx-focus'],
    quickAccessPlaylistIds: ['pl-late-evening', 'pl-soft-start', 'pl-deep-focus', 'pl-lavender-sessions'],
    newReleaseAlbumIds: ['al-midnight-bloom', 'al-glasshouse'],
  },
  browse: {
    featuredAlbumIds: ['al-midnight-bloom', 'al-glasshouse', 'al-porch-light'],
    newReleaseAlbumIds: [
      'al-midnight-bloom',
      'al-glasshouse',
      'al-concrete-garden',
      'al-porch-light',
    ],
    recommendedPlaylistIds: ['pl-deep-focus', 'pl-sunday-notes', 'pl-after-hours', 'pl-late-evening'],
    curatedCollectionIds: ['mx-lavender', 'mx-chill', 'mx-discovery', 'mx-focus'],
  },
};

export const demoNowPlayingTrackId = 'tr-midnight-bloom';
