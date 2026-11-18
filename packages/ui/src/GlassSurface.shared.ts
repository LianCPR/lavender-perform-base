import {
  glassVariantMaterial,
  type GlassMaterialKey,
  type GlassVariant,
  type Theme,
} from '@lavender/design-system';
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  type DimensionValue,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

/**
 * Props shared by the native and web implementations of `GlassSurface`.
 *
 * Both `GlassSurface.tsx` and `GlassSurface.web.tsx` import this type, so the
 * two platform variants cannot declare different surfaces.
 */
export interface GlassSurfaceProps extends ViewProps {
  /** Semantic glass variant. Prefer this over `material`. */
  variant?: GlassVariant;
  /** Raw material override for chrome-specific layers (navigation, player). */
  material?: GlassMaterialKey;
  /** Corner radius; defaults to the large glass radius token. */
  cornerRadius?: number;
  /** Draw the top light sheen. */
  highlight?: boolean;
  /** Draw the edge light. */
  edge?: boolean;
  /** Adds a soft lift (shadow). */
  elevated?: boolean;
  /**
   * Ambient color sampled from the content under the glass (for example album
   * artwork). Applied as a restrained wash, never as an opaque tint.
   */
  tintColor?: string;
  /**
   * Second artwork color, used at the opposite edge so the wash reads as light
   * passing through the cover rather than one flat stain.
   */
  tintSecondary?: string;
  /**
   * Drives the Liquid Glass press response: the surface squashes, lifts and
   * energizes from within, then settles. Owned by the interactive parent.
   */
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Resolve the material a surface uses: explicit material wins over variant. */
export function resolveGlassMaterial(
  variant: GlassSurfaceProps['variant'],
  material: GlassSurfaceProps['material'],
): GlassMaterialKey {
  return material ?? (variant ? glassVariantMaterial[variant] : 'regular');
}

/**
 * Luminous rim overlay for native, where the backdrop cannot be re-sampled at a
 * thinner edge: a 1px bevel painted inside the shape stands in for the light
 * concentrating along the refraction band.
 */
export function glassSurfaceRim(
  theme: Theme,
  material: GlassMaterialKey,
  cornerRadius: number,
): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: cornerRadius,
    borderWidth: 1,
    borderColor: theme.glass[material].rimLight,
  };
}

/** Radius, clip, edge light and tint — identical on every platform. */
export function glassSurfaceFrame(
  theme: Theme,
  material: GlassMaterialKey,
  { edge, cornerRadius }: { edge: boolean; cornerRadius?: number },
): ViewStyle {
  const m = theme.glass[material];
  return {
    borderRadius: cornerRadius ?? theme.radius.glass,
    overflow: 'hidden',
    borderWidth: edge ? m.borderWidth : 0,
    borderColor: m.border,
    // Callers paint the body tint above the blur layers; a background here
    // would be sampled by the blur again and double the material's density.
    backgroundColor: 'transparent',
  };
}

/** The top sheen layer, sized by the material's highlight height. */
export function glassSurfaceSheen(theme: Theme, material: GlassMaterialKey): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: `${theme.glass[material].highlightHeight}%` as DimensionValue,
  };
}

/** Full-surface bounds keep the soft diagonal refraction free of hard corners. */
export function glassSurfaceRefractionHighlight(): ViewStyle {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  };
}

/** Sheen gradient geometry, shared so highlights stay aligned across platforms. */
export const glassSheenStart = { x: 0.15, y: 0 };
export const glassSheenEnd = { x: 0.45, y: 1 };

/**
 * Liquid Glass press physics, shared by both platforms.
 *
 * Apple describes interaction as the material flexing and energizing with
 * light, not as a control shrinking. One spring drives all of it: the surface
 * squashes a little on the axis of the finger, lifts 1px, and a specular bloom
 * rises from zero. `overshootClamping` keeps the release from bouncing.
 */
export function useGlassPress(pressed: boolean, reducedMotion: boolean) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      value.setValue(0);
      return;
    }
    const animation = Animated.spring(value, {
      toValue: pressed ? 1 : 0,
      overshootClamping: true,
      useNativeDriver: Platform.OS !== 'web',
      ...(pressed
        ? { damping: 26, stiffness: 360, mass: 0.6 }
        : { damping: 24, stiffness: 220, mass: 0.85 }),
    });
    animation.start();
    return () => animation.stop();
  }, [pressed, reducedMotion, value]);

  return {
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
      { scaleX: value.interpolate({ inputRange: [0, 1], outputRange: [1, 1.008] }) },
      { scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [1, 0.982] }) },
    ],
    /** Specular energy: light rising inside the material on contact. */
    glowOpacity: value.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
  };
}

/** Shared, one-shot light sweep for pointer hover and touch; never loops. */
export function useGlassReflection(duration: number, reducedMotion: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const reveal = useCallback(() => {
    if (reducedMotion) return;
    progress.stopAnimation();
    opacity.stopAnimation();
    progress.setValue(0);
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: duration * 2.5,
        easing: Easing.bezier(0.2, 0, 0, 1),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.sequence([
        Animated.timing(opacity, {
        toValue: 0.18,
          duration: duration * 0.55,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.delay(duration * 1.1),
        Animated.timing(opacity, {
          toValue: 0,
          duration: duration * 0.85,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ]).start();
  }, [duration, opacity, progress, reducedMotion]);

  const conceal = useCallback(() => {
    if (reducedMotion) return;
    opacity.stopAnimation();
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration * 0.7,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [duration, opacity, reducedMotion]);

  return {
    onHoverIn: reveal,
    onHoverOut: conceal,
    onTouchStart: reveal,
    onTouchEnd: conceal,
    onTouchCancel: conceal,
    style: {
      opacity,
      transform: [
        {
          translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-420, 420] }),
        },
        { rotate: '18deg' },
      ],
    } as unknown as ViewStyle,
  };
}

/** A narrow specular reflection; it reads as a moving light, not a border. */
export function glassSurfaceReflection(): ViewStyle {
  return {
    position: 'absolute',
    left: '-20%',
    top: '-20%',
    bottom: '-20%',
    width: '12%',
  };
}
