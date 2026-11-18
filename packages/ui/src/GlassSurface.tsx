import { useReducedMotion, useReducedTransparency, useTheme } from '@lavender/design-system';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, View } from 'react-native';

import {
  glassSheenEnd,
  glassSheenStart,
  glassSurfaceRefractionHighlight,
  glassSurfaceFrame,
  glassSurfaceReflection,
  glassSurfaceRim,
  glassSurfaceSheen,
  resolveGlassMaterial,
  type GlassSurfaceProps,
  useGlassPress,
  useGlassReflection,
} from './GlassSurface.shared';
import { withAlpha } from './utils/color';

export type { GlassSurfaceProps } from './GlassSurface.shared';

/**
 * The one glass primitive.
 *
 * Native: a real `UIVisualEffectView` material via `BlurView` (the strongest
 * system-backed material Expo exposes — on iOS 26 the system's own material
 * treatment applies, but this is *not* SwiftUI's per-pixel `glassEffect`
 * lensing), a low body tint above it, a luminous bevel, a directional sheen and
 * an optional artwork wash.
 *
 * Opacity is deliberately never animated below 1 (Apple's guidance for blur
 * materials). The bevel is painted rather than sampled, because a native blur
 * view cannot re-render its backdrop at a thinner edge.
 */
export function GlassSurface({
  variant,
  material,
  cornerRadius,
  highlight = true,
  edge = true,
  elevated = true,
  tintColor,
  tintSecondary,
  pressed = false,
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const reducedTransparency = useReducedTransparency();
  const key = resolveGlassMaterial(variant, material);
  const m = theme.glass[key];
  const radius = cornerRadius ?? theme.radius.glass;
  const reflection = useGlassReflection(theme.motion.slow, reducedMotion);
  const press = useGlassPress(pressed, reducedMotion);
  // Whole-surface chrome should not sweep like a button on press: only the
  // small interactive glass (fields, chips, icon buttons) catches the light.
  const sweep = key === 'thin' || key === 'regular' || key === 'thick';
  const boxShadow = [
    // Wide ambient lift, then a tight contact shadow to ground the surface.
    `0px ${m.shadowOffsetY}px ${m.shadowRadius}px ${withAlpha(m.shadowColor, m.shadowOpacity)}`,
    `0px 1px 2px ${withAlpha(m.shadowColor, m.contactShadowOpacity)}`,
  ].join(', ');

  if (reducedTransparency) {
    return (
      <View
        {...rest}
        style={[
          glassSurfaceFrame(theme, key, { edge, cornerRadius }),
          {
            backgroundColor: theme.isDark ? theme.colors.surface : theme.colors.backgroundElevated,
            borderColor: theme.colors.borderStrong,
          },
          elevated && { boxShadow },
          style,
        ]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      {...rest}
      onPointerEnter={(event) => {
        rest.onPointerEnter?.(event);
        reflection.onHoverIn();
      }}
      onPointerLeave={(event) => {
        rest.onPointerLeave?.(event);
        reflection.onHoverOut();
      }}
      onTouchStart={(event) => {
        rest.onTouchStart?.(event);
        reflection.onTouchStart();
      }}
      onTouchEnd={(event) => {
        rest.onTouchEnd?.(event);
        reflection.onTouchEnd();
      }}
      onTouchCancel={(event) => {
        rest.onTouchCancel?.(event);
        reflection.onTouchCancel();
      }}
      style={[
        glassSurfaceFrame(theme, key, { edge, cornerRadius }),
        elevated && { boxShadow },
        { transform: press.transform },
        style,
      ]}>
      <BlurView
        intensity={m.intensity}
        tint={theme.isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: m.tint }]} />
      {/* Specular bloom from a light above the surface. */}
      {highlight ? (
        <LinearGradient
          pointerEvents="none"
          colors={[m.highlight, 'transparent']}
          start={glassSheenStart}
          end={glassSheenEnd}
          style={glassSurfaceSheen(theme, key)}
        />
      ) : null}
      {/* Material thickness: clear near the top, shaded towards the bottom. */}
      <LinearGradient
        pointerEvents="none"
        colors={theme.isDark
          ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.006)', 'rgba(0,0,0,0.12)']
          : ['rgba(255,255,255,0.045)', 'rgba(255,255,255,0.006)', 'rgba(64,48,74,0.055)']}
        locations={[0, 0.52, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={glassSurfaceRefractionHighlight()}
      />
      {/* Interaction energy: light rising inside the material on contact. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: press.glowOpacity }]}>
        <LinearGradient
          colors={[theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.75 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {tintColor ? (
        <LinearGradient
          pointerEvents="none"
          colors={[
            withAlpha(tintColor, theme.isDark ? 0.28 : 0.24),
            withAlpha(tintSecondary ?? tintColor, theme.isDark ? 0.10 : 0.06),
            'transparent',
          ]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.06, y: 0.2 }}
          end={{ x: 0.94, y: 0.9 }}
          style={glassSurfaceRefractionHighlight()}
        />
      ) : null}
      {edge ? <View pointerEvents="none" style={glassSurfaceRim(theme, key, radius)} /> : null}
      {sweep ? (
        <AnimatedLinearGradient
          pointerEvents="none"
          colors={theme.isDark
            ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']
            : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[glassSurfaceReflection(), reflection.style]}
        />
      ) : null}
      {children}
    </Animated.View>
  );
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
