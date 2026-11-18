# Design evolution — dual desktop and Liquid Glass experiences

Date: 18 November 2026

## 1. Objective

Evolve Lavender Music without forking the product:

- **Desktop web (≥ 1024px):** a minimal, near-white, premium music workspace.
- **Tablet (768–1023px):** a hybrid with a floating glass rail and roomier content.
- **Phone (< 768px):** an Apple iOS 26-inspired Liquid Glass experience with
  floating navigation, layered translucency, optical depth and fluid controls.

Authentication, routing, playback, queue, playlists, library, search, metadata,
personalization and provider integrations remain shared. No business logic was
duplicated for presentation.

## 2. Apple research used

The implementation follows Apple's published design material rather than generic
CSS glassmorphism:

- [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
- [Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [HIG — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [`glassEffect(_:in:)`](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:))
- [Meet Liquid Glass — WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Build a SwiftUI app with the new design — WWDC25 323](https://developer.apple.com/videos/play/wwdc2025/323/)
- [Build a UIKit app with the new design — WWDC25 284](https://developer.apple.com/videos/play/wwdc2025/284/)
- [Get to know the new design system — WWDC25 356](https://developer.apple.com/videos/play/wwdc2025/356/)
- [Apple design resources](https://developer.apple.com/design/human-interface-guidelines)
- [Landmarks sample](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass)

Principles extracted and applied:

1. Liquid Glass is a **functional layer** for controls and navigation, not a
   texture for content cards, lists, album grids or page backgrounds.
2. Lensing, specular light, shadow, edge refraction and adaptive tint work as one
   material system; they are not separate decorative effects.
3. Larger functional surfaces need a more defined material than small ones;
   navigation and the player therefore use a stronger tint than chips/fields.
4. Glass should pick up the color and luminance of the content beneath it. The
   mini player samples the current artwork palette, at low alpha.
5. Avoid stacking glass layers. Content sits under chrome; sheets are the only
   glass-over-glass context.
6. Typography and controls must remain legible over arbitrary artwork. Material
   opacity is deliberately higher than a showroom glassmorphism demo.
7. Reduced transparency makes materials opaque/frosted; increased contrast
   strengthens edges; reduced motion removes elastic and reflection motion.
8. Fewer, better effects beat many filters. One backdrop filter per material,
   no looping GPU animation, no filter on scrolling content.

A web app cannot use Apple's private rendering engine. The web implementation
therefore approximates lensing with layered gradients, directional edge lighting
and inset shadows; it does not claim pixel parity with native iOS. Native iOS
should use `glassEffect` and system materials where available.

## 3. Screen audit before implementation

| Route | Existing composition | Change required |
| --- | --- | --- |
| `/` Home | Featured hero, online sections, history, recommendations, playlists | Desktop solid hero/player; phone glass chrome and artwork tint |
| `/browse` | Featured discovery, genres, moods, new releases | Keep content cards solid; desktop shell flush |
| `/search` | Glass search field, filters, recents, categories | Solid desktop field; defined glass field on phone |
| `/library` | Filters, playlist grid, recently added, imported music | Shared content; responsive chrome only |
| `/now-playing` | Full artwork, transport, seek, queue, lyrics | Suppress duplicate mini player; keep tab bar off the transport row |
| `/account` | Guest/account state, personalization link | No false active tab |
| `/personalization` | Taste profile, history, privacy | No false active tab; compact history remains date-only |
| `/design` | Token and component showcase | Reflect new materials and appearances |

Reusable chrome audited: `AppShell`, `GlassNavigation`, `NavigationItem`,
`GlassTabBar`, `GlassMiniPlayer`, `SearchBar`, `ThemeControl`, `GlassSurface`,
`GlassButton`, `Screen`. Content components (`Surface`, cards, rows, grids)
remain solid in both experiences.

## 4. Implemented design foundation

### 4.1 Material and accessibility

`GlassSurface` now provides one material implementation with:

- platform backdrop blur, saturation and a small brightness correction;
- a translucent material tint;
- a four-sided optical rim (bright top/left, shaded bottom/right, inner bottom
  depth) layered as inset shadows;
- top sheen and a diagonal refraction band;
- optional `tintColor` ambient wash from content (8.5% light / 12% dark);
- an opaque fallback when `prefers-reduced-transparency` /
  `AccessibilityInfo.isReduceTransparencyEnabled()` is active;
- the existing reduced-motion suppressible specular sweep.

`ThemeProvider` exposes `useReducedTransparency()` alongside
`useReducedMotion()`. The fallback keeps the border, radius and elevation but
removes blur and every decorative sheen, so navigation labels and player text no
longer depend on the background.

### 4.2 Desktop appearance

- `GlassNavigation appearance="minimal"`: flush `backgroundElevated` sidebar,
  right hairline border, 44px rows, 22px icons, quiet accent capsule and a 2px
  accent indicator. No blur, shadow or floating gutter.
- `GlassMiniPlayer appearance="minimal"`: solid `surface` panel, hairline
  border, medium elevation.
- `SearchBar`: solid white field with hairline border and focus border.
- `ThemeControl`: solid segmented control.
- Content remains near-white; lavender appears in active navigation, one hero
  wash, play actions, progress and favorites.

### 4.3 Tablet appearance

- 84px floating glass rail with collapsed icons.
- No header; content gains vertical space.
- 3-column grids, 132–148px featured artwork, facts column deferred until the
  card is genuinely wide.
- Glass mini player remains floating bottom-right with an artwork wash.

### 4.4 Phone appearance

- Floating glass tab bar, 68px, pill geometry, adaptive 66% / 70% material tint,
  12px above the safe area and 8px below the mini player.
- Floating glass mini player above the tab bar; artwork palette wash at low
  alpha; 26px active navigation icons; active capsule.
- Solid content surfaces keep album lists and metadata readable.
- `/now-playing` no longer renders a second mini player over its transport row;
  on phones the tab bar is hidden there too, so the full-screen player's
  transport row owns the bottom of the screen.
- The shell reserves bottom clearance for both floating surfaces; the mini
  player sits 8px above the tab bar.

## 5. Shared application logic

No provider, route, player method, library selector or sync path changed.
`AppShell` still composes the same `PlayerProvider`, `LibraryProvider` and
`NavigationThemeProvider`; it only selects a presentation appearance from the
existing `useBreakpoint()` tier. Desktop/tablet/phone use the same mini player
component, the same navigation item model and the same `GlassSurface` primitive.

## 6. Verification

Automated, run at repository root on 18 November 2026:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Pass (all workspaces) |
| `npm run lint` | Pass (no warnings/errors) |
| `npm run build:web` | Pass (static export) |

Browser checks in the packaged Chromium preview against the live dev server:

| Viewport | Layout tier | Overflow | Result |
| --- | --- | --- | --- |
| 1440×900 | wide, flush sidebar | none | Desktop home, search and now-playing inspected |
| 1280×800 | expanded, flush sidebar | none | Shell, sidebar footer and content bounds checked |
| 1024×768 | expanded, no facts column | none | Featured card 708px inside 1024px with 32px gutters |
| 768×1024 | medium, glass rail | none | Featured card ends at 744px; rail + content fit |
| 430×932 | compact, tab bar | none | Featured card 398px; tab bar present |
| 390×844 | compact, tab bar | none | Home, search, library, account, browse, personalization, now-playing inspected |
| 375×812 | compact, tab bar | none | Hero 343px; four tabs; no horizontal overflow |
| 320×800 | compact, tab bar | none | Every route inspected; hero actions full width; now-playing transport clears the bottom edge |

Additional browser findings and fixes:

- Compact `/now-playing` had the mini player covering its own controls; the
  shell now suppresses the mini player on that route.
- Search fields over a white page had almost no visible edge; the phone field
  now has a restrained accent tint and a stronger border.
- Account/personalization/design routes incorrectly highlighted Home in the tab
  bar; unmatched routes now leave every tab unselected.
- Phone tab-bar opacity was raised so labels stay legible over busy artwork;
  the material remains translucent and still shows the content beneath.
- At 320px the featured hero's text column collapsed to roughly 160px, so the
  metadata ellipsised to “10 …” and the Play control was squeezed into a narrow
  column beside the cover. Compact heroes now use an 88px cover, a full-width
  action row with 44px icon targets, and a single `artist · year` line below
  360px (the track count stays available in album details).
- The compact Now Playing transport needed 288px inside a 272px column at
  320px, pushing shuffle/repeat to the screen edges. Compact now uses 8px gaps
  and a 60px play button, and the screen drops the 240px chrome clearance since
  its tab bar is hidden.
- The floating mini player sat only 4px above the tab bar at every phone width;
  it now clears it by 8px.
- Dark mode was inspected on Home and Now Playing; light mode on all checked
  screens. Theme preference was restored to Light after QA.

## 7. Phase 2 — visual fidelity refinement (18 November 2026)

Phase 2 kept every provider, route, screen and interaction but rebalanced the
material system and the floating chrome. The full before/after set lives in
`docs/qa/phase2/`.

### 7.1 Material rebalance

| Token | Before | After | Why |
| --- | --- | --- | --- |
| `navigation` blur / intensity | 44px / 72 | 30px / 62 | Less milky backdrop; tint carries contrast |
| `player` blur / intensity | 38px / 70 | 26px / 58 | Artwork shows through the player |
| `regular` / `thick` blur | 26 / 36px | 20 / 28px | Chrome and content glass stay distinct without heavy blur |
| Navigation tint | 72% / 74% | 66% / 70% | Calmer fill, still legible |
| Player tint | 60% / 66% | 54% / 62% | More artwork interaction |
| Chrome border | 0.22–0.23 alpha | 0.11–0.12 | Removes the painted grey outline |
| Top specular rim | 52% white | 40% white (14% dark) | A highlight, not a white stroke |
| Backdrop saturation | 168% | 138% | No neon color cast |

Removed entirely: the full-surface diagonal refraction band, the bright white
lower haze, and the pointer light sweep on navigation/player surfaces (it now
belongs only to small interactive glass). A restrained vertical material
gradient replaced the diagonal band, and the artwork tint moved from 8.5% / 12%
to 13% / 16%.

### 7.2 Navigation and player

- Tab bar: 12px above the safe area, 60px targets, cross-fading tinted lens
  capsule with a hairline specular rim, pressed scale 0.94. Labels keep 11px but
  use neutral tracking.
- Mini player: 44px play control, stronger artwork tint, shared 8px gap above
  the tab bar, and one glass layer only.
- Now Playing on phones: subtitle removed and cover capped at 260px so the
  Up Next / Lyrics panel is visible on first paint; the tab bar is hidden on this
  route (the screen provides “Back to Home”) so the transport row never sits
  under chrome.
- Desktop: kept solid near-white chrome and removed the extra left accent bar in
  sidebar/rail rows; the selected capsule and accent label remain the only cue.

### 7.3 Visual QA

Headless Edge (CDP) captured true full-width images because the packaged preview
panel renders a 390px crop. Each size was checked light/dark where applicable:

| Viewport | Tier | Result |
| --- | --- | --- |
| 1440×900 | wide, minimal sidebar | Home, Search, Now Playing, light + dark |
| 1024×768 | expanded, minimal sidebar | Home light + dark |
| 768×1024 | medium, glass rail | Home + playing mini player, light + dark |
| 430×932 | compact | Home light + dark |
| 390×844 | compact | Home, Browse, Search, Library, Account, Personalization, Now Playing; light + dark |
| 375×812 | compact | Home light + dark |

No horizontal page overflow (`scrollWidth === innerWidth`) at any checked size.
The mini player and tab bar no longer cover transport or tab controls.

### 7.4 Regression smoke test (live app, 390×844)

| Flow | Result |
| --- | --- |
| Play / pause via mini player | Pass — pause state, resume, no error |
| Track switching (hero, playlist, track row) | Pass — mini player and Now Playing update |
| Queue panel | Pass — 4-track queue renders; selecting a row changes the current track |
| Mini player | Pass — opens Now Playing, compact hides skip/favorite, 44px play |
| Now Playing | Pass — transport, seek, volume, queue/lyrics tabs, no tab-bar overlap |
| Navigation | Pass — Search and Library tabs, Account and Personalization links |
| Search | Pass — typed “aurora”, Songs/Albums/Artists/Playlists returned |
| Library / Account / Personalization | Pass — render, guest state and controls intact |

Provider tracks without an authorized stream still report the existing provider
message (“Audius does not offer an authorized stream”); demo tracks without audio
still report “This demo track has no audio file”. Neither is a regression.

### 7.5 Accessibility

- Reduced transparency, emulated through CDP: `prefers-reduced-transparency:
  reduce` matched and the page rendered **zero** elements with a backdrop filter;
  floating chrome became opaque with the strong border and no sheen.
- Reduced motion, emulated through CDP: `prefers-reduced-motion: reduce` matched,
  the glass transition computed to `0s`, and the specular sweep is not rendered.
- Native Reduce Transparency / Reduce Motion could not be exercised on this
  Windows host (no iOS device or simulator).

## 8. Phase 11 — true material refinement (18 November 2026)

Phase 2 calmed the glass but left it looking like a translucent grey container.
Phase 11 rebuilds the material itself. No player, navigation, data or provider
code changed. Evidence: `docs/qa/phase11/`.

### 8.1 What was actually wrong

Phase 2 lowered blur and tint, but the *structure* was still a single
`backdrop-filter` plus a uniform border, so:

- the navigation fill (66% white) was the dominant layer over a `#FAFAFA` page,
  which is why the bar read as a grey slab rather than as glass;
- the edge was one 1px inset highlight on all four sides — a painted outline, not
  a bevel that responds to the background;
- the artwork wash was a single 13% diagonal gradient, effectively invisible
  against a light surface;
- there was one soft shadow, so the surface looked pasted on rather than
  floating;
- nothing made the edge optically different from the body, which is the cue
  people actually read as “glass”.

### 8.2 The material now

| Token | Phase 2 | Phase 11 | Why |
| --- | --- | --- | --- |
| Navigation tint | 66% / 70% | **32% / 44%** | The fill is no longer the legibility mechanism |
| Player tint | 54% / 62% | **28% / 40%** | Artwork colour reaches the surface |
| Navigation blur / intensity | 30px / 62 | 28px / 62 | Body still diffuses content into colour, not readable text |
| Player blur / intensity | 26px / 58 | 26px / 60 | Unchanged radius, more body |
| Content glass blur | 20 / 28px | **16 / 20px** | Small controls stay crisp |
| Backdrop saturation | 138% flat | **165–220% body, 215–245% rim** | Colour survives the blur instead of turning grey |
| Rim band | none | **6–12px at 4px blur** | The thin edge transmits a clearer, more chromatic image |
| Edge light | one 0.40 / 0.14 inset | `rimLight` 0.56–0.68 light · 0.24–0.30 dark, plus `caustic` | Directional bevel + light through the bottom edge |
| Artwork wash | one diagonal 13% / 16% | **two radials, 24% / 7% light, 26% / 13% dark** | Cover colour at the leading edge, lighter tone at the far corner |
| Shadow | one 8–10px ambient | **ambient + 1px contact + lower inner bevel** | Floats above content instead of sitting on it |

Layer order (paint order) is documented in `docs/design-system.md` §4.2:
refraction band → body → tint → specular bloom → thickness ramp → artwork washes
→ optical edge → shadows.

Two surfaces, two jobs: the tab bar is a full pill with the widest refraction
band (12px) and the softest bloom; the mini player is a tighter tile (11px band)
with the strongest artwork wash and a bevel on its play control, so it reads as a
separate piece of glass rather than part of one bottom overlay.

The web mask approach was removed. Chromium/RN Web dropped `mask-composite`, and
the inset body already forms the band, so the implementation no longer depends on
an unsupported property and behaves identically in every browser.

### 8.3 QA and measurements

All four required widths were captured in light and dark, plus scrolled states
where artwork sits under the chrome, Now Playing, and the two accessibility
modes. See `docs/qa/phase11/README.md` for the full index.

| Check | Result |
| --- | --- |
| 430 × 932, 408 × 844, 390 × 844, 375 × 812 | Captured light + dark; labels on one line, no clipping, no horizontal overflow |
| Background interaction | Artwork colour visible through both surfaces at every width |
| Overlapping surfaces | 8px gap preserved; bar never covers the player, player never covers transport |
| Reduced transparency | **0** backdrop-filter layers; opaque fallback with strong border |
| Reduced motion | **0s** transition on all 37 glass roots; **0** sweep layers |
| Text contrast | Labels remain dark-on-light in light mode at every captured size |
| Typecheck / build | `npm run typecheck` and `npm run build:web` pass |

### 8.4 Native and web are different materials

iOS renders Liquid Glass with `glassEffect`, which lenses the backdrop per
pixel. This app uses `expo-blur` (`UIVisualEffectView`) natively and layered
`backdrop-filter` on web. Neither is `glassEffect`: the native side is a system
*standard material* with the design's layers painted on top, and the web side is
a two-layer approximation with a clearer, more saturated rim band instead of true
displacement. Both are documented as such in `docs/design-system.md` and
`docs/qa/phase11/README.md`; neither is described as authentic Liquid Glass.

## 9. Known limitations

- iOS was not built or run on this Windows host (no Xcode/simulator). The native
  `BlurView` fork compiles but was not visually verified against iOS 26.
- The web approximation uses layered gradients and backdrop blur, not SVG
  displacement maps. True per-pixel refraction remains native-only.
- Reduced transparency is implemented and type-checked but could not be toggled
  through the packaged browser's emulation; it should be verified once in macOS
  System Settings → Accessibility → Display → Reduce transparency and on iOS.
- The preview surface captured a narrower crop than the emulated desktop width
  in some sessions; desktop right-edge geometry was therefore also checked via
  DOM bounds (`scrollWidth`, card and facts-column rectangles), not only pixels.
- No audio playback verification was repeated in this design phase; no player
  engine code changed.
