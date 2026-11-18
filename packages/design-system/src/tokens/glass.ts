/**
 * Liquid Glass material tokens.
 *
 * Each material describes one intentional layer of glass. The same token feeds
 * the native `BlurView` (intensity) and the web `backdrop-filter` (blurPx) so
 * both platforms render the same hierarchy.
 *
 * Three semantic variants sit on top of the raw materials:
 * - `subtle`    → thin     (chips, fields, dense list panels)
 * - `standard`  → regular  (default panels, station rows)
 * - `prominent` → thick    (mini player, overlays, modal chrome)
 *
 * The optical fields (`refraction*`, `rimLight`, `caustic`) describe how the
 * material interacts with light, not how opaque it is. They are the difference
 * between "frosted panel" and a material that reads as glass: the rim is
 * thinner than the body, so it transmits a clearer, more saturated image, and
 * light concentrates along the bevel.
 */
export type GlassMaterialKey = 'thin' | 'regular' | 'thick' | 'navigation' | 'player' | 'overlay';

export type GlassVariant = 'subtle' | 'standard' | 'prominent';

export const glassVariantMaterial: Record<GlassVariant, GlassMaterialKey> = {
  subtle: 'thin',
  standard: 'regular',
  prominent: 'thick',
};

export type GlassMaterial = {
  /** Native `BlurView` intensity, 0–100. */
  intensity: number;
  /** CSS backdrop blur radius in px for the material body. */
  blurPx: number;
  /** Backdrop saturation for the body, in percent. Recovers colour the blur flattens. */
  saturation: number;
  /** Backdrop luminance multiplier for the body. */
  brightness: number;
  /** Translucent fill layered above the blur. Kept low: the blur holds legibility. */
  tint: string;
  /** Soft outer edge that separates the material from the content behind it. */
  border: string;
  /** Edge thickness in px. */
  borderWidth: number;
  /** Top specular bloom colour; fades to transparent. */
  highlight: string;
  /** How far down the bloom reaches, as a percentage of the surface height. */
  highlightHeight: number;
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffsetY: number;
  /**
   * Width in px of the rim band, where the material is thinnest. A browser
   * cannot displace the backdrop, so the band is rendered with less blur and
   * more saturation than the body: content peeks through sharper and richer at
   * the edge, which is the visual cue people read as refraction.
   */
  refractionWidth: number;
  /** Backdrop blur inside the rim band. Always lower than `blurPx`. */
  refractionBlurPx: number;
  /** Backdrop saturation inside the rim band. Always higher than `saturation`. */
  refractionSaturation: number;
  /** Luminous hairline along the top bevel. */
  rimLight: string;
  /** Light travelling through the bottom edge, opposite the top bloom. */
  caustic: string;
  /** Tight contact shadow that grounds a floating surface. */
  contactShadowOpacity: number;
};

export type GlassMaterials = Record<GlassMaterialKey, GlassMaterial>;
