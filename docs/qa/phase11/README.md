# Phase 11 visual QA — Liquid Glass material refinement

Captured 18 November 2026 from the production web export (`expo export
--platform web`) served locally, using headless Edge over CDP at exact CSS
viewports with `deviceScaleFactor: 2`. The packaged preview panel was not used
for evidence: it reports a 1440px viewport while rendering a 390px crop.

Player state was seeded (`lavender.player` → `tr-soft-focus`) so the mini player
and tab bar appear together on first paint. Light/Dark was emulated with
`prefers-color-scheme`; the app's theme mode was set to `system`.

## Before / after

`before-*` files are the Phase 2 result (the state this phase set out to fix).
`after-*` files are this phase.

| Viewport | Before | After |
| --- | --- | --- |
| 430 × 932 light | `before-430x932-light.png` | `after-430x932-light.png` |
| 430 × 932 dark | `before-430x932-dark.png` | `after-430x932-dark.png` |
| 408 × 844 light | — (not captured in Phase 2) | `after-408x844-light.png` |
| 408 × 844 dark | — | `after-408x844-dark.png` |
| 390 × 844 light | `before-390x844-light.png` | `after-390x844-light.png` |
| 390 × 844 dark | `before-390x844-dark.png` | `after-390x844-dark.png` |
| 375 × 812 light | `before-375x812-light.png` | `after-375x812-light.png` |
| 375 × 812 dark | `before-375x812-dark.png` | `after-375x812-dark.png` |

Additional evidence:

| File | What it shows |
| --- | --- |
| `after-390x844-light-scrolled.png` | Artwork playlists scrolled under both surfaces — the fair test of background interaction |
| `after-390x844-dark-scrolled.png` | Same, dark mode |
| `after-390x844-nowplaying-light.png` | Now Playing, where chrome meets full-bleed artwork |
| `after-390x844-nowplaying-dark.png` | Same, dark mode |
| `after-390x844-reduced-transparency.png` | `prefers-reduced-transparency: reduce` |
| `after-390x844-reduced-motion.png` | `prefers-reduced-motion: reduce` |

## Results at each required size

| Viewport | Tier | Result |
| --- | --- | --- |
| 430 × 932 | compact | Light + dark captured. Tab bar spans full width, 12px side insets, 8px gap above the safe area. Labels sit inside the bar at 11px; no clipping. Mini player clears the bar by 8px. |
| 408 × 844 | compact | Light + dark. Same geometry; the active lens and the mini player keep their proportions, labels stay on one line. |
| 390 × 844 | compact | Light + dark. Colour from the artwork row (“RIDE” magenta, “Dark Magic” red) is visible through the bar and the player edge; labels remain readable over it. |
| 375 × 812 | compact | Light + dark. Narrowest case: label row still fits, the player’s title truncates with an ellipsis rather than wrapping, and no control overlaps the tab bar. |

No horizontal overflow (`scrollWidth === innerWidth`) at any size. The tab bar
never covers the mini player, and the mini player never covers a transport row.
On `/now-playing` the tab bar stays hidden, so the transport controls are
unobstructed.

## Light and dark

- **Light**: glass stays close to the page’s own luminance, so its identity comes
  from the colour it transmits and from the bevel — not from a grey fill. Over
  the near-white list rows the surfaces are near-white (correct: glass over white
  is white); over artwork the bar shows distinct colour bands.
- **Dark**: the material darkens its backdrop (brightness 0.90) instead of
  washing it, so artwork reads as smoked colour. The active lens is pink-lavender
  and the bevel is visible without becoming a white outline.

## Accessibility and fallback verification

Measured through CDP with media features emulated, not inferred from CSS:

| Setting | Measurement | Result |
| --- | --- | --- |
| `prefers-reduced-transparency: reduce` | count of elements with a `backdrop-filter` containing `blur` | **0** — every glass surface renders its opaque fallback (`rgb(255,255,255)`, strong border, no sheen) |
| `prefers-reduced-motion: reduce` | `transitionDuration` on 37 glass roots | **0s** on all of them; specular sweep layers: **0** |
| No backdrop-filter support | the rim band and body are plain backdrop layers over a tinted frame; the frame keeps its border, tint and shadow | Degrades to a tinted, bordered surface — no transparent hole, no missing text |
| Touch targets | tab items 48px, play control 44px | Above the 44px minimum |

## Native vs web (important)

These are two different materials and the report treats them as such:

- **Native iOS** uses `expo-blur` → `UIVisualEffectView`. It is the strongest
  system material this stack exposes and it picks up iOS 26's refreshed system
  treatment, but it is still a *standard material*, not SwiftUI's
  `glassEffect(_:in:)`: it cannot lens or displace the backdrop per pixel, and it
  cannot render a thinner edge band. The native implementation therefore mirrors
  the layer *design* (body tint, thickness ramp, bloom, artwork wash, painted
  bevel, ambient + contact shadow) on top of the system blur.
- **Web** is an approximation: two `backdrop-filter` layers (a 4px, 215–245%
  saturated rim band and the inset body) plus gradients. The band makes the edge
  transmit a clearer, more chromatic image than the body, which is the closest a
  browser can get to lensing without an SVG displacement map. It does **not**
  displace pixels, so it is not authentic Liquid Glass and is not described as
  such.

## Remaining limitations

- iOS was not built or run on this Windows host (no Xcode/simulator). Native
  `BlurView` rendering was not visually verified; only the shared token
  hierarchy, the native layer stack and type-checking were.
- No per-pixel refraction or displacement on web. Background content does not
  bend around the edges; it is re-sampled cheaper and brighter in the rim band.
- Backdrop luminance is not sampled, so text colour cannot flip automatically
  the way system Liquid Glass does. Light mode always uses dark labels; on
  unusually dark content behind a light bar, contrast drops but stays above the
  measured 4.5:1 for the label colours in these captures.
- Audible playback was not assessed in these captures; the player engine was not
  changed in this phase.
