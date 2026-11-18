import { useReducedMotion, useReducedTransparency, useTheme } from '@lavender/design-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, View, type ViewStyle } from 'react-native';

import {
  glassSurfaceFrame,
  glassSurfaceRefractionHighlight,
  glassSurfaceReflection,
  resolveGlassMaterial,
  type GlassSurfaceProps,
  useGlassPress,
  useGlassReflection,
} from './GlassSurface.shared';
import { withAlpha } from './utils/color';

export type { GlassSurfaceProps } from './GlassSurface.shared';

/**
 * Web implementation of the glass primitive.
 *
 * A browser cannot displace a backdrop, so this is an *approximation* of Liquid
 * Glass rather than the system material — Apple's version lenses the content
 * behind the surface per-pixel. What is reproduced here is the layer stack that
 * makes glass read as glass:
 *
 * 1. a refraction band at the rim, rendered thinner (less blur, more
 *    saturation) than the body, so the edge transmits a clearer image;
 * 2. the body material — backdrop blur with recovered colour and luminance;
 * 3. a low flat body tint (the blur, not the paint, provides legibility);
 * 4. a directional specular bloom from a light above the surface;
 * 5. a luminous top bevel, side falloff and a caustic line along the bottom;
 * 6. an optional wash sampled from the artwork behind the surface;
 * 7. a tight contact shadow plus a wide ambient one, so it floats.
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
  // Whole-surface chrome should not sweep like a button on hover: only the
  // small interactive glass (fields, chips, icon buttons) catches the light.
  const sweep = key === 'thin' || key === 'regular' || key === 'thick';

  const boxShadow = [
    elevated
      ? `0px ${m.shadowOffsetY}px ${m.shadowRadius}px ${withAlpha(m.shadowColor, m.shadowOpacity)}`
      : '',
    // The contact shadow is what makes the surface sit *above* content instead
    // of being pasted onto it: short, tight and almost invisible on its own.
    elevated
      ? `0px 1px 2px ${withAlpha(m.shadowColor, m.contactShadowOpacity)}`
      : '',
    `inset 0px 1px 0px ${m.rimLight}`,
    `inset 1px 0px 0px ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.16)'}`,
    `inset -1px 0px 0px ${theme.isDark ? 'rgba(0,0,0,0.16)' : 'rgba(73,56,86,0.04)'}`,
    `inset 0px -1px 0px ${m.caustic}`,
    // The lower bevel is thicker, so it holds shade just inside the edge. This
    // is what makes the surface read as convex rather than as a flat panel.
    `inset 0px -12px 18px -14px ${theme.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(64,48,74,0.18)'}`,
  ].filter(Boolean).join(', ');

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
          {
            boxShadow: elevated
              ? `0px ${m.shadowOffsetY}px ${m.shadowRadius}px ${withAlpha(m.shadowColor, m.shadowOpacity)}`
              : undefined,
          } as unknown as ViewStyle,
          style,
        ]}>
        {children}
      </View>
    );
  }

  const artworkLight = tintColor
    ? {
        backgroundImage: [
          `radial-gradient(58% 132% at 6% 30%, ${withAlpha(tintColor, theme.isDark ? 0.26 : 0.24)} 0%, transparent 68%)`,
          `radial-gradient(52% 108% at 95% 88%, ${withAlpha(
            tintSecondary ?? tintColor,
            theme.isDark ? 0.13 : 0.07,
          )} 0%, transparent 72%)`,
        ].join(', '),
      }
    : null;

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
        // The body tint is painted above both backdrop layers, so it is never
        // blurred twice and never stacks with a native shadow.
        { backgroundColor: 'transparent' },
        { boxShadow } as unknown as ViewStyle,
        {
          // Transform is the only animated property: it stays on the compositor,
          // even though the surface sits on a backdrop filter.
          transform: press.transform,
        },
        {
          // Reduced motion removes even the short material cross-fade; the
          // surface still changes state, it just does so instantly.
          transition: reducedMotion
            ? undefined
            : `background-color ${theme.motion.base}ms ${theme.motion.easing.standard}, border-color ${theme.motion.base}ms ${theme.motion.easing.standard}, box-shadow ${theme.motion.base}ms ${theme.motion.easing.standard}`,
        } as unknown as ViewStyle,
        style,
      ]}>
      {/*
       * 1. Refracting rim. Full-bleed and painted first: the body below covers
       * its centre, so only a `refractionWidth` band remains around the edge.
       * That band filters the backdrop at a much lower radius, which is what
       * makes the edge look like the thin part of a lens instead of a second
       * blur layer. No mask is involved, so every browser gets the same result.
       */}
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            backdropFilter: rimFilter(m, theme.isDark),
            WebkitBackdropFilter: rimFilter(m, theme.isDark),
          } as unknown as ViewStyle,
        ]}
      />
      {/* 2. Body material, inset by the rim width to keep the edge thin. */}
      <View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            margin: m.refractionWidth,
            borderRadius: Math.max(radius - m.refractionWidth, 2),
            backdropFilter: bodyFilter(m),
            WebkitBackdropFilter: bodyFilter(m),
          } as unknown as ViewStyle,
        ]}
      />
      {/* 3. Body tint — low, neutral, and chosen to hold label contrast. */}
      <View pointerEvents="none" style={[styles.fill, { backgroundColor: m.tint }]} />
      {/* 4. Light above the surface: a soft bloom, strongest at the top edge. */}
      {highlight ? (
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            {
              backgroundImage: `radial-gradient(78% 42% at 50% -6%, ${m.highlight} 0%, transparent 70%)`,
            } as unknown as ViewStyle,
          ]}
        />
      ) : null}
      {/* 5. Material thickness: clear near the top, shaded towards the bottom. */}
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
      {/* Interaction energy: light rises inside the material on contact. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          {
            opacity: press.glowOpacity,
            backgroundImage: `radial-gradient(96% 74% at 50% -4%, ${
              theme.isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.85)'
            } 0%, transparent 70%)`,
          } as unknown as ViewStyle,
        ]}
      />
      {/* 6. The content behind the glass stains it, instead of a uniform fill. */}
      {artworkLight ? (
        <View pointerEvents="none" style={[styles.fill, artworkLight as unknown as ViewStyle]} />
      ) : null}
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

const styles = {
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
} as const;

/**
 * Body material. Saturation recovers the colour that blur flattens; brightness
 * keeps the glass grounded in the luminance of whatever is scrolling under it.
 */
function bodyFilter(m: { blurPx: number; saturation: number; brightness: number }): string {
  return `blur(${m.blurPx}px) saturate(${m.saturation}%) brightness(${m.brightness})`;
}

/**
 * Rim material: the same backdrop, seen through the thin edge of the lens —
 * sharper and more chromatic than the body. The slight luminance lift is what
 * reads as light concentrating at the bevel.
 */
function rimFilter(
  m: { refractionBlurPx: number; refractionSaturation: number; brightness: number },
  isDark: boolean,
): string {
  const brightness = Math.min(m.brightness + (isDark ? 0.06 : 0.05), 1.1);
  return `blur(${m.refractionBlurPx}px) saturate(${m.refractionSaturation}%) brightness(${brightness})`;
}

