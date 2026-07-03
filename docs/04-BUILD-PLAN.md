# 04 — Build Plan

Work in phases. **Pause at each checkpoint (⟂) for the owner's review** — they have strong
editorial instincts and want to steer the look and the words. Don't run ahead.

## Phase 0 — Setup

- Scaffold Vite + React; install Three.js, GSAP (+ ScrollTrigger), Lenis.
- Create the folder structure and the i18n layer (English / Arabic / Hebrew) with a
  language switcher and `dir` handling wired up but empty.
- Confirm the dev server runs.

## Phase 1 — Asset analysis  ⟂ CHECKPOINT

- First check for `docs/ASSET-ANALYSIS.md`. If it exists, read it and skip re-analysis;
  continue from where the build left off.
- Otherwise run the analyze-first protocol in `docs/03-ASSETS.md` and **write the results
  to `docs/ASSET-ANALYSIS.md`** (the permanent record so images are never re-analyzed and
  no tokens are wasted after a reset).
- Present the analysis (palette, mood, pairs, aspect ratios, recommended before/after
  treatment, reel plan).
- **Get the owner's sign-off before designing.**

## Phase 2 — Design system  ⟂ CHECKPOINT

- Lock the palette (from / with the logo per the owner's direction), the three type
  pairings (Latin / Arabic / Hebrew), spacing, motion primitives, and the dark cinematic base.
- Produce one or two **styleframes** (a hero still + the before/after concept) for approval.
- **Get sign-off before full build.**

## Phase 3 — Structure & sections

- Build the scroll skeleton in real layout (still light on motion / 3D):
  hook → promise → before/after → reels → booking.
- Wire the trilingual strings (draft copy, flagged for review) and RTL / LTR switching
  across all sections.

## Phase 4 — Motion & 3D

- Layer Lenis smooth scroll, GSAP / ScrollTrigger cinematic reveals, and the Three.js
  atmosphere.
- Build the before/after centerpiece interaction to its full wow.
- Mirror directional animations for RTL.

## Phase 5 — Content & polish  ⟂ CHECKPOINT

- Finalize copy in all three languages with the owner (especially the Levantine Arabic).
- Polish typography in every script, timing curves, and transitions.
- **Owner review of the full experience in all three languages.**

## Phase 6 — Performance, responsive & ship

- Optimize media, lazy-load 3D / video, hit the mobile performance budget, honor
  `prefers-reduced-motion`.
- Test across the three languages / directions and on a mid-range phone.
- Deploy (e.g., Vercel or Netlify) and hand over.

## Booking — to confirm during the build

Two paths the owner has chosen:

1. **WhatsApp button** — a `wa.me` deep link (needs the owner's WhatsApp number).
2. **Lead-capture form** — "leave your info and we'll get back to you." The data needs a
   destination. Recommended: a no-backend form service (e.g., Formspree / Basin) or a small
   serverless function that emails SARAB, so the form stays native to the design rather than
   an embedded Google Form.

**Confirm the owner's form preference and collect the WhatsApp number before building the
booking section.**
