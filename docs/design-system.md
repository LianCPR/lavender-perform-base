# Lavender Music — Design System

Premium, minimal, neutral-first. Light mode is the initial appearance; lavender
and pink are accents, never the page.

One brand, two deliberately different chrome systems:

- **Desktop (≥ 1024px):** a near-white minimal workspace — flush sidebar, solid
  fields and player, restrained lavender selection. Liquid Glass is reserved for
  overlays and transient surfaces, never the page frame.
- **Tablet and phone (< 1024px):** Liquid Glass navigation, tab bar and mini
  player, with layered blur, edge refraction, specular highlights and an
  artwork-derived ambient tint.

Application state, routing, data and music logic are shared; only presentation
switches with available space.
This document describes the design language and how it is implemented; exact
values live in [design-tokens.md](design-tokens.md) and per-component APIs in
[components.md](components.md).

Live reference: run the app and open `/design` (sidebar footer → **Design
system**, or the palette icon in the mobile header).

## 1. Principles

1. **Calm surfaces, warm accents.** Grayscale carries structure; brand color
   marks selection, progress, favorites and one hero moment per screen.
2. **Hierarchy through material, not decoration.** Glass separates chrome from
   content; borders and elevation are quiet and consistent.
3. **Typographic confidence.** Tight, optically tracked headings over generously
   spaced body copy; tabular numerals wherever numbers can change.
4. **One motion language.** Short durations, small distances, cancels on
   reduced-motion. Nothing bounces or draws attention to itself.
5. **Shared by construction.** iOS and web consume the same tokens and
   components; platform forks keep identical props.
6. **Material follows context.** Desktop chrome is solid and quiet; touch-first
   chrome is optical glass. Neither reimplements the other's layout model.

## 2. Foundations

| Area | Where | Summary |
| --- | --- | --- |
| Color | `tokens/palette.ts`, `theme/colors.ts` | Neutral ramp + six brand primitives; semantic tokens resolved per scheme. |
| Typography | `tokens/typography.ts` | 13 variants, responsive ramp `0.94× → 1.03×`, platform system font. |
| Spacing | `tokens/spacing.ts` | 4pt-derived scale from `xxs 2` to `giant 56`. |
| Geometry | `tokens/radius.ts`, `tokens/border.ts` | Artwork 10 · control 14 · card 16 · glass 26 · pill 999; hairline default. |
| Elevation | `theme/elevation.ts` | Four levels with native and web shadow output. |
| Layout | `tokens/layout.ts` | Breakpoints, gutters, grid, content widths, chrome clearance, z-index. |
| Glass | `tokens/glass.ts`, `theme/glass.ts` | Three semantic variants over six materials. |
| Icons | `tokens/icon.ts` | Six sizes, one family, outline/filled convention. |
| Motion | `tokens/motion.ts` | Durations, easings, scales, shimmer/spinner timing, opacity states. |

Full value tables: [design-tokens.md](design-tokens.md).

Typography variants:

`display` · `largeHeading` · `sectionHeading` · `subheading` · `headline` ·
`body` · `callout` · `secondary` · `caption` · `micro` · `label` · `numeric` ·
`playback`

Use `Text` with a `variant` — never raw sizes. For display-scale text that must
breathe on smaller screens, use `useResponsiveTypography()` (or the `typeScale`
factor for the active breakpoint).

## 3. Theme system

```
ThemeProvider (packages/design-system/src/theme/ThemeProvider.tsx)
  mode: 'light' | 'dark' | 'system'         (Light default, persisted, see below)
  os reducedMotion                         → useReducedMotion()
  os reducedTransparency                   → useReducedTransparency()
  → resolved scheme (useColorScheme / prefers-color-scheme)
  → theme = createTheme(scheme)
```

- `useTheme()` returns the resolved theme: `colors`, `glass`, `radius`,
  `spacing`, `typography`, `typeScale`, `border`, `elevation`, `opacity`,
  `layout`, `motion`, `icons`, `artwork`.
- `useThemeMode()` returns `{ mode, scheme, setMode }`; `ThemeControl` exposes it
  (solid segmented control in the desktop sidebar, glass segmented control on
  tablet, icon button on phones and in the showcase).
- **Reduced transparency is a material switch, not a color tweak.** Web reads
  `prefers-reduced-transparency: reduce`; native reads
  `AccessibilityInfo.isReduceTransparencyEnabled()`. `GlassSurface` then renders
  an opaque `surface`/`backgroundElevated` panel with the stronger border, no
  backdrop blur, no sheen and no moving reflection, so every control remains
  legible without relying on the content underneath.
- **The choice persists.** `setMode` writes through `theme/themeStorage.ts`.
  On web that is `localStorage` under `lavender.theme-mode`, so an explicit
  Light or Dark choice survives a reload and the app opens in it. `system` is
  stored as a preference too — the resolved scheme is never persisted, so
  returning to `system` keeps following the OS appearance.
- **Native is a seam, not a fork.** Native has no storage wired up yet, so the
  adapter is registered with
  `setThemeModeStorage({ read, write })` once a device-local store
  (AsyncStorage, SQLite, preferences) exists; until then the native choice lasts
  for the session only. A stored value always wins over `initialMode`, invalid
  values are ignored, and blocked storage (private browsing) degrades to
  session-only instead of throwing. There is no cross-tab sync.
- On web the provider also sets `color-scheme` and the document background so
  overscroll and browser chrome match.
- Scheme is resolved once and passed down; components never read
  `useColorScheme` directly, so a theme override is always coherent.

## 4. Liquid Glass

Glass is a hierarchy of chrome, not a texture. `GlassSurface` is the only
component that implements blur; everything else composes it.

### 4.1 Variants

| Variant | Material | Character | Typical use |
| --- | --- | --- | --- |
| `subtle` | `thin` | Highest transparency, lightest edge, minimal depth | chips, inline fields, glass buttons, dense list panels |
| `standard` | `regular` | Balanced tint and blur, soft lift | floating panels, grouped controls, default chrome |
| `prominent` | `thick` | Deepest tint and lift, still a restrained edge | players, overlays, modal chrome, active surfaces |

Chrome materials remain available where hierarchy is more specific than the
three variants: `navigation`, `player`, `overlay`.

### 4.2 Layers

Web and native build the same material from the same tokens; only the backdrop
implementation differs. The order below is the paint order, bottom first.

1. **Refraction band** — the material is thinnest at the edge, so the edge must
   transmit a *clearer* image than the body. On web a full-bleed backdrop layer
   renders at `refractionBlurPx` (4px) and `refractionSaturation` (215–245%),
   and the body below covers its centre; the 6–12px band that remains around
   the edge is the optical rim. No mask is involved, so the fallback is the
   intended result. Native cannot re-sample its own backdrop, so a 1px
   `rimLight` bevel is painted inside the shape instead.
2. **Body material** — `backdrop-filter: blur() saturate() brightness()` on web,
   `BlurView` on native. Chrome blurs 26–28px at 215–220% saturation; content
   glass uses 12–20px at 165–175%. Saturation, not paint, is what keeps colour
   alive through the blur; brightness is lifted 2–4% in light and dropped 4–10%
   in dark so the material stays grounded in its backdrop.
3. **Body tint** — translucent fill (white in light, charcoal in dark), tuned per
   material and deliberately low: 0.26–0.34 light / 0.24–0.44 dark. Chrome keeps
   the most (navigation 0.32 / 0.44, player 0.28 / 0.40). The blur, not the fill,
   now carries legibility — a 60%+ white wash is what makes glass look grey.
4. **Specular bloom** — a radial highlight from a light above the surface,
   confined to the top third so it reads as a reflection rather than a white
   overlay.
5. **Material thickness** — a vertical gradient (clear top, neutral middle,
   faintly shaded bottom) plus an inset lower bevel. Together they make the sheet
   read as convex.
6. **Ambient artwork wash** — optional `tintColor` and `tintSecondary` supplied by
   content under the glass (the current track's artwork palette). Two restrained
   radial washes at 0.24 / 0.07 alpha (light) place the cover's colour at the
   leading edge and its lighter tone at the far corner. Never an opaque fill.
7. **Optical edge** — a hairline outer border, an inset specular top edge
   (`rimLight`, 56–68% light / 24–30% dark), a faint bright left rim, a darker
   right rim and a `caustic` line along the bottom where light passes through.
8. **Depth and reflection** — a wide ambient shadow plus a tight 1px contact
   shadow, so the surface floats instead of being pasted on, and a short specular
   sweep for pointer/touch. The sweep is limited to small interactive glass
   (fields, chips, glass icon buttons); navigation bars and players never sweep
   on hover. It runs once, never loops, and is disabled with reduced motion.

### 4.3 Rules

- Glass only for navigation, floating controls, players, overlays and **selected**
  surfaces. Cards, rows and page backgrounds are solid.
- Never blur or tint the page background; it stays a flat neutral color.
- Glass always sits over content, artwork or a wash — never over empty space.
- Do not animate opacity of a glass surface below 1; animate position and scale.
  The reflection layer itself may fade because it is a decorative child, not the
  blur material.
- Android has no backdrop blur in this stack; glass degrades to a tint-only
  surface, so glass is never the only cue for state.
- **Platform appearance:** `GlassNavigation` takes `appearance: glass |
  minimal`; `GlassMiniPlayer` takes the same. Desktop passes `minimal`, tablet
  passes `glass` with a collapsed rail, phone uses the glass tab bar. Search and
  theme controls switch to solid fields on desktop.
- Do not stack glass on glass. The mini player and tab bar float over content,
  not over each other; sheets are the only glass over glass context.
- Floating chrome shares one baseline: the tab bar sits 12px above the safe
  area and the mini player sits 8px above the tab bar. On compact `/now-playing`
  the tab bar is hidden so the transport row owns the bottom edge.
- Reduced transparency wins over every decorative layer: opaque material,
  no backdrop filter, no sheen, no reflection.
- Reduced motion removes the material cross-fade and the specular sweep; state
  changes remain, they simply happen instantly.

## 5. Interaction & animation

`Interactive` (`packages/ui/src/interaction/Interactive.tsx`) is the single
pressable primitive: `Animated` press scale, hover/focus tracking, disabled
handling, and reduced-motion awareness.

| State | Feedback |
| --- | --- |
| Default | token surface, hairline border where the component needs an edge |
| Hover | 4–6% neutral wash (pointer devices only) |
| Pressed | 0.98 scale + 7–10% wash, released over `base` |
| Focused | 2px `focusRing` inset ring, always visible, keyboard reachable |
| Disabled | 45% opacity, no scale, `aria-disabled`, press ignored |
| Selected | `accentSubtle` fill, accent icon/text, optional capsule |

Motion values: `fast 120` for color/opacity, `base 180` for press and hover,
`slow 260` for glass panels entering, `slower 420` reserved for overlays. Easing
is `cubic-bezier(.2,0,0,1)` (standard) or `(.3,0,0,1)` (emphasized). Scale
changes never exceed 2%. Under reduced motion, transforms snap to their end
state, skeletons stop pulsing and spinners keep only a minimal rotation.

## 6. Icons & artwork

- **Icons:** Ionicons only; sizes from `iconSize` (12/15/18/22/26/40); outline
  glyphs for idle chrome, filled glyphs for active or primary actions; icon-only
  controls always carry an accessible label.
- **Artwork:** always square with `radius.artwork` (10) — deliberately the least
  rounded element. Only artist avatars are circular. Cover art is never stretched
  or cropped by a parent: grid items size from their own width.
- **Generated covers:** five palette keys (`rose`, `lavender`, `plum`, `haze`,
  `dusk`) resolve to per-theme gradients. Real images replace them without
  changing layout.
- **Artwork prominence:** a cover is the largest, highest-contrast element in any
  card; metadata stays `secondary` or smaller.

## 7. Responsive rules

| Breakpoint | Width | Navigation | Grid | Gutter | Chrome clearance |
| --- | --- | --- | --- | --- | --- |
| `compact` | < 768 | mobile header + floating glass tab bar | 2 col | 16 | 210 (tab bar + player) |
| `medium` | ≥ 768 | floating glass icon rail (84) | 3 col | 24 | 140 |
| `expanded` | ≥ 1024 | flush minimal sidebar (252) | 4 col | 32 | 140 |
| `wide` | ≥ 1440 | flush minimal sidebar | 5 col | 40 | 140 |

- `useBreakpoint()` is the only place a width becomes a layout decision;
  `gridColumns()` maps it to column counts.
- Content is capped by `contentWidth` (`reading 680`, `standard 1180`,
  `wide 1320`) so text never runs full-bleed on a 4K display.
- Desktop is not a stretched phone: the sidebar is flush, fields are solid,
  and the mini player is a solid raised panel. Tablet keeps the floating glass
  rail and player. Phone gets the full floating Liquid Glass chrome.
- The mini player floats bottom-right on desktop/tablet and above the tab bar on
  phones; it is suppressed on `/now-playing`, where the full view owns playback.
  `Screen` reserves `chromeClearance` so content is never trapped.
- Account, personalization and design-system routes intentionally leave every
  primary tab unselected instead of falsely highlighting Home.
- Typography scales per breakpoint (see §2); spacing and radii do not.

## 8. Components

Inventory, props and usage: [components.md](components.md). Groups:

| Group | Components |
| --- | --- |
| Core | `Text`, `Surface`, `Divider`, `Spacer`, `Icon`, `Interactive` |
| Buttons | `PrimaryButton`, `SecondaryButton`, `IconButton`, `GlassButton`, `ButtonBase` |
| Navigation | `NavigationItem`, `GlassNavigation`, `GlassTabBar` |
| Music | `Artwork`, `ArtworkCard`, `AlbumCard`, `PlaylistCard`, `ArtistCard`, `TrackRow`, `PlaybackProgress`, `GlassMiniPlayer` |
| Feedback | `LoadingState`, `EmptyState`, `ErrorState`, `Skeleton` |
| Chrome | `GlassSurface`, `ThemeControl`, `Screen`, `SectionHeader`, `Chip`, `ArtworkGrid`, `AppShell` |

Every component: light + dark, token-only values, full state set, reduced-motion
aware where it animates, accessible name and role.

## 9. Design system showcase

`DesignSystemScreen` (`packages/ui/src/screens/DesignSystemScreen.tsx`) is mounted
at `/design` in both apps and is reachable without touching the main navigation.

It demonstrates, in order:

1. Theme control and live breakpoint/scale readout.
2. Typography hierarchy (all 13 variants with metrics).
3. Color palette (brand primitives and every semantic token).
4. Spacing, radius and elevation scales.
5. Glass variants over artwork, plus chrome materials.
6. Buttons: variants, sizes, disabled/loading, icon buttons, state language.
7. Navigation: floating tab bar, sidebar items, full sidebar and rail.
8. Music UI: cards, track rows with playback state, progress, mini player.
9. Feedback: loading/empty/error previews and skeleton compositions.

The page is a demonstration surface, not the Home Screen: it exists to verify
the system in both schemes at any width.

## 10. Conventions

- Add a token before adding a value; components never contain raw hex, radius or
  shadow numbers.
- One pressable primitive (`Interactive`); one blur implementation
  (`GlassSurface`); one typography implementation (`Text`).
- New component variants extend existing components rather than duplicating
  them; deprecated props are kept as aliases to avoid breaking Phase 01 callers.
- Platform forks use `Foo.tsx` / `Foo.web.tsx` with identical exported props.
- Every new component is exported from `packages/ui/src/index.ts`, added to the
  showcase and documented in [components.md](components.md).

## 11. Verification

- `npm run typecheck`, `npm run lint`, `npm run build:web`.
- Both schemes at 1440×900, 1280×800, 1024×768, 768×1024, 430×932,
  390×844 and 375×812; keyboard focus visible on every control.
- Reduced-motion override checked in OS settings; reduced transparency checked
  through `prefers-reduced-transparency` (opaque glass fallback).
- Horizontal overflow is checked with `document.documentElement.scrollWidth` at
  every viewport.
- Phase 01 behaviour (navigation, theming, mini player, library/search/browse)
  must remain intact after design-system changes.

Known limitations: iOS was not built or run on this Windows machine (no Xcode);
Android has no backdrop blur, so glass is tint-only there; artwork is generated
until real cover assets exist; glass over very bright artwork can reduce text
contrast, which is why text is never placed on `subtle` glass over busy covers.
