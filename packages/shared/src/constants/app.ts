/** App-wide constants. Kept tiny on purpose. */
export const APP_NAME = 'Lavender Music';
export const APP_TAGLINE = 'Your music, softly held.';

/** Navigation destinations shared by web and iOS. */
export const ROUTES = {
  home: '/',
  browse: '/browse',
  search: '/search',
  library: '/library',
} as const;

export type RouteKey = keyof typeof ROUTES;
