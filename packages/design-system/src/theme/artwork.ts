import type { ArtworkPalette } from '@lavender/shared';

/** Original, palette-led cover artwork for the local demo catalog. The colors
 * stay constant between themes, as a real album cover would. */
export const lightArtwork: Record<ArtworkPalette, [string, string]> = {
  rose: ['#EAB6B9', '#9B5573'],
  lavender: ['#D3C2E8', '#786493'],
  plum: ['#D3A17F', '#654656'],
  haze: ['#A8CFC6', '#E7D7C3'],
  dusk: ['#30465F', '#D1846C'],
  ocean: ['#9CC6D6', '#426A83'],
  sage: ['#D5D9AD', '#688C7E'],
  ember: ['#F2AE78', '#A94F45'],
};

export const darkArtwork = lightArtwork;
