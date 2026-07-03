/*
  Curated before/after pairs for the centerpiece.
  IDs map to public/assets/before-after/web/wedding-<id>-before.jpg + -after.jpg.
  Web variants are 1080×1620 (2:3), EXIF baked upright, q90 progressive.

  Owner-curated selection + ordering (2026-06-30).
*/
export const PAIRS = [
  { id: '05'  },
  { id: '17'  },
  { id: '53'  },
  { id: '76'  },
  { id: '80'  },
  { id: '81'  },
  { id: '113' },
  { id: '169' },
  { id: '295' },
]

// Web-optimized, EXIF-baked-upright, 1080×1620 (2:3) — used by both the DOM and WebGL.
// Full-res originals stay in the parent dir for the Phase 6 responsive-image pass.
export const pairSrc = (id, which) =>
  `/assets/before-after/web/wedding-${id}-${which}.jpg`
