/**
 * Visual identity keys for generated original demo artwork.
 *
 * The local catalog ships with original, palette-led cover compositions. Real
 * library artwork can later use `uri` while preserving the same component API.
 */
export type ArtworkPalette =
  | 'rose'
  | 'lavender'
  | 'plum'
  | 'haze'
  | 'dusk'
  | 'ocean'
  | 'sage'
  | 'ember';

export interface ArtworkDescriptor {
  palette: ArtworkPalette;
  /** Optional real image URL once a library exists (Phase 02+). */
  uri?: string;
  /** Short monogram drawn on generated artwork. */
  monogram?: string;
}
