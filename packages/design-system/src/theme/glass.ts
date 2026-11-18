import type { GlassMaterials } from '../tokens/glass';

/**
 * Transparent, layered materials shared by native blur and web backdrop blur.
 *
 * The hierarchy is intentionally narrow: chrome (navigation, player) keeps
 * enough body to hold text over artwork, while content-level glass stays close
 * to a lens — a little blur, a little tint, and edge light rather than a fill.
 *
 * Balance rules, learned the hard way:
 * - The flat fill must stay low (0.3–0.45). A 60%+ white wash over a near-white
 *   page is what turns glass into a grey slab.
 * - Colour comes from saturation in the backdrop, not from paint on the glass.
 * - Depth comes from a thin rim that transmits a clearer image than the body,
 *   a directional top bloom and a tight contact shadow — not from a wider box
 *   shadow or a brighter border.
 */
export const lightGlass: GlassMaterials = {
  thin: {
    intensity: 24, blurPx: 12, saturation: 165, brightness: 1.02,
    tint: 'rgba(255,255,255,0.22)',
    border: 'rgba(86,74,96,0.10)', borderWidth: 0.8,
    highlight: 'rgba(255,255,255,0.26)', highlightHeight: 26,
    shadowColor: '#514653', shadowOpacity: 0.035, shadowRadius: 10, shadowOffsetY: 3,
    refractionWidth: 6, refractionBlurPx: 2, refractionSaturation: 215,
    rimLight: 'rgba(255,255,255,0.55)', caustic: 'rgba(255,248,255,0.10)',
    contactShadowOpacity: 0.03,
  },
  regular: {
    intensity: 32, blurPx: 16, saturation: 170, brightness: 1.02,
    tint: 'rgba(255,255,255,0.26)',
    border: 'rgba(86,74,96,0.11)', borderWidth: 0.8,
    highlight: 'rgba(255,255,255,0.30)', highlightHeight: 28,
    shadowColor: '#514653', shadowOpacity: 0.045, shadowRadius: 14, shadowOffsetY: 4,
    refractionWidth: 8, refractionBlurPx: 2.5, refractionSaturation: 220,
    rimLight: 'rgba(255,255,255,0.58)', caustic: 'rgba(255,248,255,0.11)',
    contactShadowOpacity: 0.035,
  },
  thick: {
    intensity: 42, blurPx: 20, saturation: 175, brightness: 1.03,
    tint: 'rgba(252,250,253,0.34)',
    border: 'rgba(86,74,96,0.12)', borderWidth: 0.85,
    highlight: 'rgba(255,255,255,0.32)', highlightHeight: 30,
    shadowColor: '#514653', shadowOpacity: 0.055, shadowRadius: 16, shadowOffsetY: 5,
    refractionWidth: 10, refractionBlurPx: 3, refractionSaturation: 225,
    rimLight: 'rgba(255,255,255,0.62)', caustic: 'rgba(255,248,255,0.12)',
    contactShadowOpacity: 0.04,
  },
  navigation: {
    intensity: 62, blurPx: 28, saturation: 215, brightness: 1.03,
    tint: 'rgba(252,250,253,0.32)',
    border: 'rgba(86,74,96,0.18)', borderWidth: 1,
    highlight: 'rgba(255,255,255,0.16)', highlightHeight: 34,
    shadowColor: '#514653', shadowOpacity: 0.10, shadowRadius: 26, shadowOffsetY: 8,
    refractionWidth: 12, refractionBlurPx: 4, refractionSaturation: 240,
    rimLight: 'rgba(255,255,255,0.58)', caustic: 'rgba(255,248,255,0.14)',
    contactShadowOpacity: 0.05,
  },
  player: {
    intensity: 60, blurPx: 26, saturation: 220, brightness: 1.03,
    tint: 'rgba(252,250,253,0.28)',
    border: 'rgba(86,74,96,0.17)', borderWidth: 1,
    highlight: 'rgba(255,255,255,0.15)', highlightHeight: 32,
    shadowColor: '#514653', shadowOpacity: 0.10, shadowRadius: 22, shadowOffsetY: 7,
    refractionWidth: 11, refractionBlurPx: 4, refractionSaturation: 245,
    rimLight: 'rgba(255,255,255,0.56)', caustic: 'rgba(255,248,255,0.13)',
    contactShadowOpacity: 0.05,
  },
  overlay: {
    intensity: 62, blurPx: 30, saturation: 170, brightness: 1.02,
    tint: 'rgba(250,250,251,0.30)',
    border: 'rgba(86,74,96,0.12)', borderWidth: 0.9,
    highlight: 'rgba(255,255,255,0.34)', highlightHeight: 30,
    shadowColor: '#514653', shadowOpacity: 0.09, shadowRadius: 28, shadowOffsetY: 10,
    refractionWidth: 12, refractionBlurPx: 3, refractionSaturation: 220,
    rimLight: 'rgba(255,255,255,0.62)', caustic: 'rgba(255,248,255,0.12)',
    contactShadowOpacity: 0.04,
  },
};

export const darkGlass: GlassMaterials = {
  thin: {
    intensity: 24, blurPx: 12, saturation: 155, brightness: 0.96,
    tint: 'rgba(30,28,36,0.24)',
    border: 'rgba(255,255,255,0.10)', borderWidth: 0.8,
    highlight: 'rgba(255,255,255,0.10)', highlightHeight: 26,
    shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffsetY: 3,
    refractionWidth: 6, refractionBlurPx: 2, refractionSaturation: 200,
    rimLight: 'rgba(255,255,255,0.24)', caustic: 'rgba(255,255,255,0.045)',
    contactShadowOpacity: 0.06,
  },
  regular: {
    intensity: 32, blurPx: 16, saturation: 158, brightness: 0.95,
    tint: 'rgba(30,28,36,0.30)',
    border: 'rgba(255,255,255,0.11)', borderWidth: 0.8,
    highlight: 'rgba(255,255,255,0.12)', highlightHeight: 28,
    shadowColor: '#000000', shadowOpacity: 0.20, shadowRadius: 14, shadowOffsetY: 4,
    refractionWidth: 8, refractionBlurPx: 2.5, refractionSaturation: 205,
    rimLight: 'rgba(255,255,255,0.26)', caustic: 'rgba(255,255,255,0.05)',
    contactShadowOpacity: 0.07,
  },
  thick: {
    intensity: 42, blurPx: 20, saturation: 162, brightness: 0.94,
    tint: 'rgba(28,26,34,0.38)',
    border: 'rgba(255,255,255,0.12)', borderWidth: 0.85,
    highlight: 'rgba(255,255,255,0.14)', highlightHeight: 30,
    shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 16, shadowOffsetY: 5,
    refractionWidth: 10, refractionBlurPx: 3, refractionSaturation: 210,
    rimLight: 'rgba(255,255,255,0.28)', caustic: 'rgba(255,255,255,0.06)',
    contactShadowOpacity: 0.08,
  },
  navigation: {
    intensity: 62, blurPx: 28, saturation: 190, brightness: 0.90,
    tint: 'rgba(24,22,30,0.44)',
    border: 'rgba(255,255,255,0.16)', borderWidth: 1,
    highlight: 'rgba(255,255,255,0.11)', highlightHeight: 34,
    shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 28, shadowOffsetY: 9,
    refractionWidth: 12, refractionBlurPx: 4, refractionSaturation: 220,
    rimLight: 'rgba(255,255,255,0.30)', caustic: 'rgba(255,255,255,0.06)',
    contactShadowOpacity: 0.10,
  },
  player: {
    intensity: 60, blurPx: 26, saturation: 195, brightness: 0.90,
    tint: 'rgba(24,22,30,0.40)',
    border: 'rgba(255,255,255,0.16)', borderWidth: 1,
    highlight: 'rgba(255,255,255,0.11)', highlightHeight: 32,
    shadowColor: '#000000', shadowOpacity: 0.34, shadowRadius: 24, shadowOffsetY: 8,
    refractionWidth: 11, refractionBlurPx: 4, refractionSaturation: 230,
    rimLight: 'rgba(255,255,255,0.30)', caustic: 'rgba(255,255,255,0.06)',
    contactShadowOpacity: 0.10,
  },
  overlay: {
    intensity: 62, blurPx: 30, saturation: 158, brightness: 0.94,
    tint: 'rgba(30,30,36,0.34)',
    border: 'rgba(255,255,255,0.14)', borderWidth: 0.9,
    highlight: 'rgba(255,255,255,0.18)', highlightHeight: 30,
    shadowColor: '#000000', shadowOpacity: 0.30, shadowRadius: 30, shadowOffsetY: 10,
    refractionWidth: 12, refractionBlurPx: 3, refractionSaturation: 205,
    rimLight: 'rgba(255,255,255,0.26)', caustic: 'rgba(255,255,255,0.07)',
    contactShadowOpacity: 0.08,
  },
};
