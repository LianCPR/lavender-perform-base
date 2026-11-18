/**
 * Layout breakpoints, content widths and chrome dimensions.
 *
 * The same numbers back `useBreakpoint`, `responsiveLayout` and the docs, so
 * there is exactly one definition of "tablet" in the codebase.
 */
export const breakpoints = {
  /** Phones — one column, bottom tab bar. */
  compact: 0,
  /** Tablets and small windows — navigation rail, multi-column grids. */
  medium: 768,
  /** Desktop — expanded minimal sidebar. */
  expanded: 1024,
  /** Wide desktop — roomier gutters and a wider content column. */
  wide: 1440,
} as const;

/** Maximum content widths. */
export const contentWidth = {
  /** Long-form reading (docs, settings copy). */
  reading: 680,
  /** Default page column. */
  standard: 1180,
  /** Room to breathe on very wide displays. */
  wide: 1320,
  full: '100%',
} as const;

export const layout = {
  breakpoints,
  contentWidth,
  sidebarWidth: 252,
  sidebarRailWidth: 84,
  contentMaxWidth: contentWidth.standard,
  /** Outer page gutter, per breakpoint. */
  gutter: {
    compact: 16,
    medium: 24,
    expanded: 32,
    wide: 40,
  },
  /** Gap between cards in a grid, per breakpoint. */
  gridGap: {
    compact: 16,
    medium: 20,
    expanded: 24,
    wide: 28,
  },
  /** Vertical rhythm between page sections. */
  sectionGap: {
    compact: 24,
    medium: 28,
    expanded: 32,
    wide: 36,
  },
  headerHeight: 56,
  tabBarHeight: 68,
  miniPlayerHeight: 62,
  /** Minimum comfortable touch target. */
  touchTarget: 44,
  /** Bottom padding reserved for floating chrome. */
  chromeClearance: {
    compact: 210,
    medium: 140,
    expanded: 140,
    wide: 140,
  },
} as const;

/**
 * Layout rules per breakpoint. Components read these instead of branching on
 * magic numbers; docs/design-tokens.md mirrors this table.
 */
export const responsiveLayout = {
  compact: {
    navigation: 'tabBar',
    gutter: layout.gutter.compact,
    gridColumns: 2,
    sectionGap: layout.sectionGap.compact,
    chromeClearance: layout.chromeClearance.compact,
  },
  medium: {
    navigation: 'rail',
    gutter: layout.gutter.medium,
    gridColumns: 3,
    sectionGap: layout.sectionGap.medium,
    chromeClearance: layout.chromeClearance.medium,
  },
  expanded: {
    navigation: 'sidebar',
    gutter: layout.gutter.expanded,
    gridColumns: 4,
    sectionGap: layout.sectionGap.expanded,
    chromeClearance: layout.chromeClearance.expanded,
  },
  wide: {
    navigation: 'sidebar',
    gutter: layout.gutter.wide,
    gridColumns: 5,
    sectionGap: layout.sectionGap.wide,
    chromeClearance: layout.chromeClearance.wide,
  },
} as const;

export type BreakpointName = keyof typeof breakpoints;
export type NavigationMode = (typeof responsiveLayout)[BreakpointName]['navigation'];
export type Layout = typeof layout;

export const zIndex = {
  background: 0,
  content: 1,
  header: 10,
  miniPlayer: 20,
  tabBar: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
  tooltip: 70,
} as const;

export type ZIndex = typeof zIndex;
