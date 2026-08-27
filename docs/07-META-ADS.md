# 07 — META ADS (campaign tracking record)

> Persistent record of the SARAB Meta ads account: structure, results, decisions.
> Update this file whenever campaigns/ad sets change or a new analysis is run.
> Booking attribution lives in D1 (`bookings.lead_source` + `options.kind='meta_campaign'`
> + the office CAPI tab). Ad-side numbers come from the meta-ads MCP.

**Account**: `Sarab Studio - Main`, ad_account_id `820806894234001`, currency ILS,
business `Sarab Studio` (`1204099529447124`).

**Dashboard attribution rule**: base lead_source `إعلان ممول (Meta)` = any Meta ad NOT
mapped to a named campaign (in practice ≈ reel1-North, which was 97% of unmapped spend)
**+ website leads auto-attributed from utm/fbclid**. Named campaign sources (options
kind `meta_campaign`): `reel-wow-reaction` (North WOW ad set), `Central-reel1` and
`Central-wow` (the two ads of the Central campaign — per-reel on purpose, so the
booking-level A/B is readable; campaign total = sum of the two). New ads MUST be mapped
in the office WhatsApp tab (`wa_ad_map`) + added as a `meta_campaign` option, or their
bookings fall into the base source. With every currently active ad mapped, any NEW
booking landing in the base source is an unmapped-ad alarm (or a website fbclid lead).

## Structure & lifetime results (as of 2026-08-25)

### Campaign: SARAB-Prospecting-Arabic-6.2026 — `120247006268370256` (ACTIVE)
Objective OUTCOME_LEADS, all ad sets optimize CONVERSATIONS (click-to-WhatsApp).
Started 2026-06-07. Lifetime: spend ₪13,567 · 649 conversations · CPR ₪20.90 ·
CTR 2.70% · CPM ₪28.51 · reach 96,669 · freq 4.92.

| Ad set | ID | Status | Budget | Ran | Spend | Convos | CPR | Reach / Freq | Bookings (D1) |
|---|---|---|---|---|---|---|---|---|---|
| SARAB-Arabic-Cold-Weddings+Events ("reel1 ad set") | `120247006268340256` | **PAUSED 2026-08-27 by owner** | ₪100/d | Jun 7 → Aug 27 | ₪7,966 | 492 | ₪16.19 | 72,888 / 3.84 | **35** booked (22 مؤكد + 12 مكتمل + 1 عربون), 13 canceled |
| SARAB-WOW-Arabic-Cold-Weddings+Events | `120249723423340256` | **PAUSED 2026-08-25 by owner** | ₪150/d | Jul 22 → Aug 25 | ₪5,145 | 149 | ₪34.53 | 59,440 / 3.02 | **16** booked (14+1+1), 8 canceled |
| SARAB-Arabic-Cold…- Copy (reel-details-matter test) | `120248966792910256` | PAUSED | ₪50/d | Jun 28 → ~Jul 11 | ₪456 | 8 | ₪57.00 | — | — |

Main ads: `reel1-Angie's friends` `120247040596070256` (in Cold; ₪7,703, 463 convos,
CPR ₪16.64, CTR 2.71%) · `reel-wow-reaction` `120249723423360256` (sole WOW ad).

Targeting (both main ad sets, near-identical): 43–53 **Northern** Arab cities
(Nazareth, Sakhnin, Tamra, Shfar'am, Acre, Haifa, Maghar, Arraba, Kafr Kanna, …),
age 22–65, all genders, interests = Wedding reception / Wedding planning / Event
management / Engagement / Weddings / Photography, Advantage audience ON.

### Campaign: SARAB-Prospecting-Hebrew-7.2026 — `120249471745760256` (PAUSED)
Jul 11 → ~Jul 25. Spend ₪490 · 8 convos · CPR ₪61.29 · CTR 1.53% · CPM ₪45.53.
16 Hebrew Northern cities, same interests, ad = reel1. Underperformed badly —
parked; revisit only with Hebrew-native creative.

### Campaign: SARAB-Remarketing-Arabic-6.2026 — `120247015589290256` (PAUSED)
Ad set SARAB-Arabic-Views&Lookalike (IG/FB engagers 365d + 50% viewers 180d).
Spend ₪97 · 2 convos. Barely tested.

### Notable ad-level signal
`reel3-Wadea zyane` (`120247017198050256`, paused Jun): ₪158 spend, **22 convos,
CPR ₪7.18, CTR 6.23%** — tiny sample but by far the best CPR ever seen in the
account. Undertested; candidate for revival.

## Weekly CPR (₪/conversation) — fatigue evidence

| Week | Cold (reel1) | WOW |
|---|---|---|
| Jun 07–13 | 3.59 (launch) | — |
| Jun 14–20 | 15.53 | — |
| Jun 21–27 | 21.87 | — |
| Jun 28–Jul 04 | 24.75 | — |
| Jul 05–11 | 25.01 | — |
| Jul 12–18 | 24.14 | — |
| Jul 19–25 | 28.12 | 16.14 (from Jul 22) |
| Jul 26–Aug 01 | 16.66 | 31.81 |
| Aug 02–08 | 18.41 | 26.24 |
| Aug 09–15 | 33.33 | 47.71 |
| Aug 16–22 | 41.18 | 74.95 |
| Aug 23–25 (3d) | 55.21 | 49.61 |

Same-window head-to-head (Jul 19–Aug 25): reel1 CPR ₪25.53 vs WOW ₪34.53 —
reel1 wins even in the overlap window, not just on the cheap-June average.

## Economics (spend ↔ D1 bookings, 2026-08-25)

| | reel1 ad set | WOW ad set |
|---|---|---|
| Cost per conversation | ₪16.19 | ₪34.53 |
| Conversation → booking | 7.1% (35/492) | 10.7% (16/149) |
| **Cost per booked event** | **₪228** | **₪322** |
| Booked value | ₪64,900 | ₪32,150 |
| Booked-value ROAS | 8.1× | 6.2× |
| Collected so far | ₪27,400 | ₪5,250 |
| Open pipeline (quotes) | 47 worth ₪84,000 | 35 worth ₪63,700 |
| Open inquiries | 46 | 65 |

Avg booked event ≈ ₪1,854 (reel1) / ₪2,009 (WOW). WOW leads close better but cost
2.1× more each; reel1 wins per booked shekel. WOW pipeline is younger — its final
totals will improve somewhat as quotes convert.

## Decisions log

- **2026-08-25 owner**: WOW ad set paused (CPR had hit ₪75/week). Justified by data.
- **2026-08-25 analysis** (this session): recommended stopping/cutting reel1 ad set —
  North audience saturated (reach 73k, lifetime freq 3.8, CPR 2.4× lifetime avg over
  the last 17 days); creative NOT tired, audience is. Reuse reel1 in new geo.
- **Planned next (owner intent)**: new campaign targeting **Central + Triangle** Arab
  cities (NOT North), objective Sales (analysis recommends phased: launch with the
  proven conversations optimization, wire automated CAPI events, then test Sales —
  offline CSV upload + ~5 bookings/week is too weak a signal for Sales optimization
  today). New campaign (not new ad set) is correct: objective is campaign-level and
  geo split deserves its own budget/reporting.
- Report artifact: see memory `meta-ads-tracking` for link.
- **2026-08-25 owner decision**: reel3-Wadea EXCLUDED from the new campaign ("not a
  good reel, the numbers don't show the full picture" — ₪158 test, no traceable
  bookings). Do not re-pitch it. New campaign = reel1 + WOW only (or reel1 solo).
- **2026-08-25 two-vs-one ads advice (on record)**: budget is ad-set-level — ₪100/d
  buys the same ~3,400 impr/day with 1 or 2 ads; reach is NOT halved by a second ad.
  Meta auto-concentrates ~80–90% of spend on the cheaper ad. Two ads recommended in a
  NEW region (creative×audience unproven; week-1 A/B answer ≈ free; slower per-creative
  frequency burn; warm backup for the ~6–8-wk decay). If one only: **reel1** (₪228 vs
  ₪322 per booking, wins same-window CPR, 11-wk lifespan vs 5) — hold WOW as the
  planned refresh when new-region CPR > ~₪35 for 2 weeks.

- **2026-08-25 launch kit written** (owner adopted the two-reels strategy): full build
  sheet + final Arabic copy for `SARAB-Prospecting-Arabic-Central-9.2026` (one ad set
  ₪100/d, 13 Triangle + 3 Central cities, ads `reel1-Angies-friends-CT` +
  `reel-wow-reaction-CT`). Copy grounded in the live creatives: reel1's proven primary
  text (creative `1897719270888300`, "ليش العرسان عم يختارو زاوية سراب…") and WOW's
  (creative `1054192647296631`, "ردة الفعل هاي؟…"). Decisions: (a) welcome message
  standardized on the WOW "send us details" principle (asks date/city/occasion —
  backed by WOW's 10.7% vs reel1's 7.1% close rate; owner independently preferred it);
  (b) per-reel pre-filled messages as attribution backup; (c) WOW on-video hook: YES
  but reworded — owner's draft "ليش غيرنا فكرة زاوية التصوير؟" rejected as
  company-centric; recommended "شو اللي خلّاها تقول WOW؟ 👀" (alt: "هاي مش زاوية
  التصوير اللي بتعرفوها"), frame 1→~3s, top third, 4–6 words; (d) descriptions added
  (both current ads leave the field empty). Meta API can't read existing
  welcome/pre-filled texts — section 04 of the kit is the new standard, not a copy of
  the old. Kit artifact: https://claude.ai/code/artifact/ae3371b9-c62d-44df-a2a4-55209ecd1d0f
  — awaiting owner copy sign-off; offer stands to build it PAUSED via the MCP.

- **2026-08-25 BUILT (PAUSED) via MCP — Central campaign**: campaign
  `SARAB-Prospecting-Arabic-Central-9.2026` id `120250547562060256` (OUTCOME_LEADS,
  auction, ABO) → ad set `SARAB-Arabic-Cold-Central+Triangle-Weddings+Events` id
  `120250547563820256` (₪100/d, CONVERSATIONS→WHATSAPP, billing impressions,
  age 22–65 as A+A suggestions, the North's 6 interest IDs, platforms fb+ig) → ad
  `reel1-Angies-friends-CT` id `120250547570390256` (inline creative, video
  `4162392803891516` = the North winner's asset, new copy with product-first
  "first in the country / now booking in Center+Triangle" line — geo-"first" was
  dropped because the North campaign already booked events in Tayibe/Tira/Lod/Kafr
  Qasim/Jaffa). **Geo = custom_locations lat/lng pins (3–5 km × 16 towns)** because
  the MCP has no Targeting Search (city keys unavailable) — functionally equivalent.
  Creation-only; nothing existing touched. **Owner publishes manually.** Pre-publish
  manual steps (API can't do them): welcome+prefilled in Message template, IG
  identity attach (ads_get_ig_accounts not rolled out for this account), music check
  on preview (video asset may lack the IG-picker song; fallback = existing-post ad),
  optional cover swap (thumbnail is the 160px auto one). WOW ad PENDING: owner
  re-edits video with hook "شو اللي خلّاها تقول WOW؟" + licensed song (Shakira track
  = ad-review risk; decided to replace, prefer energetic Arabic, keep spoken WOW
  audible). reel3-Wadea video creation error 1443226 taught: video_data REQUIRES
  image_url/image_hash thumbnail (the fbcdn thumb URL works as-is; stripping stp
  → 403).

- **2026-08-26 BUILT (PAUSED) — WOW ad added + captions flipped customer-first**: owner
  re-edited the WOW reel (hook "شو اللي خلّاها تقول WOW؟" on frame 1→~3s, new track, ends
  on the studio after-portrait; verified frame-by-frame) and uploaded it via Ads Manager
  **Media Library** as `wow-reel-updated.mp4` → video `27352305501110955` (9.43s, 4K;
  original kept at `media-originals/wow-reel.mp4`). Ad `reel-wow-reaction-CT` id
  `120250555704800256` created PAUSED in ad set `120250547563820256`, creative
  `2019003708983499` (kit copy verbatim — already customer-led). API gotcha: setting a
  description (link_description) on video_data requires a CTA link → `link_url
  https://api.whatsapp.com/send` (standard CTWA destination). **Owner decision: captions
  must be about the customer/guests, not SARAB** → reel1-CT primary text reordered
  (couples question first; "first in the country + now booking in Center&Triangle"
  demoted to line 3 as proof). Creatives are immutable and the MCP has NO ad-delete →
  new ad `reel1-Angies-friends-CT` id `120250555720340256` (creative `1381215590145889`),
  old ad `120250547570390256` renamed `OLD-DELETE-ME-…` — **owner must delete it in Ads
  Manager before publishing** (else 3 ads split the budget). `wa_ad_map` must use the NEW
  ids (…720340256 reel1, …704800256 WOW). Owner's city-list edit sits in an unpublished
  Ads Manager draft — the API still shows the original 16 pins (and age 18–65), drafts
  are invisible to the API; targeting deliberately untouched. Nothing activated. Both
  ads preview-verified. AI-disclosure flag still unset (creative-creation-time only).
  **Upload-path rule (owner, 2026-08-26): never host SARAB media on third-party services
  or tunnels — the owner uploads to Meta's Media Library manually, then we pick it up
  via `ads_get_ad_videos` (title filter, newest first).**

- **2026-08-26 (later) — owner completed the manual Ads-Manager steps**: old ad deleted
  (API-verified: ad set holds exactly the 2 new ads, both PAUSED); message templates set
  on BOTH ads. Owner's final texts differ slightly from the kit standard (their edit,
  accepted): welcome = "أهلاً فيكم بسراب 🤍 زاوية تصوير بالذكاء الاصطناعي. / حتى نبعتلكم
  السعر وكل التفاصيل، ابعتولنا: 📅 تاريخ المناسبة 📍 المدينة 🎉 نوع المناسبة وبنرد
  عليكم فوراً!" (dropped the "first in the country" claim + "أو القاعة") — same on both
  ads. Pre-filled: reel1 = "مرحبا 👋 بدي تفاصيل وأسعار زاوية سراب لمناسبتي"; WOW =
  "مرحبا 👋 شفت الإعلان وبدي تفاصيل وأسعار زاوية سراب" (owner wrote "الإعلان" not
  "إعلان الـ WOW" — the two messages are still mutually distinct, so per-reel backup
  attribution works). Remaining before publish: IG identity on both ads, music check on
  both previews, optional covers, CAPI-tab campaign + wa_ad_map wiring (new ids), the
  optional AI-disclosure decision, then publish (which also applies the owner's
  city-list draft).

- **2026-08-27 — reel1-North paused by owner** (messages had dried up; last-week CPR was
  ₪55). API-verified: every ad set in the account is now PAUSED — nothing delivers until
  the Central campaign is published. The North campaign row stays in the table for the
  record; label question answered (keep `إعلان ممول (Meta)` as-is — see decisions above
  and the attribution-rule note at the top).

- **2026-08-27 — Central dashboard wiring DONE (pre-launch)**: `meta_campaign` options
  `Central-reel1` + `Central-wow` and `wa_ad_map` rows `120250555720340256|Central-reel1`
  + `120250555704800256|Central-wow` inserted into prod D1 (guarded INSERTs, same shape
  the office API writes; backup `ops/db-backups/2026-08-27-pre-central-wiring/`,
  options 47 → 51 rows, verified). Two per-reel sources (not one campaign source) so
  reel1-vs-WOW is answerable at the BOOKING level — the North showed conversation CPR
  alone misleads (close rates 7.1% vs 10.7%). Campaign total = sum of both rows in the
  CAPI tab. No deploy needed: this is D1 data the dashboard reads live; zero code
  changed. Owner's remaining pre-publish queue: IG identity on both ads, music check,
  optional covers, optional AI-disclosure, then publish (applies the city-list draft).

1. Launch week is anomalously cheap (₪3.59 CPR) — never judge a creative on week 1.
2. Creative×audience lifespan here ≈ 6–8 weeks before CPR doubles. Plan a fresh reel
   every ~6 weeks per audience.
3. ₪150/day into a small audience (WOW) burned out faster than ₪100/day (reel1).
4. North Arab towns are saturated for now; geography is the next growth lever.
5. Always: add campaign to office `meta_campaign` options + map ad IDs (`wa_ad_map`)
   on day 1, or attribution collapses into the base source.
6. Hebrew audience needs Hebrew-native creative, not a reused Arabic reel.
7. Finalize copy BEFORE building: creatives are immutable and the MCP can't delete ads,
   so a caption change = new creative + new ad + new ad ID (+ re-doing message template
   and wa_ad_map). Ads-Manager edits live in unpublished drafts the API cannot see.
8. Caption standard (owner rule): about the customer and their guests, not SARAB.
   Open with the customer question/emotion; at most one proof line ("first in the
   country"), never as the opener. The caption answers a video hook in guest terms —
   no curiosity gaps in paid CTWA ads.
