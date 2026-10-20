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

### Campaign: SARAB-Prospecting-Arabic-Central-9.2026 — `120250547562060256` (ACTIVE, live since 2026-08-27 ~11:15 local)
Ad set `120250547563820256` ₪100/d, CONVERSATIONS→WhatsApp, Highest volume, age 18–65
(owner's draft widened 22→18), Advantage audience ON (geo only). **Published geo = 20 city
keys** (owner's draft replaced the API pins): Wadi Ara — Umm el Fahm, `Ara, `Ar`ara, Baqa
al-Gharbiyye, Jatt, Kafr Qara, Barta`a, Musmus, Mu'awiya, Zalafa; Triangle — Tayibe, Tira,
Qalansuwa, Kafr Qasim, Kafr Bara, Jaljulya, Yamma; Central — Lod, Ramla, Jaffa. Excluded:
PS, Jerusalem, Ashdod, Rahat. **Zero overlap with the North ad set** (verified against its
targeting — the North had no Wadi Ara town), so the whole audience is genuinely new.
Placements = all (Advantage+), fb+ig, mobile+desktop.

| As of 2026-09-04 (9 days, day 9 partial) | Campaign | reel1-CT `…720340256` | WOW-CT `…704800256` |
|---|---|---|---|
| Spend | ₪936 | ₪257 (28%) | ₪679 (72%) |
| Conversations / CPR | 25 / ₪37.46 | 7 / ₪36.78 | 18 / ₪37.72 |
| CTR · CPM · link clicks | 1.44% · ₪33.73 · 157 | 1.76% · ₪31.74 · 60 | 1.31% · ₪34.55 · 97 |
| Link click → conversation | 15.9% | 11.7% | 18.6% |
| Video p100 / impressions | — | 3.1% (North reel1: 5.2%) | 7.7% (North WOW: 10.8%) |
| Reach / frequency | 11,935 / 2.33 | 4,914 / 1.65 | 10,238 / 1.92 |
| D1 rows (lead_source) | 21 | 8 (0 booked, 3 quotes ₪7,900, 5 inq.) | 13 (**3 booked**, 2 quotes, 8 inq.) |

Same-age comparison (first 9 days): North reel1 ₪4.42 CPR / CTR 2.79% / CPM ₪21.85;
North WOW ₪23.42 / 2.80% / ₪26.06. Central is 1.6× WOW-North's launch and ~8× reel1-North's.
Region split of spend: Haifa district (Wadi Ara) 64% · Central district 35% · Tel Aviv 2%.
Placement: IG stories 38% (CPR ₪39.5, 80% of all link clicks), IG reels 29% (₪30.3),
**IG feed 20% (₪93, CTR 0.71%, CPM ₪44 — worst, as in the North where IG feed was ₪37)**,
FB feed 9% (₪21.2, CTR 2.74% — best; the North gave FB feed 31% of spend, Central only 9%).
Age/gender: women 88% of spend; 18–24 = 25% of spend at CPR ₪34 (average, not a leak).

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

- **2026-08-30 — Central welcome-message investigation (FINAL, owner proven right)**:
  Central-ad WhatsApp chats show NO welcome message while old-ad chats DO. Wrong turns
  first, for the record: an initial "it's invisible by design" answer, then a
  "coexistence (Jul 23) stopped materialization" theory built on D1 rates (96% of
  pre-Jul-23 ad leads had an auto thread-start entry vs 2% after — the `type='errors'`
  131051 rows in synced history). Owner refuted it with dated screenshots that MATCH D1
  rows to the minute: old **reel1-North** chat 2026-08-26 (number redacted, pre-fill 05:07Z,
  owner replies 05:32/05:33Z) and old **WOW-North** chat 2026-08-23 (number redacted,
  pre-fill 09:36Z) — both with a materialized per-ad "Automated greeting" bubble (reel1 =
  generic thanks; WOW = details-ask), both post-coexistence. **Conclusion: old-ad
  welcomes still materialize today; the 96%→2% delta was a measurement artifact —
  materialized welcomes NEVER echo through the Cloud-API webhook, so live D1 is blind to
  them (pre-Jul-23 ones were visible only via the one-time phone history sync).**
  So the real difference IS old ads vs the new Central ads (owner's original claim):
  same number, but old ads (built in Ads Manager Jun 7 / Jul 22, templates set at
  creation, pre-API-registration) materialize a real both-sides "Automated greeting",
  while the Central ads (built via Marketing API Aug 25–26, template added in Ads
  Manager afterwards, post-API-registration) only render the welcome as an ephemeral
  client-side preview (owner's own ad-click test shows it displaying + the "secure
  service from Meta" chat banner, which old-ad chats don't have — they show the
  data-sharing notice instead). API comparison of all 4 creatives shows no readable
  difference (VIDEO, WHATSAPP_MESSAGE CTA, page-post-backed); welcome templates are
  API-unreadable, so the binding difference lives on Meta's side. Leading suspects:
  (a) template created while the number is Business-Platform-registered → welcome
  handled the API way (preview-only, business expected to reply via API); (b) some
  property of the API-built creative (e.g. the forced `link_url api.whatsapp.com/send`).
  **Proposed tests (owner to approve; nothing changed)**: (1) duplicate an old North ad
  as-is into the Central ad set — if the duplicate materializes, run Central on
  duplicated old ads (test caption-edit survival separately, since edits mint a new
  creative); (2) hand-rebuild one Central ad fully in Ads Manager exactly like June —
  if that materializes, the API build path is the culprit and future ads get built by
  hand. (3) Regardless: the webhook auto-reply (real message, both sides, per-ad text,
  100% delivery) remains the robust fix — owner parked it ("not now, maybe later").
  Funnel note: the materialized details-ask is plausibly part of WOW-North's superior
  10.7% close rate; Central leads currently get no in-thread ask, which matches their
  observed "pre-fill then silence" behavior.

- **2026-09-04 — Central campaign, first analysis (verdict: KEEP, don't touch; re-check
  2026-09-11)**. Numbers in the Central table above. Findings:
  1. **Already profitable.** ₪936 → 3 booked events = **₪312 per booking** (North: ₪228
     reel1 / ₪322 WOW): SARAB-129 wedding 2026-11-26 al-Eizariya ₪3,500 (deposit),
     SARAB-130 henna Lod **held 2026-09-02, ₪2,800, completed**, SARAB-134 bride's night
     2027-05-05 (deposit, price not entered). All three from WOW-CT. Plus 5 open quotes
     (₪11,400 priced; the ₪3,500 Jerusalem quote for 2026-08-30 is dead — date passed).
     Booked value ≥ ₪6,300 on ₪936 spend after 9 days; one event already delivered.
  2. **Close rate on par with the North**: 3/21 = 14% booked, 5/21 quoted, 9 days old.
     WA-era North (Jul 23–Aug 26): WOW 15/122 = 12.3%, reel1 11/80 = 13.8%.
  3. **Lead cost is the weak spot and it got worse mid-run.** Daily conversations
     3·6·5·5 | 3·1·1·1·0(partial). Aug 27–30: ₪523 / 19 convos = **₪27.5**; Aug 31–Sep 3:
     ₪395 / 6 = **₪65.8** (Sep 1–3 alone: ₪91). D1 referral leads agree: 14 then 6.
     Link clicks did NOT fall (85 → 65) — click→message fell 22% → 9%.
  4. **Cause candidate #1 — the owner's Aug 31 edits (activity log, Ads Manager/Power
     Editor, 11:32–11:54 local): each ad's creative was replaced TWICE** (reel1
     `1044037901674473` → `1943978949622338` → `28140226355662265`; WOW `1453494526621191`
     → `935098449651755` → `1608870200910495`), each swap re-entered review and minted a
     NEW page post + IG media (copy/title/CTA identical; video asset re-uploaded). Creative
     changes are "significant edits" → the ad set (which had ~19 results, never out of
     learning) restarted learning, and every post's social proof reset to zero. The slump
     starts on that exact day. (The Aug 27 publish had already minted new creatives vs the
     ids recorded on Aug 26 — Ads-Manager saves always do.) **Ad ids unchanged → `wa_ad_map`
     still valid (verified: referral source_id on all 19 WA leads = the two ad ids).**
     Cause #2 (contributing): normal launch-honeymoon decay (North fell 4× from week 1
     to week 2). Cause #3 (structural): Central CPM ₪34 vs North launch ₪22–26, CTR half
     (IG-heavy delivery: FB feed only 9% of spend vs 31% in the North).
  5. **"Pre-fill then silence" (Aug 30 funnel note) is NOT supported by the data**: 19/19
     Central WA leads sent ≥2 messages (13 sent ≥3), 19/19 got an owner reply (avg 7 in /
     9.5 out per lead); WA-era North leads: 77% sent ≥2, 98% replied (avg 6.5 / 10.3).
     The missing materialized welcome has no measurable effect on engagement so far.
  6. Meta favours WOW-CT (72% of spend) and that's justified: WOW-CT keeps attention
     (p100 7.7% vs reel1-CT 3.1%), converts clicks 1.6× better, and owns all 3 bookings.
     reel1 is the creative that doesn't travel — it's the one to swap first, not WOW.
  7. Jerusalem demand leak: 3 of 21 leads (one deposit + two ₪3,500 quotes) are
     Jerusalem-area despite the exclusion (clients reached via "recent location" or living
     in a targeted town). Opportunity for a later test, not an action now.
  8. Spend pacing ₪78–145/day against a ₪100 budget = Meta's weekly pacing, normal.
  **Rule agreed for 2026-09-11 check (no edits until then):** 7-day CPR (Sep 4–10) ≤ ₪40 →
  keep as is; > ₪50 with no new booking since Sep 3 → pause and rebuild. Rebuild options,
  in order: exclude IG feed (₪93 CPR, 20% of spend) · split Wadi Ara vs Triangle+Central
  into two ad sets (64/36 spend today, unreadable per-town) · replace reel1-CT with a
  fresh reel. Even at the post-edit ₪66/convo the campaign books at ≈ ₪470/event against
  ₪2,800–3,500 tickets — still profitable, so "stop" is not on the table this week.

- **2026-10-16 — Central FINAL + the 10.2026 draft (opinion only; nothing in the account
  changed)**. Central ran Aug 27 → Sep 9 (owner paused; last spend week Sep 4–10 = ₪544 /
  14 convos / ₪38.8). Lifetime ₪1,461 · 39 convos · CPR ₪37.47 · CTR 1.53% · CPM ₪33.3 ·
  reach 16.7k / freq 2.6. Per ad: reel1-CT ₪507 / 9 / ₪56.4 (final week ₪130) · WOW-CT
  ₪954 / 30 / ₪31.8 (final week ₪23.5). D1: 32 Central leads (10 reel1 / 22 WOW); **1 held
  event** (SARAB-130 henna Lod ₪2,800, WOW); the two early-Sep deposits (SARAB-129, SARAB-134)
  are back at استفسار today; 7 quotes still open ≈ ₪16,000, mostly 2027 dates. Verdict: not a
  success (≈ break-even cash). Lesson confirmed: reel1 does not travel to a cold region; the WOW
  reel carried Central. Nothing has delivered in the account since Sep 9 (last 6 weeks of leads:
  17 organic WhatsApp, 1 referral, 11 late Central).
  **Owner's plan found as an Ads-Manager draft**: `SARAB-Prospecting-Arabic-10.2026`, draft
  campaign id `120251437954700256`, source = duplicate of the North campaign
  `120247006268370256`, start 2026-10-14, draft `budget_strategy` = CAMPAIGN_BUDGET (original
  was ABO ₪100/d on the ad set — verify before publishing). The API does NOT expose a draft's
  ad sets/ads, so the added cities and any caption change are unverifiable from here. Plan =
  reel1 only + a few cities + maybe a new caption.
  **Opinion delivered** (`docs/ads-opinion-2026-10-16-reel1-rerun.html`): run it — reel1 at
  home is still the best booking engine (₪16.9/convo, 32 live bookings) — but as a safe
  restart, not growth: audience rested 7 weeks, not new (72.7k reached, freq 3.8, CPR climbed
  ₪33→₪41→₪55 in Aug). Add a 2nd reel in the SAME ad set (best: new reel on reel1's formula
  with fresh faces from the 14 October events; fallback: rested WOW). Caption = smallest lever
  (~2/3 delivery is Stories/Reels); change only to add "2027 dates are booking" (D1: 1/3 of
  bookings made 180+ days ahead; 22 events already on the 2027 calendar; Dec–Feb = 0 events).
  Pre-publish: only ONE ad set on (the duplicate copied all 3 ad sets), ₪100/d ad-set budget,
  re-set welcome/prefilled + IG identity, map the new ad ids in `wa_ad_map` + add a
  `meta_campaign` option on day 1, never edit live (lesson 9). Expect CPR ₪20–35 then rising;
  must beat Central's ₪37.5. Rule: 7-day CPR > ₪45 two weeks running, or no deposit by day
  21 → add a new reel as a NEW ad, pause the loser. Judge at week 3 by quotes/deposits (October
  leads = 2027 planners). Five Arabic caption options in the HTML (A "2027 dates" recommended;
  B = June hook verbatim + 2027 last line). Cities booked to date: Nazareth 12, Shefa-Amr 7,
  Sakhnin 5, I'billin 4, Lod 4, Kafr Yasif 3, Iksal 3, Nof HaGalil 3 → keep Lod/Ramla in;
  Jerusalem leak = separate later test.

- **2026-10-18 — media decision for the 10.2026 rerun (opinion; nothing in the account
  changed)**. Owner dropped two files in `ad-reels/` (now gitignored, heavy owner media):
  `H_ad_v04.mp4` = the NEW reel (20 s, 2160×3840 9:16, 30 fps, h264/aac; before→after montage
  of one wedding, Farid & Natalie 16.08.2026 — ~10 pairs: couple raw at the curtain → cherry-
  blossom after-portrait at ~1 s, tablet reveal 2–3.5 s, groups / families / kids / older
  couples, ends on the garden after-portrait; no on-screen text; audio −7.8 LUFS integrated,
  peaks +0.7 dBFS = clipping). **Already in the Media Library** as video `2333476437407790`
  (owner upload 2026-10-18 12:51Z, status ready). `Screen_Recording_20261018_132112_Instagram.mp4`
  = an Instagram screen recording of reel1 (11.8 s of the 17.4 s reel, 1080×2316 with the IG
  UI and counters, 120 fps) — NOT an ad asset; reel1 is already in the account (library video
  `1055218867300275`, 17.38 s; plus the June ad's own post inside the duplicate). Draft campaign
  `120251437954700256` still EDITING / VALIDATED (last touched 10-14 14:00Z, CAMPAIGN_BUDGET);
  account activity since 10-10 = one Meta-system auto audience (10-16). Custom-audience listing
  and D1 phone counts were blocked by the session safety classifier → list sizes below come from
  this doc's own numbers.
  **Advice: BOTH reels in ONE ad set.** (1) reel1 = the duplicated June ad left untouched (same
  post → 247 reactions / 106 saves kept; no caption edit). (2) new reel = a new ad built from
  library video `2333476437407790`, caption A from the 10-16 HTML ("2027 dates"), its own
  pre-filled message. Reel1 is not exhausted as a creative — close rate held while messages fell
  (audience fatigue at freq 3.8 / 72.7k reached); 7 weeks' rest recovers part of it; the new reel
  is the fresh-faces fix, and Meta moves spend to the cheaper ad within days. Before building the
  new-reel ad (re-export + re-upload is free while it is not in an ad): 3–5-word Arabic hook on
  frames 0–2.5 s, top third (as done on WOW); audio to ≈ −14 LUFS / −1 dBTP; confirm the track is
  licensed for ads (else pick music inside Ads Manager); couple's consent for ad use. Build the
  ads BY HAND in Ads Manager (June ads materialize the WhatsApp welcome bubble; the API-built
  Central ads did not — 08-30 investigation). Upgrades vs June: Advantage+ audience with a
  **customer-list custom audience of every WhatsApp lead number (~700–800: 649 North + 39 Central
  + 8 Hebrew conversations + organic)** as the audience *suggestion* — not a lookalike on its own
  (seed too small to be precise), not a hard filter; per-reel `meta_campaign` sources +
  `wa_ad_map` rows on day 1 (`North-10.2026-reel1` / `North-10.2026-new-reel`); Advantage+
  creative enhancements that alter the video OFF; keep Advantage+ placements, revisit IG feed at
  day 14 only if its CPR is > 2× the rest; ₪100/d on the one ad set, no raise before day 14;
  plan the next reel (bride's night, reel1 formula, October footage) for week 5–6 as a NEW ad.
  Optional phase 2 (from week 2): warm ad set ₪20–25/d = lead list + IG engagers 365d + 50%
  viewers, new reel + 2027 caption (open quotes ≈ ₪160k pipeline). Not recommended: bulk
  WhatsApp to the list (Communications Law §30A consent; number quality rating). Privacy note:
  uploading hashed numbers to Meta is a secondary use of quote-request data under the Privacy
  Protection Law — owner's call; the privacy notice should mention marketing use.

- **2026-10-19 — Q&A recap for the 10.2026 rerun (no account change)**. Owner asked how to
  keep reel1's reactions on the duplicate, whether both reels may share one opening WhatsApp
  message, and what is optimized vs June. On record: (a) Reactions live on the June ad's page
  post, not on the campaign. A duplicate keeps them only if "Show existing reactions, comments
  and shares on new ads" was ticked in the Duplicate dialog (Meta help article 209669919072999)
  AND the duplicated ad is never edited afterwards (text, headline, video, thumbnail, CTA,
  identity) — any creative save mints a new post (lesson 9). Verify in the draft: open the reel1
  ad → the preview must show the existing reactions/comments; if it shows zero engagement, delete
  that draft ad and re-duplicate only the June reel1 ad into the new ad set with the box ticked.
  The message template (welcome + prefilled) is copied with the duplicate — check it, don't
  re-save unless missing. Help-article caveat: engagement carries over only once if the ad had
  placement-customized creative. (b) Welcome (greeting): same text on both ads is fine and
  preferred (Central did this). Prefilled (customer's first message): primary attribution is
  `wa_ad_map` by ad id (19/19 verified in Central), so a shared prefill is not wrong — it only
  drops the backup signal. Recommendation: leave reel1's June prefill untouched (editing it = a
  creative edit) and give the new reel's ad a prefill that differs by at least one word. Both ads
  get NEW ad ids → two new `wa_ad_map` rows + two `meta_campaign` options on day 1. (c) The
  "optimized vs June" list = the 2026-10-18 upgrades above (lead-list as A+ audience suggestion,
  both reels in one ad set, caption A on the new reel only, A+ creative video enhancements OFF,
  ONE ad set at ₪100/d ABO — verify the draft's CAMPAIGN_BUDGET, no raise before day 14, IG-feed
  check at day 14, per-reel attribution on day 1, never edit live, judge at week 3 by
  quotes/deposits, swap rule = 7-day CPR > ₪45 two weeks running or no deposit by day 21, next
  reel planned for week 5–6 as a new ad, optional warm ad set from week 2).
  **Follow-up (same day)**: owner says they already changed the welcome/prefilled messages on
  the draft reel1 ad. Advice: do NOT rebuild everything — reactions sit on the post, and the
  message template is a creative-level field (API: `page_welcome_message`), so an existing-post
  duplicate should keep its post through that edit; the preview is the test. If the preview shows
  no engagement, re-duplicate only the one reel1 ad (2 min), set the messages again, re-check; if
  the messages cost the post, keep the June messages + reactions (they produced 32 bookings).
  Reactions do not change reach (budget ÷ CPM); they nudge trust/CTR a little, mostly in Reels
  and feed, not Stories. Lead list explained to the owner (what a customer-list audience is,
  suggestion vs warm retargeting, ~½–⅔ match rate, the list is LEADS not bookers, privacy call,
  CSV upload from D1 — no manual typing; zero-upload alternatives = IG/FB engagers 365d + 50%
  video viewers).
  **Follow-up 2 (same day)**: (1) Draft ad set shows A+ audience with suggestions age 22–45,
  all genders, interests Wedding reception / Wedding planning / Event management / Engagement /
  Weddings / Photography (= June). reel1-North lifetime by age (API, 2026-10-19): 18–24 ₪950 /
  62 convos / ₪15.3 · 25–34 ₪3,305 / 208 / ₪15.9 · 35–44 ₪1,380 / 75 / ₪18.4 · 45–54 ₪1,498 /
  68 / ₪22.0 · 55–64 ₪561 / 31 / ₪18.1 · 65+ ₪166 / 22 / ₪7.5; female ₪5,856 / 352 / ₪16.6,
  male ₪1,963 / 111 / ₪17.7. A+ already spent 28% outside the 22–45 hint at near-equal cost →
  advice: leave age + interests exactly as June; the only targeting upgrade worth making is the
  lead list as an extra suggestion. (2) 700–800 numbers is NOT a verified count — it is the sum
  of Meta conversation counts (a person can start several); unique numbers in D1 are probably
  lower. Owner to run the DISTINCT-phone count on `wa_messages` (direction in; with/without
  referral) with the `!` prefix. (3) Owner's test: a clean duplicate with the engagement box
  ticked still shows no reactions in the draft preview → the preview is not the test. Plan:
  keep the 10.2026 draft (owner's messages), discard the test duplicate, publish with the ad
  set OFF, then compare the new ad's effective post id with the June creative `1897719270888300`
  via the API before switching on. (4) Four on-video hook options for the new reel added to
  `docs/ads-opinion-2026-10-16-reel1-rerun.html` (section "New reel: the on-video hook");
  H1 "Your guests, before and after" recommended; frames 0–2.5 s, top third below the top 10%.
  **Follow-up 3 (same day) — lead-list size verified + budget screen**: owner ran the DISTINCT
  phone count on `wa_messages` (direction in): **658 unique numbers in all, 316 with an ad
  referral** (the earlier 700–800 was a sum of conversation counts — superseded). Advice: upload
  ALL 658 as ONE customer-list custom audience (the A+ suggestion), not the 316 — after phone-only
  matching (~½–⅔) 658 ≈ 330–440 matched people vs ≈ 160–210 for the 316; the 342 non-ad numbers
  are organic WhatsApp inquiries (same customer, warmer), and the 316 sit inside the 658 anyway.
  Clean first: 658 = every number that ever wrote in (suppliers, halls, the owner's own tests) →
  keep only numbers linked to a bookings row (`booking_id` set, or last-9-digit match on
  `bookings.phone`); if that drops only a handful, upload the linked set, else all 658. Export =
  wrangler `--json` + jq to a `phone,country` CSV outside the repo (digits with 972 code, country
  IL), owner-run, never pasted into a session; name the audience with the date, refresh monthly.
  Budget screen verified from screenshot: **Ad set budget (ABO)** selected, Advantage+ campaign
  budget off, "share up to 20% with other ad sets" unchecked — correct; keep sharing off even when
  the optional warm ad set is added (week 2) so the ₪100 / ₪20–25 split stays explicit. Still to
  verify in the draft: only ONE ad set on, its daily budget = ₪100.
  **Follow-up 4 (same day) — WhatsApp number audit, run by Claude with the owner's explicit
  permission (count-only queries on prod D1; nothing changed)**. 658 unique inbound numbers =
  **316 ad-referred** + 129 non-ad with an office record + 36 two-way organic chats without a record
  + **177 not real inquiries** (118 history-sync `errors` rows with no readable message, 48 live
  `unsupported`-type first messages — stickers/reactions; the webhook deliberately creates no lead
  for them — 11 single unanswered texts, 1 media placeholder). linked_n 383 = numbers with a
  bookings row (358 via `booking_id` + 25 by last-9-digit phone match); best status per number:
  استفسار 193 · عرض سعر 112 · مكتمل 28 · مؤكد 26 · ملغي 24. The 275 without a row: 62 are
  June–July ad leads from before the office integration (history sync never auto-creates — real
  leads the office never received; addable via أضف كاستفسار, optional), 36 two-way chats, 177
  noise. First contact by month: Jun 183 · Jul 187 · Aug 248 · Sep 25 · Oct 12.
  **Legitimate lead list = 481** (rule: ad referral OR bookings row OR an outbound reply exists =
  658 − 177). Exported to `~/sarab-leads-2026-10-19.csv` (`phone,country`; 972-digit numbers + IL;
  outside the repo; numbers never displayed in the session) — ready for Ads Manager → Audiences →
  Create → Customer list; expected match ≈ 240–320 people. Tooling: remote D1 reads work with
  `CLOUDFLARE_API_TOKEN` from `~/.secrets/sarab-cf-token` and `--command` (`--file` goes through the
  import path and returns only stats).
  **Follow-up 5 (same day) — completing the office record (owner: "yes")**: the 62 pre-office ad
  leads (history-synced chats Jun 7 → Jul 23 2026 with a CTWA referral and no bookings row; dry run:
  40 from reel1-North ad `120247040596070256`, 7 → `reel-wow-reaction` via wa_ad_map, 13 from other
  June/July ads + 2 referrals without an id → base `إعلان ممول (Meta)`) get added exactly like the
  أضف كاستفسار button: استفسار, source whatsapp, local 05 phone, added_at = first message date,
  extra `wa.referral` + `from_history` + marker `batch = 2026-10-19-history-leads` (finds or reverts
  the batch precisely). Backup first: `ops/db-backups/2026-10-19-pre-history-leads/` (bookings 431
  rows / max id 436; 2,861 wa_messages links). The write was blocked by the session's auto-mode
  classifier ("Modify Shared Resources") → SQL saved to `ops/sql/2026-10-19-history-leads.sql`
  (gitignored) for the owner to apply; expected after: bookings 493, 62 batch rows, numbers with a
  record 383 → 445, rows id ≤ 436 identical to the backup — Claude verifies read-only afterwards.
  Privacy page (`public/privacy.html`) already names marketing use and sharing with ad platforms
  "such as Meta" for measurement and campaign optimization; a customer-list upload is best covered
  by one explicit clause (drafted in chat for sign-off, not deployed).

- **2026-10-20 — 10.2026 North rerun PUBLISHED by the owner (Ads Manager, ad set ON at
  11:20Z, ads in review; API-verified right after)**. Morning prep: the lead CSV
  (`~/sarab-leads-2026-10-19.csv`, 481 numbers) uploaded as customer-list custom audience
  `120251530096010256` "sarab-leads-2026-10-19.csv", placed under "Suggest an audience" only
  (advice: no engager/viewer/lookalike audiences in the prospecting ad set — they are the
  saturated North crowd; keep them for the optional warm ad set). Ads Manager then showed
  "Estimated audience size: Below 1,000" — expected, the estimator ignores A+ expansion and
  counts the matched list as if it were a hard filter. Copy decisions in the draft: reel1 back
  to the single June caption (the owner had added captions A + D as text options — removed;
  headline + description were already June verbatim per creative `1897719270888300`); new
  reel = caption D primary + caption A second option, June caption dropped as a third;
  welcome identical on both ads (fine), prefill shared (owner kept it; wa_ad_map by ad id is
  the primary attribution). A "headline must be specified for a whatsapp destination" red
  validator stuck on the new-reel ad through every fix (stale form state) — it published
  anyway. A+ creative enhancements (video touch-ups, relevant comments, video effects) and
  A+ voice translation turned OFF on both ads before publishing.
  **Published structure (API)**: campaign `120251437954700256` ACTIVE, OUTCOME_LEADS, no
  campaign budget (ABO). ONE ad set `120251437954780256` "SARAB-Arabic-Cold-Weddings+Events":
  ₪100/day, Highest volume, CONVERSATIONS → WHATSAPP, `is_dynamic_creative` false, A+
  audience (`advantage_audience` 1, `targeting_optimization` expansion_all,
  `targeting_relaxation_types.custom_audience` 1 → the list is a suggestion, not a filter;
  Meta auto-built a hidden 1% lookalike `120251532753170256` from it), age hint 22–45, June
  interests (Wedding reception / planning / Event management / Engagement / Weddings /
  Photography), 52 North + Haifa-district cities plus the Judeida-Makr 2-mile pin, LB / PS /
  Hebron excluded, mobile only, FB + IG Advantage+ placements. Ads (both created 11:20:43Z):
  `reel1-Angie's friends` `120251437954710256` → creative `1091406733702029` (June
  body/title/description verbatim, WHATSAPP_MESSAGE) and `reel-farid-natalie`
  `120251504642110256` → creative `39205352215777962` (body = caption D, title "memory in
  every guest's hand", description D; extra text options are not exposed by the API).
  **Reel1 did NOT keep the June post**: new video `1096177183145289`, post
  `1203813356142408_1096177183145289` vs June `1203813356142408_4162392803891516` → the 247
  reactions / 106 saves start from 0 (the accepted small loss; no re-duplicate — the owner's
  clean-duplicate test lost it too, so the edits were not the cause). New reel post
  `1203813356142408_122145409113357171`, IG media `18220166833344215`.
  **Attribution wiring APPLIED (same day, ~14:30 local, with the owner's explicit permission:
  "you have permission to run the commands and set the office correctly… we should not lose
  any of our data")**: `ops/sql/2026-10-20-north-rerun-wiring.sql` (guarded INSERTs, office-API
  shape) → meta_campaign `North-10.2026-reel1` + `North-10.2026-farid-natalie` (the owner's
  name for the new reel's source; options ids 52–53, pos 4–5), wa_ad_map
  `120251437954710256|North-10.2026-reel1` + `120251504642110256|North-10.2026-farid-natalie`
  (ids 54–55); options 51 → 55, the 51 old rows identical to the backup. **History leads
  APPLIED too** (`ops/sql/2026-10-19-history-leads.sql`; dry-run count re-checked = 62 first):
  bookings 431 → 493 (ids 438–499, all استفسار / source whatsapp; lead_source 7
  `reel-wow-reaction` + 55 base `إعلان ممول (Meta)`), 695 wa_messages links NULL → new rows and
  nothing else changed (phones, existing links, all 431 old bookings rows identical, none
  missing; the day's own office activity, one row added and one removed, max id 436 → 437, is
  from the owner, not the batch). 61 of the 62 have no display name — history-synced chats
  carry no profile name, exactly what the office button produces for them; fill from the chat
  when a lead matters. Backups: `ops/db-backups/2026-10-20-pre-north-wiring/` (options,
  bookings, wa_links) + the post-state in `ops/db-backups/2026-10-20-post-north-wiring/`.
  Tooling: with the owner's permission stated in the message, wrangler `--file` prod writes
  went through this time (not classifier-blocked).
  **Watch plan**: no budget raise before day 14; IG-feed CPR check at day 14; judge at week 3
  by quotes/deposits, not conversations; swap rule = 7-day CPR > ₪45 two weeks running or no
  deposit by day 21; next reel (bride's night, reel1 formula) week 5–6 as a NEW ad; optional
  warm ad set ₪20–25/d from week 2 (lead list + IG engagers 365d + 50% viewers); never edit
  the live ads (lesson 9).

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
9. **Never edit a live ad in Ads Manager "just to fix a detail"**: every save mints a new
   creative AND a new post (likes/views reset), re-enters review, and restarts the ad set's
   learning phase. Central lost its week-2 momentum to two such saves on 2026-08-31. Batch
   fixes into the next planned creative swap instead.
