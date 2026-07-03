# CLAUDE.md — SARAB Website

> Claude Code reads this file automatically at the start of every session. It is the
> operating manual for the project. Read it fully, then read the documents in `docs/`
> in numbered order **before doing anything else**.

## What we're building

A single-page, immersive website for **SARAB** — an AI solutions company whose flagship
product is an AI photobooth that turns ordinary event photos into studio-quality images
in seconds, with no photographer. It is the **first of its kind in the region**.

The website has one job: make a first-time visitor *feel something* — "this is magic, I
need this at my event" — and move them to book. Mesmerizing, futuristic, epic. Not a
brochure. An experience. The site itself should be proof of what SARAB does: it takes the
ordinary and makes it extraordinary, instantly.

## Critical safety boundaries — read first (breaking these is catastrophic)

SARAB runs a **live production photobooth app** (separate from this project) that serves
result images to guests at events via `edit.sarabaibooth.com` when they scan a QR code, and
digital galleries on other subdomains. These are live at real events. Breaking them ruins
events in progress. Therefore:

1. **The live image-editing app is out of scope. Never open, read, move, or modify its
   files — not for any reason, including "to understand it."** This website project is
   entirely separate. Everything you need to know about the domain is in
   `docs/05-DEPLOY-AND-BACKEND.md`. Do not go into the app's folder to learn it.
2. **Never edit or delete an existing DNS record on `sarabaibooth.com`.** It already has
   records in production use (`edit.` for QR result delivery, gallery subdomains, email).
   When attaching this site, only **add** the record for this site's hostname. List the
   existing records and confirm with the owner before making any DNS change, and verify
   afterward that the existing records are untouched.
3. **The owner's booking data is real and must be preserved.** Back it up before migrating.
   You may improve the structure only if every existing row is fully preserved.

If any step risks touching the live app or its DNS, stop and ask the owner first.

## The prime directive: assets before design

Do **not** design in a vacuum. Before any visual decision, complete the asset analysis in
`docs/03-ASSETS.md`. The real before/after photos, the logo, the reels, and the roll-up
poster hold SARAB's true visual DNA — palette, mood, the kind of transformation. The
design exists to frame *those specific assets* like jewelry. A beautiful shell that fights
the content is a failure.

The reference prompts in `reference/prompts-ideas.txt` are the **ambition bar and the
technical toolbox** (Three.js, GSAP, Lenis, cinematic scroll) — NOT templates to copy. The
goal is to beat them with something unmistakably SARAB.

## Persisting the asset analysis (never redo expensive work)

Reading image *content* is the most token-expensive step in this project. Do it **once**,
then save the findings so no session ever has to repeat it.

- **At the start of every session**, check whether `docs/ASSET-ANALYSIS.md` exists. If it
  does, **read it and treat it as the source of truth — do NOT re-analyze the images.**
- After the first analysis (Phase 1), write the full results to `docs/ASSET-ANALYSIS.md`
  (palette with hex codes, mood, per-image notes, before/after pairs, aspect ratios,
  recommended treatments). This file is the permanent, reusable record.
- Only analyze assets that are genuinely **new or changed** since the file was written,
  then append them.
- Listing files and reading their dimensions is cheap and can be redone anytime — but
  re-reading image content is not, so the visual findings must live in that file.

If a token reset interrupts the work, the next session simply reads `docs/ASSET-ANALYSIS.md`
and continues from the build plan — no re-analysis, no wasted tokens.

## Tech stack

- **Vite + React** — fast single-page build
- **Three.js / WebGL** — 3D and immersive layers, used with intent (never decoration for its own sake)
- **GSAP + ScrollTrigger** — cinematic scroll storytelling and reveals
- **Lenis** — smooth scrolling
- **Trilingual i18n** — English (LTR), Arabic (RTL), Hebrew (RTL), with a language switcher and full direction mirroring

Confirm any stack change with the owner before introducing it.

## Golden rules

1. Analyze assets first (`docs/03-ASSETS.md`), then design.
2. Assets drive the look; references set the ambition, not the appearance.
3. The before/after transformation is the **centerpiece** of the entire site.
4. Trilingual from the start — every string lives in the translation layer, never hardcoded. Mirror layouts and directional animations for RTL.
5. No generic AI aesthetics (see the anti-slop standard in `docs/02-DESIGN.md`).
6. Performance is part of the magic — lazy-load 3D and video, optimize assets, hold framerate on mobile. A stutter breaks the spell.
7. Work in phases with checkpoints (`docs/04-BUILD-PLAN.md`). Pause for the owner's review at each one — they have strong editorial instincts and want to steer.
8. Analyze image content **only once**. Save the findings to `docs/ASSET-ANALYSIS.md` and reuse that file every session instead of re-analyzing (see "Persisting the asset analysis" below).

## Reading order

1. `docs/00-VISION.md` — the feeling and the goal
2. `docs/01-BRAND.md` — who SARAB is and how it speaks
3. `docs/02-DESIGN.md` — art direction, motion, type, the quality bar
4. `docs/03-ASSETS.md` — the media and the analyze-first protocol
5. `docs/04-BUILD-PLAN.md` — the phased plan to execute
6. `docs/05-DEPLOY-AND-BACKEND.md` — booking backend, private dashboard, domain & deployment

## Running the project

After scaffolding: `npm install`, then `npm run dev` for local development and
`npm run build` for production. Document any deviations here as you set things up.

Backend (added at Step 1): `npm run build && npx wrangler pages dev dist` runs the site
with the booking Function against a local D1. Schema: `wrangler d1 execute sarab-bookings
--file db/schema.sql [--local|--remote]`. Config in `wrangler.toml`; deploy history and
specifics in the progress log at the end of `docs/05-DEPLOY-AND-BACKEND.md`.

## Definition of done

A visitor on a mid-range phone scrolls through a smooth, cinematic, trilingual one-pager;
the before/afters land like a wow; the reels feel native to the world; and reaching the
WhatsApp button or the lead form feels like the natural next step. It loads fast, works in
all three languages and directions, and looks like nothing else in the region.
