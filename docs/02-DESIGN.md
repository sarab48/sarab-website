# 02 — Design & Art Direction

This document sets the visual and motion standard. The aim: beat the references in
`reference/prompts-ideas.txt` using the same pro techniques, but in a language that is
unmistakably SARAB.

## The anti-slop standard (non-negotiable)

Do not produce generic AI-looking design. Specifically avoid:

- Overused fonts — Inter, Roboto, Arial, system-ui, and over-defaulted "designer" picks
  like Space Grotesk. Choose distinctive, characterful display type.
- Cliché color schemes — especially purple gradients on white.
- Predictable layouts — centered hero, three feature cards, generic footer.
- Decoration with no meaning. Every 3D element, particle, and motion must earn its place
  by serving the brand or the content.

Commit to ONE bold, cohesive aesthetic direction and execute it with precision. For SARAB
the natural territory is **dark, cinematic, futuristic, premium** — depth, glow, craft —
but let the asset analysis confirm and refine this before locking it.

## Color

Per the owner: **derive the palette from the logo if it serves the creative vision; if
not, be creative and evolve from it.** During asset analysis, extract the logo's colors
and propose a palette at the Phase 2 checkpoint. Favor a dominant base (likely a deep dark
canvas) with one or two sharp accents drawn from or harmonized with the logo. Avoid timid,
evenly-distributed palettes. Use CSS variables for everything.

## Typography — and the trilingual challenge

Critical and easy to get wrong. The "oversized cinematic typography" the references lean
on is Latin-centric. SARAB needs that same impact in **three scripts**:

- A distinctive **Latin** display face (characterful, premium — not the slop list above) +
  a refined Latin body face.
- A premium **Arabic** display + body pairing that carries the same energy. Arabic type has
  gorgeous display options — choose ones that feel modern and cinematic, not default web Arabic.
- A premium **Hebrew** display + body pairing, likewise.

All three must feel like one family *in spirit* — same confidence, same weight of presence —
even though they're different typefaces. Define them as CSS variables that swap with the
active language. Test the oversized headline treatments in all three scripts; what looks
epic in Latin can break in Arabic/Hebrew if not chosen and sized deliberately.

## Layout & composition

Unexpected, not template. Asymmetry, overlap, depth, grid-breaking moments, generous
negative space punctuated by controlled density. The page should feel art-directed scene
to scene, like a film — not stacked like a typical landing page.

## Motion language

- **Lenis** for smooth, slightly weighted scrolling — the whole experience should glide.
- **GSAP + ScrollTrigger** for cinematic section reveals, pinned scenes, and scroll-driven
  storytelling. Favor a few beautifully orchestrated big moments over scattered micro-animations.
- Timing roughly **0.4s–1.2s**, with considered easing (no linear, no default bounce). Add
  subtle motion blur / parallax where it deepens immersion.
- **Restraint is premium.** The references warn against overloading animation — heed it.
  Cinematic, not chaotic.

## 3D / WebGL (Three.js)

Use 3D to deepen the world, always tied to the brand:

- Atmosphere — depth, particles, soft volumetric glow, a living background that suggests
  "intelligence" and "future" without being literal.
- Ideally tie a 3D moment to the **before/after** — e.g., a transformation that feels
  dimensional, light resolving an image into clarity.
- Keep it performant (see budget below). Provide a graceful fallback for low-power devices.

## The before/after — the centerpiece

The climax of the site; design it as the single most memorable interaction. Strong
candidate treatments (pick/refine after seeing the real images):

- A **scroll-driven morph** where the ordinary photo resolves into the studio-quality
  result as the user scrolls.
- An **interactive reveal slider** the user drags to wipe before → after.
- A **cinematic cut** sequence stepping through several transformations with staggered reveals.

Whatever the mechanism: the *result* should feel like a held breath, then a wow. Make the
transformation feel instant and magical, mirroring the product.

## Reels / video

Self-hosted MP4s (`public/assets/reels/`), muted, autoplay-on-view, looping, framed as
part of the world — not embedded Instagram cards. Use poster frames so nothing pops in
ugly. Lazy-load. This is the "energy" beat showing the booth alive at real events.

## Backgrounds & detail

Atmosphere over flat color: gradient meshes, fine grain/noise overlays, layered
transparencies, glow, dramatic shadow, maybe a custom cursor at desktop. Every surface
should have intentional depth.

## RTL — mirror everything

For Arabic and Hebrew (`dir="rtl"`): mirror layout, alignment, and **directional
animations** (a reveal that slides from the left in English slides from the right in
Arabic/Hebrew). Do not mirror the logo or media content itself. Test every scene in both
directions.

## Performance budget (part of the magic)

- Lazy-load Three.js scenes and video; don't block first paint.
- Compress and serve responsive images; preload only the hero.
- Target a smooth experience on a mid-range phone. If a 3D effect can't hold framerate
  there, simplify it or gate it behind a capability check.
- A stutter breaks the spell — performance is a design requirement, not an afterthought.

## Accessibility basics

Sufficient text contrast, keyboard-reachable controls (language switcher, slider,
booking), `prefers-reduced-motion` honored with a calmer variant, alt text on meaningful
images. Premium and accessible are not in tension.
