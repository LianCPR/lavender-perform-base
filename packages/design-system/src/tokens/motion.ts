/**
 * Motion tokens. Durations are milliseconds.
 *
 * Interaction classes are named after the gesture, not the component, so two
 * unrelated components that behave the same way share timing. Springs are
 * physical (damping/stiffness/mass) rather than pre-baked curves because Liquid
 * Glass settles rather than eases: a press answers immediately and releases with
 * a short, damped settle.
 *
 * All values stay inside Apple's "brief and precise" range: nothing here is
 * longer than 520ms, and overshoot is clamped for touch feedback so controls
 * never bounce like a game.
 */
export const motion = {
  instant: 0,
  fast: 120,
  base: 180,
  slow: 260,
  slower: 420,

  /** Interaction-class durations, calibrated in the browser and on device. */
  press: 140,
  release: 280,
  tab: 320,
  morph: 420,
  expand: 520,
  menu: 300,
  page: 320,

  /** Press feedback scale for ordinary content. */
  pressedScale: 0.98,
  /**
   * Glass press: smaller than content, because the material also squashes and
   * lifts — scaling the two together would read as rubber.
   */
  glassPressedScale: 0.985,
  /** Peak squash applied to a pressed glass surface (scaleX / scaleY). */
  glassSquash: { x: 1.008, y: 0.982 },
  /** Press lift in px. */
  glassLift: 1,
  /** Optical energy multiplier at full press: rim, bloom and caustic. */
  glassEnergy: 1.45,
  /** Hover scale for artwork-like surfaces. */
  hoverScale: 1.01,

  /**
   * Springs. `overshootClamping` is on everywhere except the page-scale
   * expansion, where a few pixels of settle keep the geometry connected.
   */
  spring: {
    press: { damping: 26, stiffness: 360, mass: 0.6 },
    settle: { damping: 24, stiffness: 220, mass: 0.85 },
    travel: { damping: 30, stiffness: 200, mass: 1 },
    expand: { damping: 34, stiffness: 180, mass: 1 },
  },

  /** CSS easing strings (web). */
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
    /** Materialization: fast start, long soft landing. */
    materialize: 'cubic-bezier(0.16, 0.84, 0.24, 1)',
  },
  /** Bezier control points for `Easing.bezier` (native Animated). */
  easingBezier: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.3, 0, 0, 1],
    decelerate: [0, 0, 0, 1],
    materialize: [0.16, 0.84, 0.24, 1],
  },
  /** Skeleton shimmer cycle. */
  shimmer: 1400,
  /** Loading spinner rotation cycle. */
  spinner: 900,
} as const;

export type Motion = typeof motion;
export type SpringName = keyof typeof motion.spring;

/** Opacity tokens for interaction and placeholder states. */
export const opacity = {
  full: 1,
  /** Disabled controls. */
  disabled: 0.45,
  /** Disabled controls on glass, where opacity compounds with the tint. */
  disabledGlass: 0.55,
  /** Secondary chrome such as inactive icons. */
  muted: 0.62,
  /** Hover overlay strength. */
  hoverOverlay: 0.06,
  /** Pressed overlay strength. */
  pressedOverlay: 0.1,
} as const;

export type Opacity = typeof opacity;
