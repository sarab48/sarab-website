# ASSET ANALYSIS — SARAB (permanent record)

> **This file is the source of truth for the visual DNA.** It was produced by a one-time,
> token-expensive reading of the image *content*. **Do NOT re-analyze the images.** Read this
> instead. Only analyze assets that are genuinely new/changed since the date below, then append.
>
> Analyzed: **2026-06-24** · Method: downscaled contact-grids + sample pairs + logo/poster reads
> + ImageMagick/ffprobe metadata + PIL color quantization.

---

## 0. Headline takeaway (read this first)

**SARAB means "mirage" (سراب).** The entire brand is built on that idea: a shimmering,
warm, desert/silk mirage — **not** the dark-neon-cyberpunk register the reference prompts
lean on. The owner's docs explicitly defer the palette to this analysis ("derive from the
logo if it serves the vision; evolve if not"). **The assets say: warm, luxe, champagne-gold,
silk, ivory, soft pearlescent light.** This is the real DNA and it is gorgeous.

The product, made literal by the assets: an **AI photobooth kiosk** at events. A guest's
ordinary phone/camera snapshot goes in; seconds later a **studio-grade portrait** comes out —
the *person is preserved, the entire world around them is replaced* with a luxury candlelit
or floral studio scene, relit and retouched, stamped with the event name + date, and
printed on-site / shown on a photo wall. Slogan: **"صورتك بأسلوبك / Your photo · your style."**
Instagram: **@sarab_ai25**.

---

## 1. Palette (extracted, with hex)

### Logo + brand source colors (measured)
| Role | Hex | Notes |
|---|---|---|
| Cream / ivory ground (dominant) | `#F1E5D2` | Logo background; ~98% of the logo |
| Champagne / sand | `#E1CDAD` | Poster mid-ground |
| Warm beige | `#E5D0B8` / `#EFE0CD` | Poster fields |
| **Soft gold / caramel (primary accent)** | `#C2A179` | Logo strokes, wordmark, lighter gold |
| **Bronze (logo strokes / wordmark)** | `#A57743` | The two mirage strokes + "SARAB" type |
| Deep bronze | `#A3743E` / `#996C37` | Darker stroke / emphasis gold |
| Muted taupe | `#B4A08B` / `#8C7861` | Poster shadow tones |
| Espresso (deepest text) | `#473420` / `#5A3F26` | Darkest brown in the system |

### Proposed SITE palette (to lock at Phase 2 — recommendation)
The brand is *light champagne*. But the before/after climax needs darkness to make the warm
"after" portraits **glow like jewelry**. Recommendation: a **warm cinematic** direction that
honors the mirage DNA while keeping the epic, immersive feel the vision asks for.

```
--canvas-deep    #14100B   /* warm near-black espresso — hero & before/after frame   */
--canvas-ink     #1E170F   /* slightly lifted panel brown                            */
--cream          #F3E9D8   /* primary light surface / "champagne" sections           */
--ivory          #FBF6EC   /* lightest text-on-dark / paper                          */
--gold           #C9A24E   /* primary accent — wordmark gold, glow, CTAs             */
--bronze         #A57743   /* logo-true bronze; borders, secondary accent            */
--caramel        #C2A179   /* mid warm tone, gradients                               */
--espresso-text  #2A1E12   /* body text on cream                                     */
--glow           rgba(201,162,78,0.45) /* gold bloom for WebGL / shadows             */
```
Direction: **deep espresso canvas + champagne/ivory light scenes + gold/bronze accents +
a living silk-mirage shimmer.** Alternate the page between dark "void" beats (hero, the
reveal) and warm champagne "light" beats (promise, booking) — the contrast IS the mirage.

> ⚠️ **Owner decision needed (Phase 1/2):** confirm the *warm* direction over the
> dark-cyberpunk default in the reference prompts. Two viable variants to choose at Phase 2:
> (A) **espresso-dark dominant** (cinematic, dramatic — recommended for the wow), or
> (B) **champagne-light dominant** (matches the poster system 1:1, softer/luxury-editorial).

---

## 2. Mood / visual character

- **Logo:** minimalist mark = two stacked wavy strokes (≈) — a **mirage / heat-shimmer /
  water-reflection** motif. Wordmark "SARAB" set in an elegant, wide-tracked, thin **roman
  capital** face (high-contrast, classy — think a refined display serif/Trajan-adjacent),
  in bronze. Tagline "AI PHOTOBOOTH" in spaced caps.
- **Brand posters (rollup + clean + booking):** flowing **liquid-gold silk** backgrounds —
  pearlescent champagne fabric with soft gold highlights and gentle waves. Extremely
  premium, calm, luxurious, feminine-leaning elegance. This silk-wave texture is the single
  most usable motif for the site's WebGL atmosphere (a flowing, shimmering mirage surface).
- **"After" outputs (the DNA of the product):** warm, cinematic, editorial. Consistent
  styles: (a) **candlelit ballroom** — hundreds of candles, rose arrangements, golden glow;
  (b) **rose / floral wall studio** — soft pink-cream roses, gentle light; (c) **white
  floral arch + lush greenery** (the most common in the grid) — warm gold key light.
  All warm, all flattering, all luxury-wedding grade. Overlaid with a script event name +
  date and a discreet `@sarab_ai25` watermark.
- **"Before" inputs (the ordinary):** flat on-camera flash, mundane venue backgrounds (white
  counters, wood paneling, banquet clutter), slightly awkward poses. Deliberately
  unglamorous — the contrast is the whole point.

---

## 3. Before/after pairs — inventory & the critical structural fact

- **106 pairs**, all named `wedding-NN-before.jpg` / `wedding-NN-after.jpg` (NN = 01…294,
  non-contiguous). Detect by that pattern. Gallery folder is **empty** (see gaps).
- **EVERY `before`**: stored `6000×4000` **but carries EXIF orientation `RightTop` (rotate
  90° CW)** → true displayed orientation is **`4000×6000` PORTRAIT (2:3)**. Raw camera snapshot.
- **EVERY `after` = `2160×3240` (2:3 PORTRAIT)**, EXIF orientation undefined — formatted studio output.
- ⇒ **Both before and after are ~2:3 PORTRAIT at the same aspect ratio.**
- File sizes: 0.64 MB – 8.5 MB, median ~1.2 MB. **All need compression + responsive sizes**
  (the 24 MP befores especially).

> 🔑 **EXIF caveat (must handle in code).** Browsers auto-orient `<img>` (default
> `image-orientation: from-image`), so the befores display upright in the live site **only if
> you don't strip EXIF**. Any processing step (sharp/ImageMagick resize, canvas/WebGL upload,
> `<canvas>` sampling) ignores EXIF and yields a sideways landscape unless you **bake the
> rotation** first (`-auto-orient` / `sharp().rotate()`). Do this in the Phase 6 optimization
> pass so every downstream consumer (responsive images, WebGL textures, poster crops) gets
> upright portrait pixels.
>
> 🔑 **Centerpiece implication (corrected).** Because both are the **same 2:3 portrait
> aspect**, a drag-to-wipe slider is now *technically* possible — BUT the two are still
> **entirely different scenes** (full background/lighting replacement, not a pixel-aligned
> edit), so a spatial wipe reveals a jarring mismatch, not a smooth reveal. The **mirage
> dissolve/morph** (§5) remains the recommended treatment; the matched aspect makes it
> *cleaner* (no letterboxing between states).

### Sampled pairs (representative, studied in detail)
| Pair | Before (ordinary) | After (transformed) |
|---|---|---|
| `wedding-01` | Teen boy, navy suit, flat flash, white counter + ceiling lights | Same boy, 3-piece suit, candlelit ballroom, hundreds of candles + roses; "Angie's Party · 20.05.2026" |
| `wedding-76` | Man, grey blazer, awkward bright snapshot | Same man, candlelit ballroom portrait, warm editorial light |
| `wedding-200` | Older couple, dim wood-panel hallway | Same couple, soft rose-wall studio, blush roses; Arabic name "زيانة وربيع · 22.05.2026" |

---

## 4. Reels — inventory & plan

10 self-hosted MP4s. Mostly vertical (9:16), two are landscape (16:9). Heavy — **must
compress + poster-frame + lazy-load**.

| File | Dims | Aspect | Dur | Size |
|---|---|---|---|---|
| `0606 (4)-8b7d91abd4acab0c9e36b1b9403a5c40.mp4` | 2160×3840 | 9:16 | 17.4s | 67 MB |
| `20260522_203312.mp4` | 1920×1080 | 16:9 | 11.1s | 29 MB |
| `20260522_234018.mp4` | 1920×1080 | 16:9 | 6.8s | 19 MB |
| `lv_0_20260522135817.mp4` | 1078×1920 | 9:16 | 23.3s | 29 MB |
| `lv_0_20260525124010.mp4` | 1080×1920 | 9:16 | 31.0s | 36 MB |
| `lv_0_20260527202013.mp4` | 2160×3838 | 9:16 | 10.1s | 27 MB |
| `lv_0_20260528162112.mp4` | 2160×3840 | 9:16 | 7.9s | 42 MB |
| `lv_0_20260610200248.mp4` | 2160×3840 | 9:16 | 17.1s | 78 MB |
| `lv_7509237339567197501_20260605183848.mp4` | 1080×1920 | 9:16 | 6.4s | 6.1 MB |
| `lv_7618711392962546960_20260527204935.mp4` | 1938×3840 | 9:16 | 15.6s | 45 MB |

**Content (from poster frames):** the booth/kiosk in action, the on-screen **"to this:"**
reveal, a **photo wall** of printed portraits (floral-arch style), the **printer** dispensing
prints, traditional Levantine attire moments (tarboosh/robe), event crowds, couples posing.
This is the **"energy / live experience"** beat.

**Reel plan:** treat the 8 vertical reels as the primary energy gallery — muted, autoplay-
on-view, looping, poster-framed, lazy-loaded, framed natively as floating "kiosk screens" in
the world (never IG embeds). Use the 2 landscape clips for a wide ambient/crowd moment or a
background band. Generate WebP/JPEG poster frames (mid-clip) for every reel so nothing pops
in ugly. Re-encode to ~720–1080p H.264/H.265 + (optionally) AV1/WebM to cut the 6–78 MB
weight before ship.

---

## 5. Recommended treatment

### The before/after centerpiece (the climax) — **"mirage reveal"**
Because before↔after are different scenes (not a wipe), use the brand's own metaphor:

- **Mirage dissolve/morph:** the dull *before* (portrait) heat-shimmers (mirage distortion
  shader — the logo motif made literal) and **re-forms** into the portrait *after*, which
  then settles, glows, and stamps its event-name caption. Scroll-driven (GSAP/ScrollTrigger),
  ideally a WebGL displacement/RGB-shift shimmer for the transition itself.
- The *before* sits dull/cool/flat; the *after* resolves warm/lit/glowing — the relief is
  the wow. Hold the after a beat (the "held breath, then wow").
- **Sequence several** (3–5 curated pairs) as cinematic cuts, each a different "style"
  (candlelit / rose-wall / floral-arch) — which also demonstrates "your photo, **your
  style**" from the slogan & the poster's step-1.
- Curate the strongest pairs (human faces clearly improved, dramatic scene change). Avoid
  pairs where the before is already decent — pick maximum contrast.
- RTL: mirror the directional sweep of the shimmer/cuts.

### Atmosphere / WebGL
- A living **silk-mirage** surface: flowing champagne-gold waves (from the poster texture) +
  fine grain + soft gold bloom. Suggests "shimmer/intelligence/future" warmly, on-brand,
  never literal neon. Performance-gate on mobile (static gradient + grain fallback).

### Logo moments
- Use the wavy mark + "SARAB" wordmark at the **open** and **close** at high impact; respect
  clear space; never distort. The two strokes can animate in as a drawn mirage line.

### Booking
- `booking-confirmation.png` reveals the confirmed-state design language (fields: الاسم name,
  التاريخ date, المناسبة occasion) — mirror it for the lead form's success state. Collect
  name / date / occasion / contact. (WhatsApp number + form destination still needed — see gaps.)

---

## 6. Gaps & flags for the owner

1. **Palette direction** — assets are *warm champagne/mirage*, not the dark-cyberpunk of the
   reference prompts. Confirm the warm direction; choose espresso-dark vs champagne-light
   dominant at Phase 2. (See §1.)
2. **before EXIF orientation** — all befores are EXIF-rotated portrait (see §3). Must bake
   the rotation in the Phase 6 optimization pass or every non-`<img>` consumer (WebGL,
   canvas, sharp) gets sideways pixels. Both states are matched 2:3 portrait; mirage-reveal
   (§5) is still the recommended centerpiece.
3. **Gallery folder is empty** — `public/assets/gallery/` has no files. If supporting
   atmosphere shots are wanted, the owner should add them; otherwise the 106 afters + reels
   carry the site.
4. **Reel weight** — 6–78 MB each, mixed 9:16 and 16:9. Needs compression + poster frames
   before ship (Phase 6). Two landscape clips need their own framing.
5. **Booking info missing** — need the **WhatsApp number** (for the `wa.me` link) and the
   **lead-form destination** (recommend Formspree/Basin or a tiny serverless emailer).
6. **Watermarks/captions on afters** — many afters carry "@sarab_ai25" + event names (e.g.
   "Angie's Party", "زيانة وربيع"). They're on-brand and fine to show; confirm none are
   private/should be excluded.
7. **Fonts** — wordmark is a wide roman-capital display (Trajan-adjacent). Source a licensed
   display face in that spirit for Latin, plus matched premium Arabic + Hebrew display/body
   pairings at Phase 2 (avoid the slop list).

---

## 7. Asset map (quick reference)

```
public/assets/
  logo/logo.jpg                      2160×2168  ~0.99:1  cream ground, bronze mirage mark + SARAB
  before-after/  (106 pairs)         before 6000×4000 (3:2) · after 2160×3240 (2:3)
  reels/         (10 mp4)            mostly 9:16, two 16:9; 6–78 MB; see §4
  brand/
    sarab_rollup_poster.png          4320×10920 (25.6 MB)  full rollup; silk-gold; 3-step + QR + @sarab_ai25
    poster-clean.png                 916×1717   logo lockup on silk-gold (clean key art)
    final.jpg                        2160×3240  poster variant (portrait)
    final - ...091936.227.jpg        2160×2166  square social variant
    final - ...091951.223.jpg        2160×2166  square social variant
    booking-confirmation.png         1254×1254  "تم تأكيد حجزكم" confirmed-state template
  gallery/                           EMPTY (flag)
```

---

## 8. Build status (so a new session continues, not restarts)

- **Phase 0 ✅** — Vite + React scaffolded; `three` / `gsap` / `lenis` installed; trilingual
  i18n (en / ar / he) with live `dir` switching wired (`src/i18n/`, `LanguageSwitcher`).
  `npm run build` + `npm run dev` verified green.
- **Phase 1 ✅** — this file. Owner sign-off received on direction (below).
- **Phase 2 🟡 (in checkpoint)** — design system LOCKED in code:
  - Palette + motion + spacing → `src/styles/tokens.css` (**Warm Cinematic**: espresso
    "void" beats alternating champagne "light" beats; afters glow against the dark).
  - Type (self-hosted via `@fontsource`, subset-scoped, swaps per `[lang]`) → `src/styles/fonts.js`:
    **Latin** Cinzel + Cormorant Garamond + Hanken Grotesk · **Arabic** Aref Ruqaa + Tajawal ·
    **Hebrew** Frank Ruhl Libre + Assistant.
  - Live styleframe → `src/sections/StyleframePhase2.jsx` + `src/styles/styleframe.css`.
  - Static styleframe stills (for review) → `docs/styleframes/phase2-*.png`.
- **Owner decisions logged:** (1) Art direction = **Warm cinematic (dark + light)**.
  (2) Before/after mechanic = **prototype both** mirage-dissolve & cinematic-cut as motion
  tests at Phase 4, owner picks from the real thing.
  (3) Names: AR tagline = `زاوية تصوير بالذكاء الاصطناعي`, HE = `פינת צילום בינה מלאכותית`,
  EN = `AI Photobooth` (unchanged).
- **Phase 3 ✅** — scroll skeleton built & verified (build + SSR render + live serve all green):
  `Header` · `Hero` · `Promise` (3-step) · `BeforeAfter` (featured pair + swap rail) ·
  `Reels` (autoplay-on-view, poster-framed) · `Booking` (lead form + WhatsApp) · `Footer`.
  Trilingual copy (draft, flagged) in `src/i18n/locales/`; RTL via logical properties.
  Reel posters generated → `public/assets/reels/posters/`. Curated pairs → `src/data/pairs.js`.
  Booking/WhatsApp TODOs centralized in `src/config.js`.
- **Phase 4 ✅** — motion & 3D, verified in a real headless browser (WebGL 2.0, **zero console/
  page errors**, screenshots in `docs/styleframes/phase4-*.png`):
  - **WebGL mirage/silk atmosphere** behind the hero — domain-warped fbm gold shader
    (`src/three/MirageBackground.jsx`), DPR-capped, paused offscreen/hidden.
  - **Before/after mirage dissolve** (`src/three/MirageReveal.jsx`) — heat-haze cross-dissolve
    (auto ping-pong + drag-to-scrub), confirmed cycling dull-before ↔ glowing-after.
  - **Cinematic-cuts** alt mechanic (`src/three/CinematicCuts.jsx`, CSS) + a live **toggle**
    in the proof section so the owner picks. Cuts is also the no-WebGL/reduced-motion fallback.
  - **Lenis** smooth scroll + **GSAP/ScrollTrigger** reveals (`src/lib/useLenis.js`,
    `useReveals.js`) — directional, **RTL-mirrored**, re-run on language change.
  - **Capability gate** (`src/lib/capability.js`) + `prefers-reduced-motion` honored.
  - **Three.js code-split** (lazy) → loads only on capable devices; initial JS ~294 kB,
    three chunk ~461 kB on demand.
  - Curated pairs pre-baked upright + web-sized → `public/assets/before-after/web/`.
- **Phase 4.1 ✅ (cover elevation + fidelity fix)** — owner: not wowed + before/after looked
  dark/low-quality. Fixed:
  - **Color-management bug** — WebGL was writing linear values without sRGB encoding →
    dark/crushed photos. `src/three/setup.js` disables color management (faithful passthrough);
    afters now render bright + true. Curated web images regenerated at q90.
  - **WOW cover** — hero is now a WebGL **"mirage gallery"** (`src/three/HeroScene.jsx`): the
    real after-portraits materialize from the silk backdrop and drift in 3D (gold-rim frames,
    UnrealBloom glow, depth fog, gold dust motes, pointer parallax, scroll dolly). Wordmark sits
    over a legibility scrim (RTL-mirrored). Gallery set → `src/data/gallery.js`.
  - `MirageBackground.jsx` removed (superseded by HeroScene). Verified in headless browser
    (EN + AR), zero errors; shots: `docs/styleframes/phase4-hero*.png`, `phase4-reveal-after.png`.
- **Still open before their phases:** WhatsApp number + lead-form endpoint (`src/config.js`);
  empty `gallery/`; final before/after curation (Phase 5); confirm private event names on afters.
- **Owner working style (important):** high autonomy granted — "you know better, I'll leave it to
  you; keep elevating; don't stop to ask, just proceed." Lead with the real after-portraits;
  static/atmosphere alone does NOT wow them — match the reference-prompt cinematic bar (floating
  3D, bloom, parallax). Always verify visually in a real browser before declaring done (Playwright
  was used then uninstalled; reinstall `-D playwright` + `npx playwright install chromium`,
  launch with `--enable-unsafe-swiftshader`, screenshot, then uninstall).
- **Phase 5.0 ✅ (hero gallery — "many more portraits")** — owner: the mirage gallery had too few
  floating portraits. Done:
  - **42 floating cards across 6 depth rings** (was 10). `LAYOUT` in `HeroScene.jsx` is now
    procedurally generated (`buildLayout`, seeded `mulberry32`): golden-angle angular spread +
    per-card jitter on each elliptical ring, with a center "corridor clear" on the near rings so
    the wordmark stays legible. Per-card drift amplitude/speed/phase vary so the field feels alive,
    not uniform.
  - **34 unique after-portraits** now in `GALLERY_AFTER_IDS` (was 10) — documented-strong/original
    set leads (lands in the near rings); broad spread fills the rest. Deep rings cycle/repeat where
    fog hides reuse.
  - **Perf — dedicated light hero texture set.** New `public/assets/before-after/hero/` at **640×960
    q82** (~3.1 MB for 34, ~90 KB each), referenced via `heroSrc()` in `gallery.js`. Floating cards
    are small behind fog, so this avoids the GPU-memory blowup of the 1080px DOM set (~110 MB vs
    ~335 MB at 34 textures). Loader is **de-duped + concurrency-capped (6)** so the gallery
    *materializes* a few portraits at a time instead of spiking the decoder. Shared geometry +
    shared textures, disposed once. `setup.loadTexture` gained an optional `onError` arg.
  - Verified headless (EN ltr + AR rtl), zero console errors, no failed image loads; shots:
    `docs/styleframes/phase5-hero-en.png`, `phase5-hero-ar.png`. Hero set generation recipe:
    `convert <after> -auto-orient -resize 640x960^ -gravity center -extent 640x960 -strip
    -interlace Plane -quality 82 hero/<file>` (regenerate for any new id added to the gallery).
- **Phase 5.1 ✅ (LIVING gallery + page-wide WOW)** — owner: "the same cards just float, nothing
  changes — make close cards dive deep and get switched" + "elevate the WHOLE page, craziest WOW."
  Done & verified headless (EN ltr + AR rtl, zero JS errors, no horizontal overflow):
  - **Hero is now ALIVE.** `HeroScene.jsx` rewritten from fixed rings → **44 depth "lanes"**
    (`buildLanes`): each card sinks into the deep (per-card `vz`), dissolves into fog at `Z_FAR`,
    then **re-blooms up front carrying the NEXT portrait** in a shuffled cycle (`nextImg`) — so all
    **40 afters** continuously rotate (no on-screen repeat until the whole pool surfaces). Textures
    load once into a `pool[]` (de-duped, concurrency-6); recycle swaps `mat.map` for free. Opacity
    is depth-driven (bloom-in by age, dissolve-out by `smoothstep` near the fog). dt-based, clamped.
  - **Pool 34 → 40** afters in `gallery.js` (added ids 08/41/86/162/204/286), hero set regenerated
    (same recipe as 5.0; ~3.7 MB / 40).
  - **Proof = scroll-driven transformation.** `BeforeAfter.jsx`: a tall (`200vh`) `.proof__track`
    with a **sticky** stage; a ScrollTrigger scrubs the dissolve before→after as you scroll
    (`MirageReveal` gained a `drive` ref; auto ping-pong still resumes when not engaged; drag still
    scrubs). Bigger stage + gold `.proof__halo` + "scroll to transform" cue. Cuts/reduced-motion/no-
    WebGL fall back to the normal un-pinned stage. **Note:** `global.css` body is now
    `overflow-x: clip` (not `hidden`) so sticky works.
  - **Cinematic split headings.** New `SplitText.jsx` + `useReveals` "ignite→settle" cascade
    (gold→color, blur-in, stagger). i18n-safe: **Latin splits per-char, Arabic/Hebrew per-WORD**
    (never shatters cursive joining). `.split-word` is `white-space:nowrap` (wrap by word, not
    letter). Applied to promise/proof/reels/booking titles. promise/reels heads widened to a real
    measure (were `Nch` of the *body* font ≈ 200px → titles overflowed).
  - **Reels coverflow** (`Reels.jsx`): 3D depth-tilt toward viewport center (rAF, gated on view +
    reduced-motion), `● LIVE` pulse badge (new `reels.live` string ×3 langs), hover glare, edge
    mask, drag-to-scroll. Frame moved to inner `.reel__screen` so tilt isn't clipped.
  - **Promise editorial step-rail**: ghost outline numerals, gold connector that **draws on scroll**
    (`[data-steps-line]`), node dots, hover lift.
  - **Booking invitation**: gold-corner `.booking__card`, **magnetic** CTAs (`useMagnetic.js`),
    gold-dust **burst** on successful submit.
  - **Header**: gold **scroll-progress filament** (`scaleX` on scroll, RTL-aware origin).
  - **RTL gotcha fixed:** `.proof__halo` used `inset-inline-start:50%` → flung 880px off-screen in
    RTL (scrollW 2003→1366). Now physical `left:50%`. **Lesson:** translate-centered absolute
    overlays must use *physical* `left`, not logical insets.
  - Shots: `docs/styleframes/page-{en,ar}-{hero,promise,proof-mid,proof-end,reels,book}.png` +
    `…-reels-rail`, `page-en-book-success`.
  - **▶ NEXT to keep elevating:** scroll-driven camera fly-*through* the hero lanes; ambient gold
    dust threading the dark beats (proof/reels/booking) for one continuous world; reel sound-on-tap;
    texture atlas only if the hero pool grows past ~48.
- **Phase 5.2 ✅ VERIFIED IN-BROWSER (EN + AR, headless swiftshader, 2026-06-24)** — all three
  items confirmed; **zero console/page errors, no failed non-`.mp4` requests, scrollW == clientWidth
  (no h-overflow) in both directions.** Verifier kept at `_v52.mjs` (EN+AR; drag-scrubs the proof to
  fixed fracs, wheel-dives the hero, captures the dark beats). Shots: `docs/styleframes/v52-*`.
  1. **Mirage face-distortion fix** (`src/three/MirageReveal.jsx` fragment shader) — ✅ Drag-scrubbed
     the dissolve to fracs 0.32 / 0.50 / 0.72 and zoomed the subject's face (EN + AR). At 0.32 the
     "before" is crisp; at 0.50 the mirage reads as gold-glow + chromatic haze with the **face holding
     its proportions — no twist/squash**; at 0.72 the glowing "after" is crisp. The narrow-seam
     displacement (`disp = vec2(n1,n2)*(0.004*win + 0.015*front)`, `front` softness 0.11) does the job.
     The exact-0.50 frame is intentionally bright (the "mirage flash"); reads as a shimmer in motion.
  2. **Hero scroll fly-through** (`src/three/HeroScene.jsx`) — ✅ Real wheel-scroll to scrollY≈390
     (scrollP≈0.45): the camera leans in (`5 - scrollP*5.0`) and the field accelerates into the deep
     (`flow = 1 + scrollP*2.6`) — reads as a dive into the gallery as the champagne "promise" beat
     rises. No clipping (recycled cards re-bloom at Z_NEAR −3.2…−4.6, always ahead of the camera which
     only reaches z=0), no nausea.
  3. **Ambient gold dust** (`src/components/AmbientDust.jsx` + `.ambient` CSS) — ✅ 3 ambient blocks /
     44 motes total across proof/reels/booking; computed `z-index:0` + `pointer-events:none` vs content
     `z-index:1`, so motes paint above the section bg but **always behind text** (structural, can't sit
     over copy). Subtle (sparse gold specks in the dark margins), EN + AR; hidden under reduced-motion.
  - Note: reel `.mp4` requestfailed in headless are benign (`preload=none` aborts; files exist).
- **Phase 5.3 ✅ (reel sound-on-tap — verified EN + AR, 2026-06-24)** — the documented NEXT item.
  Reels still autoplay muted (autoplay requirement); each now carries a gold **speaker toggle**
  (`.reel__sound`, bottom-inline-end, clear of the top-start LIVE badge). Tapping unmutes that reel
  and **mutes every other** (single audible reel, lifted `soundId` state in `Reels.jsx`); tapping the
  active one again mutes all. SVG speaker-on/off icons; `aria-pressed` + dynamic `aria-label`
  (`reels.unmute`/`reels.mute` added ×3 langs: EN "Tap for sound"/"Mute", AR "اضغط للصوت"/"كتم الصوت",
  HE "הקישו לקול"/"השתקה"). Verified with `_vsound.mjs`: 5 buttons, exclusive unmute, toggle-off →
  all muted, labels flip per state, no console errors, no h-overflow (EN + AR). On/off button shots:
  `docs/styleframes/v52-reel-btn-{on,off}.png`.
  - ▶ **RESUME RECIPE (unchanged):** dev server on :5173. `npm i -D playwright && npx playwright
    install chromium`; headless launch with `--enable-unsafe-swiftshader`; run `_v52.mjs` (+ `_vsound.mjs`
    for reels) for an EN + AR pass; then `npm uninstall playwright`.
- **Phase 5.4 ✅ (proof picker co-located — owner UX fix, verified EN + AR, 2026-06-24)** — owner:
  in the scroll-driven proof, the thumbnail picker rendered *after* the 200vh sticky track, so it
  sat a full screen-plus below the pinned stage — you had to scroll down to pick, then back up to
  see it open. Fixed: in the pinned (`scrollDrive`) layout the rail now lives **inside `.proof__sticky`**
  next to the stage as a **lightbox** (`.proof__lightbox` flex row: vertical thumb strip + stage; the
  rail is RTL-mirrored to the inline-start side). The pinned stage is now sized by viewport **height**
  (`width: min(80vw, 460px, calc(72svh * 2 / 3))`, height from `aspect-ratio:2/3`) so stage **and** rail
  always fit one screen with the 2:3 intact; ≤720px stacks (stage on top, horizontal rail below,
  `54svh`). The rail markup is shared via a `rail` const; the normal-flow (cuts / reduced-motion /
  no-WebGL) layout still renders it once at the bottom (`{!scrollDrive && rail}`). Verified `_vproof.mjs`:
  stage 413×619 + rail both fully in-view together, picking a thumb swaps the pair with the stage still
  on screen, aspect OK, no h-overflow, zero errors (EN + AR); reduced-motion path = no sticky, single
  rail, stage present. Shots: `docs/styleframes/v53-proof-{en,ar}{,-picked}.png`.
- **Phase 5.5 ✅ (owner copy pass #1 — verified render EN/AR/HE, 2026-06-24)** — owner-directed edits
  to the draft copy (still flagged for final sign-off, esp. Levantine AR):
  - `promise.line1` "The first AI photobooth **in the region**" → "**…of its kind** in the region"
    (owner: the hero's "first of its kind" framing is more accurate; folded that into the headline in
    all 3 langs — EN "of its kind", AR "من نوعها", HE "מסוגה", matching the hero eyebrow).
  - `proof.caption` gained a 4th punchline beat: EN "…No waiting. **No problem.**" / AR "…بدون انتظار.
    **ولا مشكلة.**" / HE "…בלי המתנה. **בלי בעיות.**".
  - `promise.steps[0].d` → EN "Pick the style **that you like**." (AR already "اللي بيعجبك" — unchanged;
    HE → "שאתם אוהבים"). `steps[1].d` → EN "**Take your picture at the booth.**" (AR already "التقط صورتك
    في الكشك" — unchanged; HE → "מצטלמים בתא").
  - Verified rendered text + no h-overflow, zero errors (EN/AR/HE). Shots: `docs/styleframes/v55b-*`.
- **Phase 5.6 ✅ (pre-ship hardening — verified, 2026-06-25)** — from the full-page audit:
  - **WhatsApp wired.** `src/config.js` `whatsappNumber = '972544997768'` (owner local 054-499-7768).
    Booking CTA + header now deep-link `https://wa.me/972544997768?text=<localized>` (verified EN+AR).
    ⚠️ `formEndpoint` STILL EMPTY → the lead form runs in demo mode (no network submit) until an
    endpoint (Formspree/Basin/serverless) is provided. **This is the last booking blocker.**
  - **Deploy weight cut 1.2 GB → 413 MB.** The 212 raw 6000×4000 before/after originals were copied
    into `dist/` by Vite (everything in `public/` ships). Moved them OUT of `public/` to repo-root
    **`media-originals/before-after/`** (kept the referenced `public/assets/before-after/web/` + `hero/`).
    Originals are still on disk for the Phase 6 responsive pass, just not deployed. (Remaining 413 MB
    is mostly the 5 reels @ 36–78 MB — the next perf item; re-encode in Phase 6.)
  - **Social/SEO.** `index.html` head rewritten: fresh description (new voice), full **Open Graph +
    Twitter** tags, `og:locale` en + alt ar/he. New **`public/og-image.jpg`** (1200×630, 77 KB) =
    branded silk-gold lockup cropped from `brand/final.jpg`. **Favicons** (`favicon-16/32.png`,
    `apple-touch-icon.png`) replace the 2 MB jpg favicon. og:image path is relative — make it absolute
    once the production domain is known (noted in an HTML comment).
  - **Date input styled.** `.field__input[type=date]` now `color-scheme:dark` + gold accent + gold
    picker icon (was a raw black-on-dark default); verified on-theme EN + AR. (Native control still uses
    OS-locale date order — a custom picker for forced DD/MM is a later option, not done.)
- **File currency note:** historical refs above to `StyleframePhase2.jsx`/`styleframe.css`
  (removed in Phase 3) and `MirageBackground.jsx` (removed in 4.1) are superseded. Current 3D
  lives in `src/three/{HeroScene,MirageReveal,CinematicCuts,setup}.js`. Verify a file exists
  before relying on these notes.
- **New asset — booth-setup still (added post-Phase-4):** owner-supplied
  `media-originals/booth-setup/20260520_214731.jpg` (Samsung, 4000×2252, EXIF `RightTop` →
  displays portrait, 2.8 MB). Auto-oriented + resized to `public/assets/reels/booth-setup.jpg`
  (**788×1400 ≈ 9:16, 163 KB, q82, stripped**). Content: the kiosk in a warm venue — softbox
  lights, the live capture screen, a gold stanchion, the **print display board** on an easel,
  three guests in gowns posing. On-brand (gold + warm neutrals). Added to the **reels rail** as a
  still `type:'image'` card (no sound/autoplay/LIVE badge; same 9:16 frame + glare); alt string
  `reels.boothAlt` ×3 langs. It literally shows "the prints, the board, the reactions" from the
  new reels copy.
- **Then:** Phase 5 — finalize copy in all 3 languages (esp. Levantine Arabic) with the owner,
  curate the strongest before/after pairs, polish type/timing. Then Phase 6 (perf/responsive/ship:
  bake-rotate + responsive-size all media, re-encode reels, lazy budgets, deploy).
