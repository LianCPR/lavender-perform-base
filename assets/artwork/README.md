# assets/artwork

Reserved for real cover art.

Phase 01 renders covers procedurally: `packages/ui/src/Artwork.tsx` draws a
gradient from one of five palette keys (`packages/design-system/src/theme/artwork.ts`),
so no image files are required. When real artwork arrives, `Artwork` gains a `uri`
prop and this folder holds the cached assets.
