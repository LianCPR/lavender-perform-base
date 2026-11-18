# Phase 2 visual QA — before / after

Captured on 18 November 2026 against the live Expo web dev server
(`http://localhost:8081`). The packaged preview panel renders a 390px crop even
when its viewport is wider, so these images were captured in headless Edge over
the Chrome DevTools Protocol at the exact viewport, with the app theme and
accessibility media features emulated before navigation.

## Before / after pairs

| Screen | Before | After |
| --- | --- | --- |
| Desktop Home, 1440 light | `before-desktop-1440-light.png` | `after-desktop-1440-light.png` |
| Desktop Home, 1440 dark | `before-desktop-1440-dark.png` | `after-desktop-1440-dark.png` |
| Tablet Home, 1024 light | `before-tablet-1024-light.png` | `after-tablet-1024-light.png` |
| Tablet Home, 768 light | `before-tablet-768-light.png` | `after-tablet-768-light.png` |
| Mobile Home, 430 light | `before-mobile-430-light.png` | `after-mobile-430-light.png` |
| Mobile Home, 390 light | `before-mobile-390-light.png` | `after-mobile-390-light.png` |
| Mobile Home, 390 dark | `before-mobile-390-dark.png` | `after-mobile-390-dark.png` |
| Mobile Home, 375 light | `before-mobile-375-light.png` | `after-mobile-375-light.png` |
| Mobile Now Playing, 390 | `before-nowplaying-390-light.png` | `after-nowplaying-390-light.png` |
| Desktop Now Playing, 1440 | `before-nowplaying-desktop-1440-light.png` | `after-nowplaying-desktop-1440-light.png` |

Additional after-only coverage:

- Dark: `after-mobile-430-dark.png`, `after-mobile-375-dark.png`,
  `after-mobile-390-dark-playing.png` (mini player), `after-tablet-768-dark.png`,
  `after-tablet-1024-dark.png`, `after-nowplaying-390-dark.png`,
  `after-nowplaying-desktop-1440-dark.png`.
- Routes at 390: `after-mobile-390-browse.png`, `-search.png`, `-library.png`,
  `-account.png`, `-personalization.png`; desktop search at
  `after-desktop-1440-search.png`.
- Tablet playing: `after-tablet-768-playing.png`.
- Accessibility fallbacks: `after-reduced-transparency-390-light.png`,
  `after-reduced-motion-390-light.png`.

## What changed visually

- Less blur, less white fill, lower-contrast edges; chrome reads as a material
  lens instead of a milky outlined card.
- Full-surface diagonal highlight removed; a vertical thickness gradient and a
  single specular top rim replace it.
- Hover light sweep restricted to small interactive glass; bars and players no
  longer sweep.
- Tab bar floats 12px above the safe area with 60px targets, an animated tinted
  selection lens, and an 8px gap to the mini player.
- Mini player has a 44px play control and a stronger artwork tint.
- Mobile Now Playing shows the queue tabs on first paint; compact Now Playing
  hides the tab bar so transport controls are never covered.
- Desktop keeps solid near-white chrome and drops the extra selection bar.

## Verification summary

- Play/pause, track switching, queue selection, mini player → Now Playing,
  tab navigation, search, library, account and personalization were exercised in
  the live app at 390×844.
- Real playback was confirmed by elapsed time advancing (`0:35 / 5:33`) with the
  transport in the playing state.
- Reduced transparency: `prefers-reduced-transparency: reduce` matched and the
  page rendered zero backdrop-filter layers.
- Reduced motion: `prefers-reduced-motion: reduce` matched, the glass transition
  computed to `0s`, and no specular sweep was rendered.
- No horizontal page overflow (`scrollWidth === innerWidth`) at 1440, 1024, 768,
  430, 390 or 375.

Full narrative, metrics and limitations: `docs/design-evolution.md`, section 7.
