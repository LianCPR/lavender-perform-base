# Lavender Music — Design Tokens

Every value below lives in `packages/design-system/src/tokens/*` or
`packages/design-system/src/theme/*` and is reachable through `useTheme()`.
Components must never hardcode a hex, radius, spacing value or shadow.

Live reference: `/design` in either app (sidebar footer → **Design system**, or
the palette icon in the mobile header).

---

## 1. Color

### 1.1 Brand primitives — `tokens/palette.ts`

| Token | Hex | Allowed use |
| --- | --- | --- |
| `brand.dustyRose` | `#A7819A` | Primary accent (light), progress, favorites |
| `brand.lavenderPink` | `#EABEDF` | Secondary accent, progress gradient, dark accent |
| `brand.royalPurple` | `#412057` | Deep identity reference; avoid broad interface fills |
| `brand.mutedLavender` | `#C6ACB7` | Dark-mode primary accent |
| `brand.paleLavender` | `#DCCDEE` | Light-mode primary controls and selected surfaces |
| `brand.midnight` | `#161123` | Dark depth reference (artwork, shadow) |

Neutral ramp `neutral.0 … neutral.1000` supplies every gray. Brand colors are
never page backgrounds.

### 1.2 Semantic colors — `theme/colors.ts`

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `#FAFAFA` | `#17171A` |
| `backgroundElevated` | `#FFFFFF` | `#303036` |
| `surface` | `#FFFFFF` | `#242428` |
| `surfaceMuted` | `#F2F1F4` | `#2A2A30` |
| `surfaceStrong` | `#EBE9EF` | `#303036` |
| `text` | `#252329` | `#F5F5F7` |
| `textSecondary` | `#85818B` | `#A1A1AA` |
| `textTertiary` | `#85818B` | `#85858D` |
| `border` | `rgba(37,35,41,.075)` | `rgba(255,255,255,.10)` |
| `borderStrong` | `rgba(37,35,41,.13)` | `rgba(255,255,255,.20)` |
| `divider` | `rgba(37,35,41,.065)` | `rgba(255,255,255,.07)` |
| `accent` | `#A7819A` | `#C6ACB7` |
| `accentText` | `#765B78` | `#EABEDF` |
| `accentSoft` | `#EABEDF` | `#EABEDF` |
| `accentStrong` | `#DCCDEE` | `#C6ACB7` |
| `onAccent` | `#302634` | `#252329` |
| `accentSubtle` | lavender 42% | pink 16% |
| `accentGradient` | `#A7819A → #EABEDF` | `#8E6C86 → #C6ACB7` |
| `favorite` | `#A7819A` | `#EABEDF` |
| `progressTrack` | `rgba(32,32,36,.12)` | `rgba(255,255,255,.14)` |
| `progressFill` | `#A7819A → #EABEDF` | `#A7819A → #EABEDF` |
| `overlay` | `rgba(250,250,250,.76)` | `rgba(23,23,26,.72)` |
| `scrim` | `rgba(20,18,26,.42)` | `rgba(6,5,9,.58)` |
| `inputBackground` | `rgba(255,255,255,.62)` | `rgba(255,255,255,.06)` |
| `navActiveBackground` | purple 24% | pink 24% |
| `navActiveText` | `#6A2D78` | `#F4B8EE` |
| `navIdleText` | `#635E6A` | `#C2BCCB` |
| `hover` | `rgba(27,25,32,.045)` | `rgba(255,255,255,.06)` |
| `pressed` | `rgba(27,25,32,.075)` | `rgba(255,255,255,.10)` |
| `focusRing` | `#A7819A` | `#EABEDF` |
| `danger` | `#A84252` | `#E79AA6` |
| `dangerSubtle` | danger 12% | danger 16% |
| `success` | `#41705A` | `#8FBFA6` |
| `skeleton` | `#E9E6EE` | `#2E2938` |
| `skeletonHighlight` | `#F4F2F7` | `#3C3648` |

Original artwork gradients (`theme/artwork.ts`) map eight palette keys to stable
color pairs: `rose`, `lavender`, `plum`, `haze`, `dusk`, `ocean`, `sage`, and
`ember`. They stay identical in Light and Dark modes, like real album covers.

---

## 2. Typography — `tokens/typography.ts`

System UI font (`fontFamily`): `system-ui, -apple-system, "Segoe UI", Roboto, …`
on web; the platform default on iOS. Numeric styles use tabular figures.

| Variant | Size / line | Weight | Tracking | Role |
| --- | --- | --- | --- | --- |
| `display` | 34 / 40 | 700 | −1 | Hero greeting only |
| `largeHeading` | 28 / 34 | 700 | −0.6 | Page title |
| `sectionHeading` | 22 / 28 | 700 | −0.4 | Section title |
| `subheading` | 18 / 24 | 600 | −0.2 | Sheet / subsection title |
| `headline` | 15 / 20 | 600 | −0.1 | Card & row title |
| `body` | 15 / 22 | 400 | 0 | Reading copy |
| `callout` | 14 / 20 | 500 | 0 | Buttons, supporting |
| `secondary` | 13 / 18 | 500 | 0 | Metadata |
| `caption` | 12 / 16 | 500 | +0.1 | Fine print |
| `micro` | 10 / 12 | 600 | +0.2 | Tab labels |
| `label` | 11 / 14 | 700 uppercase | +0.8 | Eyebrow / overline |
| `numeric` | 15 / 20 | 600 | 0 | Counts, totals (tabular) |
| `playback` | 12 / 16 | 500 | +0.2 | Elapsed / remaining (tabular) |

**Responsive ramp** (`typeScale`): compact `0.94×`, medium `0.97×`, expanded
`1×`, wide `1.03×`. `scaleTypography(factor)` returns the whole scale and
`useResponsiveTypography()` (in `packages/ui`) applies it for the active
breakpoint. Components that must not scale keep using `theme.typography`.

---

## 3. Spacing — `tokens/spacing.ts`

| Token | px |
| --- | --- |
| `none` | 0 |
| `xxs` | 2 |
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `xxl` | 24 |
| `xxxl` | 32 |
| `huge` | 40 |
| `giant` | 56 |

Use `<Spacer size="lg" />` instead of ad-hoc margins.

---

## 4. Geometry — `tokens/radius.ts`, `tokens/border.ts`

| Radius | px | Use |
| --- | --- | --- |
| `none` | 0 | Dividers, full-bleed imagery |
| `xs` | 6 | Skeleton blocks, swatches |
| `artwork` | 10 | Album covers (deliberately the least rounded) |
| `sm` | 12 | Small cards, row highlights |
| `control` | 14 | Buttons, inputs |
| `card` | 16 | Content cards |
| `md` | 18 | Grouped surfaces |
| `lg` | 22 | Mini player, floating panels |
| `glass` | 26 | Sidebar, large glass panels |
| `xl` | 30 | Feature banners |
| `pill` | 999 | Navigation, chips, icon buttons |

Border widths: `none 0`, `hairline 1`, `thin 1`, `medium 2` (focus ring),
`thick 3`. Hairline is the default for separators and card outlines.

---

## 5. Elevation — `theme/elevation.ts`

| Level | Light shadow | Dark shadow |
| --- | --- | --- |
| `none` | — | — |
| `low` | 6% · 8px · y2 | 28% · 10px · y3 |
| `medium` | 10% · 18px · y6 | 38% · 22px · y8 |
| `high` | 14% · 28px · y12 | 48% · 34px · y14 |
| `floating` | 18% · 40px · y18 | 56% · 48px · y20 |

Each level carries native shadow props plus a web `boxShadow` string
(`elevationStyle()` merges them). Cards use borders; elevation is for chrome and
interactive surfaces.

---

## 6. Layout — `tokens/layout.ts`

| Breakpoint | Min width | Navigation | Gutter | Grid | Section gap | Chrome clearance |
| --- | --- | --- | --- | --- | --- | --- |
| `compact` | 0 | floating glass tab bar | 16 | 2 col | 24 | 210 |
| `medium` | 768 | floating glass rail (84) | 24 | 3 col | 28 | 140 |
| `expanded` | 1024 | flush minimal sidebar (252) | 32 | 4 col | 32 | 140 |
| `wide` | 1440 | flush minimal sidebar | 40 | 5 col | 36 | 140 |

Content widths: `reading 680`, `standard 1180`, `wide 1320`.

Z-index: `background 0 · content 1 · header 10 · miniPlayer 20 · tabBar 30 ·
overlay 40 · modal 50 · toast 60 · tooltip 70`.

---

## 7. Glass — `tokens/glass.ts`, `theme/glass.ts`

Semantic variants → materials: `subtle → thin`, `standard → regular`,
`prominent → thick`. Chrome materials: `navigation`, `player`, `overlay`.

| Material | Blur | Saturation | Body tint (L/D) | Rim band | Use |
| --- | --- | --- | --- | --- | --- |
| `thin` | 12px | 165 / 155% | 0.22 / 0.24 | 6px | subtle chips, fields, glass buttons |
| `regular` | 16px | 170 / 158% | 0.26 / 0.30 | 8px | default panels |
| `thick` | 20px | 175 / 162% | 0.34 / 0.38 | 10px | prominent overlays |
| `navigation` | 28px | 215 / 190% | 0.32 / 0.44 | 12px | glass rail / tab bar (not desktop) |
| `player` | 26px | 220 / 195% | 0.28 / 0.40 | 11px | floating mini player (not desktop) |
| `overlay` | 30px | 170 / 158% | 0.30 / 0.34 | 12px | sheets, modals |

Native `BlurView` intensity is 24 (thin) → 62 (navigation); it tracks the same
hierarchy as `blurPx`.

Every material defines three groups of tokens:

| Group | Fields | Role |
| --- | --- | --- |
| Material | `intensity`, `blurPx`, `saturation`, `brightness`, `tint` | The body: how much of the backdrop survives, and how much neutral fill sits on top |
| Optics | `refractionWidth`, `refractionBlurPx`, `refractionSaturation`, `rimLight`, `caustic` | The edge: thinner, clearer, more chromatic than the body, with light on the top bevel and at the bottom edge |
| Depth | `shadowColor`, `shadowOpacity`, `shadowRadius`, `shadowOffsetY`, `contactShadowOpacity`, `border`, `borderWidth`, `highlight`, `highlightHeight` | Wide ambient shadow, tight contact shadow, hairline separation and the specular bloom |

Chrome tints stay the strongest (navigation 0.32 light / 0.44 dark, player 0.28 /
0.40) so labels survive busy artwork, but they are now roughly half the fill of
the pre-refinement material: legibility comes from blur, saturation and the
optics rather than from a white wash. The desktop sidebar, desktop fields and
desktop player do not use these materials at all; they are solid surfaces.

`GlassSurface` also accepts `tintColor` and `tintSecondary`, two restrained
radial washes (0.24 / 0.07 light, 0.26 / 0.13 dark) sampled from content under
functional glass. They never replace the neutral tint. Whole-surface chrome
(`navigation`, `player`) does not run the pointer light sweep; only the small
interactive glass (`thin`, `regular`, `thick`) does. Under
`prefers-reduced-transparency` / iOS Reduce Transparency, every material becomes
opaque and both blur and decorative sheens are removed. Under reduced motion the
material cross-fade is removed as well as the sweep.

---

## 8. Icons — `tokens/icon.ts`

`xs 12 · sm 15 · md 18 · lg 22 · xl 26 · hero 40`.

Guidelines: one family (Ionicons); `*-outline` for idle chrome, filled glyphs for
active/primary actions; never mix arbitrary sizes inside one surface; always pair
an icon-only control with an accessible label.

---

## 9. Motion & opacity — `tokens/motion.ts`

Durations: `instant 0 · fast 120 · base 180 · slow 260 · slower 420` ms.
Scales: pressed `0.98`, hover `1.01`. Easing: standard `cubic-bezier(.2,0,0,1)`,
emphasized `cubic-bezier(.3,0,0,1)`, decelerate `cubic-bezier(0,0,0,1)` (also
available as bezier tuples for `Easing.bezier`). Shimmer cycle `1400ms`, spinner
`900ms`.

Opacity: `full 1 · disabled .45 · disabledGlass .55 · muted .62 ·
hoverOverlay .06 · pressedOverlay .10`.

All animation is skipped or reduced when the OS requests reduced motion; the
preference is exposed by `useReducedMotion()` from the theme provider. Reduced
transparency is exposed separately by `useReducedTransparency()`; it switches
`GlassSurface` to its opaque fallback and is independent of motion.

---

## 10. Adding a token

1. Add the primitive/token to the relevant file in `packages/design-system/src/tokens`.
2. Map it into `Theme` (`theme/theme.ts`) if components need it per scheme.
3. Export it from `packages/design-system/src/index.ts`.
4. Update this document.
5. Never introduce a raw value in a component — if a value is missing, add a token.
