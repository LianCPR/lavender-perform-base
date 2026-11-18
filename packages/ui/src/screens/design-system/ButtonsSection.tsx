import { useTheme } from '@lavender/design-system';
import { View } from 'react-native';

import { ButtonBase } from '../../buttons/ButtonBase';
import { IconButton } from '../../buttons/IconButton';
import { Text } from '../../Text';
import { ShowcaseSection, SpecimenLabel } from './ShowcaseSection';

const noop = () => undefined;

/** Every button variant, size and state in one place. */
export function ButtonsSection() {
  const theme = useTheme();

  return (
    <ShowcaseSection
      title="Buttons & interaction"
      description="Hover and press these live. Every button shares the same motion: a 0.98 scale, a soft overlay and a token-timed release.">
      <View style={{ gap: theme.spacing.xl }}>
        <View>
          <SpecimenLabel>Variants</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' }}>
            <ButtonBase label="Primary" variant="primary" icon="play" onPress={noop} />
            <ButtonBase label="Secondary" variant="secondary" icon="albums-outline" onPress={noop} />
            <ButtonBase label="Glass" variant="glass" icon="sparkles-outline" onPress={noop} />
            <ButtonBase label="Tinted" variant="tinted" icon="heart" onPress={noop} />
            <ButtonBase label="Ghost" variant="ghost" icon="ellipsis-horizontal" onPress={noop} />
          </View>
        </View>

        <View>
          <SpecimenLabel>Sizes</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' }}>
            <ButtonBase label="Small" variant="primary" size="sm" onPress={noop} />
            <ButtonBase label="Medium" variant="primary" size="md" onPress={noop} />
            <ButtonBase label="Large" variant="primary" size="lg" onPress={noop} />
            <ButtonBase label="With icon" variant="glass" size="lg" icon="add" onPress={noop} />
          </View>
        </View>

        <View>
          <SpecimenLabel>Disabled & loading</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' }}>
            <ButtonBase label="Disabled" variant="primary" disabled onPress={noop} />
            <ButtonBase label="Disabled glass" variant="glass" disabled onPress={noop} />
            <ButtonBase label="Loading" variant="secondary" loading onPress={noop} />
            <ButtonBase label="Saving" variant="primary" loading onPress={noop} />
          </View>
        </View>

        <View>
          <SpecimenLabel>Icon buttons</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'center' }}>
            <IconButton icon="heart" label="Favorite (selected)" variant="glass" selected onPress={noop} />
            <IconButton icon="heart-outline" label="Favorite" variant="glass" onPress={noop} />
            <IconButton icon="shuffle" label="Shuffle" variant="solid" onPress={noop} />
            <IconButton icon="repeat" label="Repeat" variant="ghost" onPress={noop} />
            <IconButton icon="ellipsis-horizontal" label="More" variant="ghost" disabled onPress={noop} />
          </View>
        </View>

        <View>
          <SpecimenLabel>State language</SpecimenLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <StateTile label="Default" />
            <StateTile label="Hover" background={theme.colors.hover} />
            <StateTile label="Pressed" background={theme.colors.pressed} />
            <StateTile label="Focused" focus />
            <StateTile label="Disabled" disabled />
            <StateTile label="Selected" background={theme.colors.accentSubtle} foreground={theme.colors.accent} />
          </View>
        </View>
      </View>
    </ShowcaseSection>
  );
}

function StateTile({
  label,
  background,
  foreground,
  focus = false,
  disabled = false,
}: {
  label: string;
  background?: string;
  foreground?: string;
  focus?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.control,
        backgroundColor: background ?? theme.colors.surface,
        borderWidth: focus ? theme.border.medium : theme.border.hairline,
        borderColor: focus ? theme.colors.focusRing : theme.colors.border,
        opacity: disabled ? theme.opacity.disabled : 1,
      }}>
      <Text variant="caption" style={{ color: foreground ?? theme.colors.text }}>
        {label}
      </Text>
    </View>
  );
}
