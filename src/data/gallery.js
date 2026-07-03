// After-portraits that float in the hero "mirage gallery". These are the beauty shots —
// the product's proof, made the centerpiece of the cover. A broad spread of the strongest
// afters so the field reads rich and varied; near rings get the front of this list (see
// HeroScene LAYOUT), deep rings cycle/repeat where fog hides any reuse.
//
// These load from a dedicated LIGHTER set (`/web/hero/`, 640×960) so we can float many
// dozens of cards without the GPU-memory cost of the full 1080px DOM set. Generate a hero
// variant for any id added here (see docs/ASSET-ANALYSIS.md build log for the recipe).

// Documented-strong + the original curated set lead the list. The hero gallery cycles the
// whole pool over time (cards dive into the deep and re-emerge with a fresh portrait), so
// every id here gets its moment — 40 distinct afters keep the rotation from ever repeating.
export const GALLERY_AFTER_IDS = [
  '01', '200', '76', '113', '156', '232', '99', '128', '148', '205',
  '03', '12', '21', '29', '43', '46', '51', '54', '65', '66', '80',
  '87', '94', '111', '118', '129', '132', '154', '169', '178', '193',
  '213', '216', '270', '08', '41', '86', '162', '204', '286',
]

// Hero-gallery texture: light 640×960 variant, sized for small floating cards behind fog.
export const heroSrc = (id) => `/assets/before-after/hero/wedding-${id}-after.jpg`

export const GALLERY_AFTERS = GALLERY_AFTER_IDS.map(heroSrc)
