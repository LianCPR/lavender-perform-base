import { ROUTES } from '@lavender/shared';

import type { IconName } from './Icon';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: IconName;
  activeIcon: IconName;
}

export const APP_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', href: ROUTES.home, icon: 'home-outline', activeIcon: 'home' },
  { key: 'browse', label: 'Browse', href: ROUTES.browse, icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'search', label: 'Search', href: ROUTES.search, icon: 'search-outline', activeIcon: 'search' },
  { key: 'library', label: 'Library', href: ROUTES.library, icon: 'albums-outline', activeIcon: 'albums' },
];

/** Map a router pathname onto the active navigation key. */
export function activeNavKey(pathname: string): string {
  if (pathname === '/' || pathname === '') return 'home';
  // Design-system preview and account are not tab destinations; no tab should
  // look selected while one of those pages is open.
  if (pathname.startsWith('/design') || pathname.startsWith('/account') || pathname.startsWith('/personalization')) {
    return '';
  }
  const match = APP_NAV_ITEMS.find(
    (item) => item.href !== '/' && pathname.startsWith(item.href),
  );
  return match?.key ?? '';
}
