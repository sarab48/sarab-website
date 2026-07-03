# 03 — Assets & The Analyze-First Protocol

## The protocol (do this before designing)

**First, check whether `docs/ASSET-ANALYSIS.md` already exists.** If it does, read it and
use it as the source of truth — do **not** re-analyze the images (re-reading image content
is the most expensive step in this project). Only analyze assets that are new or changed.

If it does not exist yet, inventory and study every asset in `public/assets/`, then **write
your findings to `docs/ASSET-ANALYSIS.md`** (this becomes the permanent, reusable record so
the images never need re-analyzing). It should contain:

1. The palette extracted from the logo, with **hex codes** (and a proposed site palette per
   `docs/02-DESIGN.md`).
2. The mood / visual character you read from the before/after work and the reels.
3. The before/after **pairs** detected, plus the aspect ratios and dimensions of every
   asset — so layout and the reel frames are designed around real media, not guessed.
4. Your recommended treatment for the before/afters and how the reels will be woven in.

Then present it at the **Phase 1 checkpoint** and get sign-off before moving to the design
system. The owner may review and adjust the file directly. From this point on, every
session reads this file instead of re-analyzing the images.

## Inventory & folders

- `public/assets/logo/` — the SARAB logo (identity + palette source)
- `public/assets/before-after/` — the transformation pairs (the centerpiece)
- `public/assets/reels/` — Instagram reels as self-hosted `.mp4`
- `public/assets/gallery/` — additional event / work images
- `public/assets/brand/` — roll-up poster and other SARAB visuals (cohesion / context)

## Naming convention (important for before/afters)

Pairs are named so the relationship is unambiguous:

```
<context>-<NN>-before.<ext>   /   <context>-<NN>-after.<ext>
```

e.g. `wedding-01-before.jpg` / `wedding-01-after.jpg`,
`corporate-02-before.jpg` / `corporate-02-after.jpg`. Detect pairs by this pattern.

## How to use each asset type

- **Logo** — extract palette; use at high-impact moments (open / close); never distort;
  respect clear space.
- **Before/after pairs** — the climax interaction (see `docs/02-DESIGN.md`). Each pair is a
  proof point. Design the reveal so the *after* lands as a wow. Don't crop away the magic;
  let the analysis tell you the right framing per image.
- **Reels** — muted, autoplay-on-view, looping, poster-framed, lazy-loaded; framed natively
  in the world, never as Instagram embeds.
- **Roll-up poster + brand visuals** — primary reference for staying on-brand; optionally
  feature as a textural / identity moment.
- **Gallery** — supporting proof; use to add atmosphere and density where the composition
  wants it.

## Optimization

Compress all media; generate responsive sizes; lazy-load everything below the fold;
provide poster frames for videos; preload only the hero asset. Keep the experience smooth
on mobile.

## If something's missing

If the analysis reveals a gap — too few before/after pairs to carry the centerpiece, a
low-resolution logo, reels in an awkward aspect ratio — flag it to the owner rather than
working around it silently.
