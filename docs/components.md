# Lavender Music — Component Library

All components live in `packages/ui` and are exported from `@lavender/ui`.
Every one supports light and dark themes, token-driven spacing/typography, and
the shared interaction states. Live preview: `/design`.

```tsx
import { PrimaryButton, GlassSurface, TrackRow } from '@lavender/ui';
```

## Interaction contract

Every pressable component renders through `Interactive`
(`packages/ui/src/interaction/Interactive.tsx`), so the state language is
identical everywhere:

| State | Visual | Implementation |
| --- | --- | --- |
| Default | token surface / transparent | `colors.surface`, `colors.border` |
| Hover | +`colors.hover` wash or 0.92 opacity | `onHoverIn/Out` (web + pointer devices) |
| Pressed | 0.98 scale + pressed wash | RN `Animated` timing, `motion.fast` |
| Focused | 2px `colors.focusRing` inset ring | `onFocus/onBlur`, keyboard + programmatic |
| Disabled | 0.45 opacity, no press scale, `aria-disabled` | `disabled` prop |
| Selected | `accentSubtle` fill + accent icon | `selected` / `active` prop |

Reduced motion: when the OS asks for reduced motion, the scale animation is
skipped (values snap) and skeleton/spinner loops hold still. No animation ever
touches glass opacity.

---

## Core

### `Text`

```tsx
<Text variant="largeHeading" tone="primary">Library</Text>
```

| Prop | Type | Default |
| --- | --- | --- |
| `variant` | `TypographyVariant` (13 options) | `body` |
| `tone` | `primary · secondary · tertiary · accent · favorite · inverse` | `primary` |
| `style`, `numberOfLines`, … | `TextProps` | — |

Use this instead of React Native `Text`: it applies the font stack, the type
scale and semantic colors.

### `Surface`

Neutral (non-glass) container: `tone: base | muted | strong | elevated`,
`cornerRadius`, `padding` (spacing token), `elevation: none | low | medium | high |
floating`, `bordered`.

### `Divider`

`orientation: horizontal | vertical`, `inset` (spacing token), optional centered
`label`. The only separator inside panels.

### `Spacer`

`size` (spacing token), `horizontal`, or `flex`. Replaces ad-hoc margins.

### `Icon`

`name` (typed Ionicons glyph), `size` (use `iconSize` tokens), `color`. Pair
outline glyphs with idle states and filled glyphs with active states.

### `Interactive`

The interaction primitive. Render-prop children receive
`{ hovered, pressed, focused }` so a component can style its own states. Props:
`onPress`, `disabled`, `pressedScale`, `focusRadius`, accessibility props.

---

## Buttons

All buttons share height, radius, typography and motion. Sizes: `sm 34`, `md 42`,
`lg 50`.

### `PrimaryButton`

The single primary action on a surface. Filled with `accentStrong` / `onAccent`.

```tsx
<PrimaryButton label="Play album" icon="play" onPress={play} />
```

| Prop | Type | Default |
| --- | --- | --- |
| `label` | `string` (required) | — |
| `icon`, `trailingIcon` | `IconName` | — |
| `size` | `sm · md · lg` | `md` |
| `loading` | `boolean` | `false` |
| `disabled`, `fullWidth` | `boolean` | `false` |
| `onPress` | `() => void` | — |
| `style` | `StyleProp<ViewStyle>` | — |

### `SecondaryButton`

Neutral raised surface with a hairline border. Same props as `PrimaryButton`.
Use for cancel/back and non-destructive secondary actions.

### `GlassButton`

Liquid Glass pill. Phase 01 API preserved: `variant: primary | secondary | tinted |
ghost`, where `secondary` renders glass. `size`, `icon`, `label`, `loading`,
`disabled`, `fullWidth`.

### `IconButton`

Circular icon-only control. `label` is **required** (accessible name).

| Prop | Type | Default |
| --- | --- | --- |
| `icon` | `IconName` | — |
| `label` | `string` | — |
| `variant` | `glass · solid · ghost` | `ghost` |
| `size` | `sm 30 · md 36 · lg 44` | `md` |
| `selected` | `boolean` | `false` |

### `ButtonBase`

The single implementation behind all of the above (`variant: primary | secondary |
glass | tinted | ghost`). Use it directly only for new intent presets.

---

## Navigation

### `NavigationItem`

One destination, shared by the tab bar and the sidebar.
`label`, `icon`, `activeIcon`, `active`, `collapsed` (rail, icons only),
`layout: row | stacked`, `appearance: default | minimal`, `onPress`. Default
row height is 48 with a 26px icon; `minimal` desktop rows are 44px with a 22px
icon, a quieter `accentSubtle` capsule and a 2px accent indicator. Stacked tabs
use height `tabBarHeight − 8` with a 26px icon and an 11px label.

### `GlassNavigation`

Responsive navigation shell: `items`, `activeKey`, `onSelect`, `collapsed`,
`appearance: glass | minimal`, `onLogoPress`, `footer`. Expanded width 252, rail
width 84.

- `minimal` (desktop ≥1024): flush white sidebar with a single right border,
  no blur or shadow, compact 44px rows and solid footer controls.
- `glass` (tablet): floating Liquid Glass rail with collapsed 26px icons.

The footer holds the theme control and the account/design-system links.

### `GlassTabBar`

Floating pill tab bar: `items`, `activeKey`, `onSelect`. It sits 12px above the
safe area, 68px tall, with 60px tab targets. The active tab gets a tinted lens
capsule with a hairline specular rim that cross-fades over `base` motion, a
filled 26px icon and a bold label; pressed tabs scale to 0.94 and dim slightly.
The whole bar uses the `navigation` glass material and does not run the hover
sweep.

Navigation items are data (`NavItem` in `navigation.ts`), so routes stay owned by
the apps. `activeNavKey(pathname)` maps a pathname to the active key.

---

## Music UI

### `Artwork`

Generated cover (`palette`, `size`, `cornerRadius`, `monogram`, `elevated`).
Each palette gradient is layered with a soft light disc, abstract planes, a
diagonal sheen, a bottom vignette and a hairline rim, so covers read as designed
art rather than flat swatches. `elevated` adds a drop shadow. Artist avatars are
the only circular artwork (`cornerRadius={radius.pill}`).

### `ArtworkCard`

Square cover + title + subtitle. Hover reveals a glass play badge, press scales
the card. Props: `title`, `subtitle`, `palette`, `width`, `onPress`,
`showPlayAffordance`, `accessibilityLabel`.

### `AlbumCard` / `PlaylistCard` / `ArtistCard`

Thin, semantic wrappers around `ArtworkCard` (artist uses the circular variant):
`album`, `playlist`, `artist`, plus `onPress`, `width`, `style`.

### `FeaturedAlbumHero`

The featured record panel shared by Home and Browse. `album`, `eyebrow`,
`description`, `genreName?`, `onPlay`, `onShuffle`, `onDetails?`. The cover's own
palette tints the left side of a neutral surface and the artwork casts a shadow.

- Compact: one action row — a flexible Play button plus glass icon buttons for
  shuffle and details, so nothing wraps at phone widths.
- Tablet/expanded: Play / Shuffle / Details buttons in a row, with a 132–148px
  cover and no facts column, so the title and actions retain their space.
- Roomy desktop (≥1180px): the `Album details` column (artist, released,
  songs, genre) fills the right side of the panel alongside the larger cover.

### `TrackRow`

`track`, `index`, `isPlaying` (animated equalizer + accent title), `isFavorite`,
`onPress`, `onToggleFavorite`, `onMenu` (adds the row actions button),
`showAlbum`, `divider`.

The row button and the favorite button are **siblings**, never nested — required
for valid HTML on web. At the compact breakpoint the provider badge and duration
are hidden and the gap tightens, leaving the title/artist and essential controls
room instead of clipping the name.

### `PlaybackProgress`

`value` (0–1), `variant: thin | standard`, `onSeek(fraction)` (adds a tap target
and knob), `accessibilityLabel`. Gradient fill is the only small gradient in the
system. Stays engine-agnostic.

### `GlassMiniPlayer`

`title`, `artist`, `palette`, `isPlaying`, `progress`, `isFavorite`,
`onTogglePlay`, `onNext`, `onToggleFavorite`, `onSeek`, `onPress`, `compact`,
`error` (replaces the artist line in the danger color), `isBuffering` (shows a
short “Buffering…” caption), `appearance: glass | minimal`, `tintColor`.

- `glass`: floating `player` material with an optional artwork-derived ambient
  tint (13% light / 16% dark); used on phone and tablet. The 44px play control
  and the artwork tint make it read as part of the record rather than a panel.
- `minimal`: solid white raised panel with a hairline border; used on desktop.

Hides favorite/skip controls when `compact`, and floats 8px above the tab bar.
`AppShell` omits the mini player — and, on compact, the tab bar — on
`/now-playing`, where the full player already owns transport controls.

### `TrackActionsSheet`

`track`, `visible`, `onClose`, `onPlayNext`, `onAddToQueue`, `onEdit?`,
`onRemove?`. Rows are queue actions; remove is a two-step confirm and only
appears for imported tracks.

### `TrackEditSheet`

`track`, `visible`, `onCancel`, `onSubmit({ title, artistName, albumTitle })`.
Three inputs with a Save/Cancel footer, used to fix metadata on imported files.

---

## Feedback

| Component | Props | Notes |
| --- | --- | --- |
| `LoadingState` | `label` | Accent `ActivityIndicator` + caption, `role="progressbar"`. |
| `EmptyState` | `icon`, `title`, `description`, `actionLabel`, `onAction` | Icon disc + one sentence + optional secondary action. |
| `ErrorState` | `title`, `description`, `retryLabel`, `onRetry` | Danger tint is the only red-adjacent surface; `role="alert"`. |
| `Skeleton` | `width`, `height`, `cornerRadius` | Opacity pulse (1.4s), static under reduced motion. |

---

## Browse

### `BrowseSection`

Discovery section wrapper: `title`, `subtitle`, `actionLabel`, `onActionPress`,
`children`. Renders a `SectionHeader` plus the section rhythm.

### `GenreCard`

`genre`, `albumCount`, `onPress`. Palette-gradient tile with a soft highlight, an
ink label (dark on the pale gradient in both themes) and a quiet play chip; lifts
with a shadow on hover.

### `MoodCard`

`mood`, `trackCount`, `onPress`. Wider gradient panel with a one-line
description, song count and a pale play disc.

---

## Search

### `SearchBar`

`value`, `onChangeText`, `placeholder`, `onSubmit`, `accessibilityLabel`,
`autoFocus`, `compact`. Glass field with a restrained accent tint and an
explicit clear control on phone/tablet; a solid white bordered field on desktop.

### `SearchResultRow`

`title`, `subtitle`, `palette`, `kind: album | artist | playlist | genre`,
`onPress`, `onPlay`. The row press and play control are siblings, never nested.

---

## Library

### `LibraryFilter`

`value`, `onChange` over `LibraryFilterKey` (`all · recent · songs · albums ·
artists · playlists · favorites`). Horizontally scrollable `Chip` row; the list
of filters is exported as `LIBRARY_FILTERS`.

### `SortMenu`

`value: LibrarySort` (`recent · title · artist`), `onChange`. Compact trigger
that opens a glass option sheet; the value lives in the persisted library
preferences.

### `PlaylistGrid`

`playlists`, `onOpen`, `columns?`. Responsive 2 → 4 column `PlaylistCard` wall.

### `EmptyLibraryState`

`icon`, `title`, `description`, `actionLabel`, `onAction`. Plain-surface empty
panel used by library categories.

### `PlaylistDetail`

`playlist`, `visible`, `onClose`. Track list with play/shuffle, favorite and
remove controls, plus inline rename and an inline delete confirmation for
listener-created playlists. Curated playlists are read-only. Everything happens
inside one sheet (no stacked dialogs).

---

## Overlays

### `Sheet`

The single overlay surface: scrim, centered Liquid Glass panel (overlay
material), title/subtitle, close control and scrollable body. Props: `visible`,
`onClose`, `title`, `subtitle`, `children`, `footer`, `maxWidth`, `scroll`.

Mount a sheet only while it is open (conditionally render it). On web, a closed
`Modal` portal is not reliably removed by toggling `visible`, so unmounting is
what dismisses it.

### `TextPromptSheet`

Single-field prompt built on `Sheet`: `visible`, `title`, `description`, `label`,
`initialValue`, `confirmLabel`, `onCancel`, `onSubmit`. Used for creating
playlists.

### `TrackCollectionSheet`

Shared detail view for albums, artists, genres, moods and curated collections:
artwork, description, Play/Shuffle, optional extra actions and a track list with
favorites. Props include `tracks`, `onPlay`, `onShuffle`, `onSelectTrack`,
`currentTrackId`, `isPlaying`, `isFavorite`, `onToggleFavorite`, `onRemoveTrack`,
`extraActions`, `children`.

---

## Chrome & layout

| Component | Purpose |
| --- | --- |
| `GlassSurface` | The glass primitive: `variant: subtle · standard · prominent`, or `material` (`thin · regular · thick · navigation · player · overlay`), `cornerRadius`, `highlight`, `edge`, `elevated`, `tintColor`, `tintSecondary`. Native uses `BlurView`; web uses a two-layer `backdrop-filter` stack (a thin, highly saturated rim band plus the inset body). Renders an opaque fallback when reduced transparency is on. |
| `ThemeProvider` | Resolves `system · light · dark`, exposes tokens, reduced motion and reduced transparency. |
| `ThemeControl` | Segmented or icon-only theme override; solid segmented control on desktop, glass on tablet. |
| `Screen` | Scrollable page frame: title block, actions, responsive gutters, chrome clearance. |
| `SectionHeader` | Section title + optional action link. |
| `Chip` | Filter/selection pill (`selected`, `icon`). |
| `ArtworkGrid` | Percentage-width responsive cover grid. |
| `AppShell` | Responsive shell: flush minimal sidebar on desktop, glass rail on tablet, floating glass tab bar on phone; solid/glass mini player respectively; account/design-system links; two edge-free accent washes; compact `/now-playing` hides the tab bar so playback controls never sit under chrome. |

Screens (`HomeScreen`, `BrowseScreen`, `SearchScreen`, `LibraryScreen`,
`NowPlayingScreen`, `DesignSystemScreen`) are exported by the package so both
apps mount identical presentation while owning their own routing.

`NowPlayingScreen` paints one decorative wash behind its content: a full-height
vertical gradient built from the current track's palette (strongest at the top,
fading to zero), at 13% alpha in light and 18% in dark. It sits under the neutral
page base and never touches the glass chrome, so the charcoal/bright foundation
and the approved glass intensity stay exactly as they are. The wash follows the
current track, so changing songs changes the room.

## Library data contract

`useLibrary()` (from `@lavender/music-library`, re-exported by `@lavender/ui`)
exposes the catalog plus the listener's persisted state:

| Field | Purpose |
| --- | --- |
| `catalog` | Centralized artists, albums, tracks, genres, moods, mixes and curation ids. |
| `favoriteTrackIds`, `isFavorite`, `toggleFavorite` | Persisted favorites. |
| `playlists`, `userPlaylists`, `playlistById` | Merged playlists (listener first, curated after). |
| `createPlaylist`, `renamePlaylist`, `deletePlaylist` | Local playlist management. |
| `addTracksToPlaylist`, `removeTrackFromPlaylist` | Track membership through `@lavender/playlists`. |
| `recentTrackIds`, `recentTracks`, `recordPlayed` | Recently played history. |
| `recentSearches`, `recordSearch`, `clearSearches` | Persisted search history. |
| `preferences`, `setSort`, `setView` | Persisted sort and grid/list layout. |
| `albumById`, `artistById`, `trackById`, `tracksForAlbum`, `tracksForArtist`, `tracksForPlaylist`, `tracksForIds` | Selectors with no duplicated records. |

---

## Accessibility conventions

- Every interactive component sets `accessibilityRole`, a label, and
  `accessibilityState` (`selected`, `disabled`).
- Icon-only controls require a `label`; assets and decorative gradients are
  `pointerEvents="none"` and hidden from assistive tech.
- Focus rings are always visible (`focusRing` at 2px) and never rely on color
  alone.
- Tabular numerals prevent layout shift in times and counts.
- Text contrast: body text uses `text` on `surface`/`background`; accent text is
  only used at ≥ `caption` size, never for long copy.

---

## Adding a component

1. Compose existing primitives (`Interactive`, `GlassSurface`, `Surface`,
   `Text`) — do not reimplement blur, press feedback or typography.
2. Read every value from `useTheme()`.
3. Support the full state set; verify keyboard focus and reduced motion.
4. Keep platform forks to `Foo.tsx` (native) and `Foo.web.tsx` with identical
   props, and export the props type.
5. Export from `packages/ui/src/index.ts`, add it to the showcase, and document
   it here.
