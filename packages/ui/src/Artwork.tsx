import { elevationStyle, useTheme } from '@lavender/design-system';
import type { ArtworkPalette } from '@lavender/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from './Text';

export interface ArtworkProps {
  palette: ArtworkPalette;
  /** Fixed square size. Omit to let the parent control dimensions. */
  size?: number;
  cornerRadius?: number;
  /** Optional short text (artist initial, album initial). */
  monogram?: string;
  /** Adds a soft drop shadow so the cover reads as a physical object. */
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Provider artwork (remote URL). Falls back to the palette cover if it fails. */
  uri?: string;
}

function white(alpha: number): string {
  return `rgba(255, 255, 255, ${alpha})`;
}

const SHADE = 'rgba(22, 16, 26, 0.16)';

/**
 * Locally generated original cover art.
 *
 * A palette gradient is layered with a soft light source, a darker plane, a
 * glass-like sheen, a bottom vignette and a hairline rim. The result reads as a
 * designed cover rather than a flat swatch, without any remote imagery.
 */
export function Artwork({
  palette,
  size,
  cornerRadius,
  monogram,
  elevated = false,
  style,
  uri,
}: ArtworkProps) {
  const theme = useTheme();
  const gradient = theme.artwork[palette];
  const radius = cornerRadius ?? theme.radius.artwork;
  const disc = discStyle(palette);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          overflow: 'hidden',
        },
        elevated && elevationStyle(theme.elevation.medium),
        style,
      ]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft light source: a large, diffuse disc of white. */}
      <View pointerEvents="none" style={[styles.disc, disc]}>
        <LinearGradient
          colors={[white(0.26), white(0.1), 'rgba(255,255,255,0)']}
          start={{ x: 0.15, y: 0.1 }}
          end={{ x: 0.9, y: 0.95 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {uri && !failed ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      <View
        pointerEvents="none"
        style={[styles.plate, { backgroundColor: white(0.2) }, plateStyle(palette)]}
      />
      <View
        pointerEvents="none"
        style={[styles.plane, { backgroundColor: SHADE }, planeStyle(palette)]}
      />
      <View
        pointerEvents="none"
        style={[styles.accent, { backgroundColor: white(0.34) }, accentStyle(palette)]}
      />

      {/* Diagonal sheen across the whole cover. */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(255,255,255,0)',
          white(0.04),
          white(0.13),
          white(0.03),
          'rgba(255,255,255,0)',
        ]}
        locations={[0, 0.4, 0.49, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Top light band + bottom vignette give the cover depth. */}
      <LinearGradient
        pointerEvents="none"
        colors={[white(0.22), 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topLight}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,14,24,0)', 'rgba(20,14,24,0.06)', 'rgba(20,14,24,0.32)']}
        locations={[0, 0.56, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, borderWidth: 1, borderColor: white(0.22) },
        ]}
      />

      {monogram ? (
        <Text variant="sectionHeading" style={styles.monogram}>
          {monogram}
        </Text>
      ) : null}
    </View>
  );
}

function discStyle(palette: ArtworkPalette): ViewStyle {
  switch (palette) {
    case 'rose':
      return { width: '105%', height: '105%', left: '-22%', top: '-38%' };
    case 'lavender':
      return { width: '120%', height: '120%', right: '-42%', top: '-40%' };
    case 'plum':
      return { width: '96%', height: '96%', right: '-26%', bottom: '-34%' };
    case 'haze':
      return { width: '110%', height: '110%', left: '-30%', bottom: '-36%' };
    case 'dusk':
      return { width: '118%', height: '118%', left: '-34%', top: '-34%' };
    case 'ocean':
      return { width: '108%', height: '108%', right: '-30%', top: '-30%' };
    case 'sage':
      return { width: '112%', height: '112%', left: '-32%', top: '-36%' };
    case 'ember':
      return { width: '120%', height: '120%', right: '-40%', bottom: '-30%' };
  }
}

function plateStyle(palette: ArtworkPalette): ViewStyle {
  switch (palette) {
    case 'rose':
      return {
        left: '13%',
        top: '12%',
        width: '58%',
        height: '76%',
        transform: [{ rotate: '-8deg' }],
      };
    case 'lavender':
      return {
        left: '45%',
        top: '-18%',
        width: '46%',
        height: '138%',
        transform: [{ rotate: '17deg' }],
      };
    case 'plum':
      return {
        left: '-14%',
        top: '25%',
        width: '128%',
        height: '26%',
        transform: [{ rotate: '-15deg' }],
      };
    case 'haze':
      return { left: '8%', top: '8%', width: '84%', height: '84%' };
    case 'dusk':
      return {
        left: '12%',
        top: '-10%',
        width: '34%',
        height: '120%',
        transform: [{ rotate: '9deg' }],
      };
    case 'ocean':
      return {
        right: '5%',
        top: '-12%',
        width: '45%',
        height: '112%',
        transform: [{ rotate: '18deg' }],
      };
    case 'sage':
      return {
        left: '16%',
        top: '16%',
        width: '68%',
        height: '68%',
        transform: [{ rotate: '7deg' }],
      };
    case 'ember':
      return {
        left: '-12%',
        top: '10%',
        width: '76%',
        height: '34%',
        transform: [{ rotate: '-19deg' }],
      };
  }
}

function planeStyle(palette: ArtworkPalette): ViewStyle {
  switch (palette) {
    case 'rose':
      return {
        right: '-8%',
        bottom: '-14%',
        width: '62%',
        height: '55%',
        transform: [{ rotate: '14deg' }],
      };
    case 'lavender':
      return {
        left: '-15%',
        bottom: '13%',
        width: '84%',
        height: '24%',
        transform: [{ rotate: '-13deg' }],
      };
    case 'plum':
      return {
        right: '8%',
        top: '-8%',
        width: '27%',
        height: '116%',
        transform: [{ rotate: '12deg' }],
      };
    case 'haze':
      return {
        right: '15%',
        top: '12%',
        width: '44%',
        height: '76%',
        transform: [{ rotate: '8deg' }],
      };
    case 'dusk':
      return {
        right: '-10%',
        bottom: '-8%',
        width: '65%',
        height: '62%',
        transform: [{ rotate: '-13deg' }],
      };
    case 'ocean':
      return {
        left: '-14%',
        bottom: '-8%',
        width: '70%',
        height: '55%',
        transform: [{ rotate: '-13deg' }],
      };
    case 'sage':
      return {
        right: '6%',
        bottom: '10%',
        width: '24%',
        height: '80%',
        transform: [{ rotate: '-12deg' }],
      };
    case 'ember':
      return {
        right: '-12%',
        bottom: '4%',
        width: '56%',
        height: '48%',
        transform: [{ rotate: '16deg' }],
      };
  }
}

function accentStyle(palette: ArtworkPalette): ViewStyle {
  switch (palette) {
    case 'rose':
      return { left: '11%', bottom: '18%', width: '1.8%', height: '44%' };
    case 'lavender':
      return { left: '21%', top: '18%', width: '1.4%', height: '60%' };
    case 'plum':
      return { left: '18%', bottom: '17%', width: '34%', height: '1.1%' };
    case 'haze':
      return { right: '15%', bottom: '15%', width: '1.4%', height: '46%' };
    case 'dusk':
      return { left: '20%', bottom: '16%', width: '30%', height: '1.1%' };
    case 'ocean':
      return { left: '14%', top: '17%', width: '1.4%', height: '52%' };
    case 'sage':
      return { left: '15%', bottom: '19%', width: '36%', height: '1.1%' };
    case 'ember':
      return { right: '18%', top: '17%', width: '1.4%', height: '54%' };
  }
}

const styles = StyleSheet.create({
  disc: {
    position: 'absolute',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  plate: {
    position: 'absolute',
    borderRadius: 4,
  },
  plane: {
    position: 'absolute',
    borderRadius: 3,
  },
  accent: {
    position: 'absolute',
    borderRadius: 2,
  },
  topLight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '42%',
  },
  monogram: {
    position: 'absolute',
    left: 12,
    top: 12,
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 1,
    fontWeight: '700',
  },
});
