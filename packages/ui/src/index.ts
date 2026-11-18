// Providers and theme re-exports
export {
  ThemeProvider,
  useReducedMotion,
  useReducedTransparency,
  useTheme,
  useThemeMode,
} from '@lavender/design-system';
export type { ThemeMode } from '@lavender/design-system';
export { LibraryProvider, useLibrary } from '@lavender/music-library';
export { PlayerProvider, usePlayer } from '@lavender/music-player';
export * from './PlayerHost';
export * from './SyncHost';
export * from './personalization/PersonalizationProvider';
export * from './personalization/PersonalizedSections';

// Interaction
export * from './interaction/Interactive';

// Motion
export * from './motion/NowPlayingTransition';

// Primitives
export * from './AppShell';
export * from './Artwork';
export * from './ArtworkCard';
export * from './ArtworkGrid';
export * from './BrandMark';
export * from './Chip';
export * from './Divider';
export * from './GlassButton';
export * from './GlassMiniPlayer';
export * from './GlassNavigation';
export * from './GlassSurface';
export * from './GlassTabBar';
export * from './Icon';
export * from './NavigationItem';
export * from './PlaybackProgress';
export * from './Screen';
export * from './SectionHeader';
export * from './Spacer';
export * from './Surface';
export * from './Text';
export * from './ThemeControl';

// Browse
export * from './browse/BrowseSection';
export * from './browse/GenreCard';
export * from './browse/MoodCard';

// Buttons
export * from './buttons/ButtonBase';
export * from './buttons/IconButton';
export * from './buttons/PrimaryButton';
export * from './buttons/SecondaryButton';

// Feedback
export * from './feedback/EmptyLibraryState';
export * from './feedback/EmptyState';
export * from './feedback/ErrorState';
export * from './feedback/LoadingState';
export * from './feedback/Skeleton';

// Library
export * from './library/LibraryFilter';
export * from './library/PlaylistGrid';
export * from './library/SortMenu';

// Music UI
export * from './music/AlbumCard';
export * from './music/ArtistCard';
export * from './music/PlaylistCard';
export * from './music/PlaylistDetail';
export * from './music/TrackCollectionSheet';
export * from './music/FeaturedAlbumHero';
export * from './music/TrackRow';

// Overlays
export * from './overlays/Sheet';
export * from './overlays/TextPromptSheet';
export * from './overlays/TrackActionsSheet';
export * from './overlays/TrackEditSheet';

// Search
export * from './search/SearchBar';
export * from './search/SearchResultRow';

// Hooks
export * from './hooks/useBreakpoint';
export * from './hooks/useResponsiveTypography';

// Navigation model
export * from './navigation';

// Screens (presentation-level; apps own routing and platform config)
export * from './screens/BrowseScreen';
export * from './screens/DesignSystemScreen';
export * from './screens/HomeScreen';
export * from './screens/LibraryScreen';
export * from './screens/NowPlayingScreen';
export * from './screens/AccountScreen';
export * from './screens/PersonalizationScreen';
export * from './screens/SearchScreen';
