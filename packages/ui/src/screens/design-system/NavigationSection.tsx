import { useTheme } from '@lavender/design-system';
import { useState } from 'react';
import { View } from 'react-native';

import { GlassNavigation, NavigationFooterLink } from '../../GlassNavigation';
import { GlassTabBar } from '../../GlassTabBar';
import { NavigationItem } from '../../NavigationItem';
import { APP_NAV_ITEMS } from '../../navigation';
import { Text } from '../../Text';
import { ThemeControl } from '../../ThemeControl';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

/** Navigation chrome: tab bar, sidebar items and the rail. */
export function NavigationSection() {
  const theme = useTheme();
  const [tab, setTab] = useState('home');

  return (
    <ShowcaseSection
      title="Navigation"
      description="One NavigationItem backs the tab bar and the sidebar. Active destinations use the accent wash; hover uses the neutral state token.">
      <View style={{ gap: theme.spacing.xl }}>
        <View>
          <SpecimenLabel>Floating tab bar (compact)</SpecimenLabel>
          <View style={{ maxWidth: 420 }}>
            <GlassTabBar
              items={APP_NAV_ITEMS}
              activeKey={tab}
              onSelect={(item) => setTab(item.key)}
            />
          </View>
          <Text variant="playback" tone="tertiary" style={{ marginTop: theme.spacing.sm }}>
            Tap a tab — the active capsule follows.
          </Text>
        </View>

        <View>
          <SpecimenLabel>Sidebar items</SpecimenLabel>
          <View style={{ maxWidth: 252, gap: theme.spacing.xs }}>
            <NavigationItem label="Home" icon="home-outline" activeIcon="home" active onPress={() => setTab('home')} />
            <NavigationItem label="Browse" icon="compass-outline" activeIcon="compass" onPress={() => setTab('browse')} />
            <NavigationItem label="Search" icon="search-outline" activeIcon="search" onPress={() => setTab('search')} />
            <NavigationItem label="Library" icon="albums-outline" activeIcon="albums" onPress={() => setTab('library')} />
          </View>
        </View>

        <View>
          <SpecimenLabel>Full sidebar & rail</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.lg }}>
            <View style={{ height: 340 }}>
              <GlassNavigation
                items={APP_NAV_ITEMS}
                activeKey={tab}
                onSelect={(item) => setTab(item.key)}
                footer={
                  <>
                    <ThemeControl />
                    <NavigationFooterLink label="Design system" onPress={() => undefined} />
                  </>
                }
                style={{ flex: 1, width: theme.layout.sidebarWidth }}
              />
            </View>
            <View style={{ height: 340 }}>
              <GlassNavigation
                items={APP_NAV_ITEMS}
                activeKey={tab}
                collapsed
                onSelect={(item) => setTab(item.key)}
                footer={<ThemeControl variant="icon" />}
                style={{ flex: 1, width: theme.layout.sidebarRailWidth }}
              />
            </View>
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}
