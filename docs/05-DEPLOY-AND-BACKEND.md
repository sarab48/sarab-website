# 05 — Deploy & Backend

The website is built. This document covers wiring the booking form to a backend, building
a private admin dashboard for bookings, and deploying — all on Cloudflare, on the same
account as `sarabaibooth.com`.

> **Scope & safety.** Work only inside this website project. SARAB's **live photobooth app
> is a separate project and is out of scope — never open or modify it** (see the safety
> boundaries in `CLAUDE.md`). This doc is the *only* source you need for how the domain
> works; you do not need — and must not use — access to the live app's files to deploy.
> When touching Cloudflare DNS, **only add the new site's hostname; never edit or delete any
> existing record**, and confirm with the owner first.

## How the domain is used today (do not disturb)

`sarabaibooth.com` is already on Cloudflare. Its subdomains are in **production**:

- `edit.sarabaibooth.com` — delivers result images to guests at events via QR-code scan.
- Other subdomains — digital galleries sent to customers after events.
- The domain may also route email.

All of the above must keep working untouched. Adding this website is **purely additive** —
it only creates records for this site's own hostname and changes nothing else.

## Architecture (everything on Cloudflare)

- **Hosting** — Cloudflare Pages. Vite + React SPA. Build command `npm run build`, output
  directory `dist`. Auto-deploys on every push to the connected GitHub repo.
- **Form backend** — a Cloudflare Pages Function (file under `/functions`, e.g.
  `/functions/api/book`). On submit it does two things:
  1. Writes the booking to the database (Cloudflare D1).
  2. Emails the owner a notification.
- **Database** — Cloudflare D1 (SQL, on the same platform). Stores every booking.
- **Admin dashboard** — a private route with a custom UI that reads bookings from D1
  (filter by date, mark confirmed/paid, search by name, etc.). Not a spreadsheet.
- **Access control** — Cloudflare Access (Zero Trust) gates the dashboard route so only the
  owner's email can open it. No password logic in the code. Free for up to 50 users.

## Email — Cloudflare Email Service (decided)

The owner wants a notification **to himself only** ("someone is interested, reply fast") —
no customer-facing email. Use **Cloudflare Email Service**: sending to the owner's own
verified destination address is free on all plans, with no third-party account or API key,
all on Cloudflare. Set up the owner's address as a verified destination, and have the
Function send the booking notification there on each submit.

(If the owner ever wants to email the *customer* too — e.g. an auto-confirmation — that
would need the Workers Paid plan, or switch that piece to Resend. Not needed now.)

## Existing booking data — migrate, preserving everything

The owner will provide his current booking file. It is **one workbook with several sheets
and real data already in it**. This data is important.

- **Preserve every row. Do not lose or overwrite any existing data.**
- **Back up the original before migrating** (keep an untouched copy of the workbook and an
  export of what gets loaded).
- Read all sheets, map them into the D1 schema, and import. Confirm the columns/sheets with
  the owner before importing.
- **Where to put the file:** in a dedicated folder at the project root such as `migration/`
  — **never** inside `public/` (that would publish private customer data on the live site)
  and never committed to the repo. Add it to `.gitignore` so it can't be pushed to GitHub.
  After a verified import into D1, the file no longer needs to live in the project; keep the
  owner's own backup copy outside the project.

## Domain — serve on the apex (decided), safely

The owner wants the marketing site on the **root domain itself**, `sarabaibooth.com` (plus
`www`), **not** a subdomain — and without affecting anything already running.

This is safe because the apex is a **separate DNS record** from the production subdomains.
Attaching the site touches only the apex/`www` records; `edit.sarabaibooth.com`, the gallery
subdomains, and email are untouched.

- Attach `sarabaibooth.com` (and `www.sarabaibooth.com`) as **custom domains on the Pages
  project**. This creates/updates only those records — the scoped, safe way to do it.
- **Precondition:** confirm the apex is currently free (not already serving something). If
  something is on it, stop and ask the owner before changing it.
- **Never** edit or delete `edit.`, gallery, or email records. List all DNS records before
  and after, and confirm the production ones are unchanged.
- **Admin dashboard:** to avoid adding to the subdomain space, serve it as a **protected path
  on the same site** (e.g. `sarabaibooth.com/office`) behind Cloudflare Access. A dedicated
  `admin.` subdomain is also fine (still additive/safe) if cleaner — recommend one to the owner.

## Cost / free-tier ceilings (stays free at this scale)

- Cloudflare Pages: unlimited bandwidth, 500 builds/month, one concurrent build.
- Workers / Functions: 100,000 requests/day.
- D1: 5 GB storage, 5M rows read/day, 100K rows written/day.
- Cloudflare Access: free up to 50 users.

A booking site is nowhere near these limits; paid ($5/mo Workers Paid) only becomes relevant
at very high daily volume. **One caveat:** Cloudflare's terms discourage serving large video
files over the CDN (512 MB per-file cache limit). Keep the reels short and compressed; if
video grows heavy, move it to Cloudflare Stream or R2 rather than serving big files from Pages.

## Build order (careful, step by step — check in with the owner at each stage)

1. Set up D1 and the form → Function (write to D1 + email the owner via Cloudflare Email
   Service). Test one real submission reaches the inbox and lands in D1.
2. Confirm the WhatsApp button uses the owner's real number in the `wa.me` link.
3. Back up, then import the owner's existing bookings (all sheets → D1), preserving every
   row. Verify the data after import.
4. Build the private admin dashboard and put it behind Cloudflare Access.
5. Create the Pages project, connect the GitHub repo, deploy. **Before** attaching the
   domain, list the existing DNS records. Attach `sarabaibooth.com` + `www` as custom
   domains on the Pages project. Afterward, verify `edit.` / gallery / email records are
   unchanged.

## Credentials & permissions

Deploying via Wrangler needs a **Cloudflare API token**. Important:

- Create a **brand-new token dedicated to this project** — do **not** reuse, read, or copy
  the live photobooth app's token or credentials. A separate token keeps this project's
  blast radius isolated from the live app. (Reusing the old one is *more* dangerous, not
  less.) Store it as a local secret, never in the repo.
- The owner is new to this. **Claude Code should tell the owner the exact minimal set of
  permissions the token needs** (based on the operations it will run — Pages, D1, Workers,
  and DNS:Edit scoped to the single zone `sarabaibooth.com`), then **walk the owner
  click-by-click** through creating it in the Cloudflare dashboard (My Profile → API Tokens →
  Create Token). This is the one step only the owner can do; it takes a couple of minutes.
- **Listing the DNS records is Claude Code's job, not the owner's** — with the token, Claude
  Code lists them via the API (a safe read) before and after attaching the domain, and
  confirms the production records (`edit.`, galleries, email) are unchanged.
- Because a zone DNS-edit token can touch every record in the zone, treat DNS as the
  sensitive step: use the Pages custom-domain flow (scoped to the one hostname) and the
  "only add, never edit/delete" rule. If any action would modify an existing record, stop
  and ask the owner.

## What the owner needs to provide

- The email address to receive booking notifications (verified as a Cloudflare destination).
- WhatsApp number for the button.
- Confirmation that the apex `sarabaibooth.com` is free to use for the site.
- His current booking workbook (multiple sheets, with data) for migration.
- A scoped Cloudflare API token (for Wrangler deployment).

## Progress log (sessions append here)

### 2026-07-03 — Step 1 ✅ (booking backend) + reels slimdown
- **D1** `sarab-bookings` (EEUR, id `1557e480-9c59-4264-a363-183580c00156`), schema in
  `db/schema.sql` — form fields + `status`/`source` + an `extra` JSON catch-all so the
  Step-3 workbook import can be lossless.
- **Function** `functions/api/book.js`: validation + length caps + honeypot (`company`)
  → D1 insert → Email Service REST notify (best-effort: a mail failure never loses a
  booking already saved).
- **Form wired**: `src/config.js` → `formEndpoint: '/api/book'`; UI error state added with
  a trilingual `booking.form.error` string (⚠ draft copy — owner sign-off pending).
- **Email**: destination `sarabtech8@gmail.com` verified; owner ran the Email **Routing**
  onboarding (adds apex MX ×3 + SPF TXT + DKIM TXT — **additive only**; all 10 pre-existing
  records verified byte-identical via the `ops/dns-snapshots/` diff). That state suffices
  for REST sends to verified destinations from `bookings@sarabaibooth.com`. Full chain
  verified live: POST → D1 → `emailed:true` → `delivered:[sarabtech8@gmail.com]`.
  (Without any onboarding the REST send returns 500 `email.sending.error.internal_server`.)
- **Preview deploy** (throwaway; no DNS, no GitHub): `sarab-preview.pages.dev` via
  `wrangler pages deploy dist` (direct upload; bindings from `wrangler.toml` — its `name`
  must change when the real Step-5 project exists, then delete `sarab-preview`).
  Secret `EMAIL_API_TOKEN` set via `wrangler pages secret put`.
- **Reels (owner directive)**: ship only the 3 current videos, re-encoded **muted** (audio
  stripped): printed-1 6.6 MB · printed-2 4.0 MB · lv_0_20260522135817 9.4 MB — all under
  Pages' 25 MiB/file limit. Sound toggle removed (JSX + CSS + i18n keys). The 7 unused
  videos + pre-encode sources are preserved in `media-originals/` (gitignored). dist
  weight: 413 MB → 62 MB.
- **Tokens** (owner's `~/.secrets/`, outside the repo): `sarab-cf-token` (Pages/D1 edit,
  DNS **read-only**), `sarab-email-token` (Email Sending only; lives as the Pages secret).
- **Cleanup owed before the Step-3 import**: delete D1 test rows ids 1–3 (`TEST - *` /
  email tests).

### 2026-07-03 — Step 2 ✅ (WhatsApp) · Step 3 ✅ (workbook migration)
- **WhatsApp confirmed by owner**: `972544997768` (already wired in `src/config.js`).
- **Workbook** `migration/SARAB_Bookings.xlsx` (12 sheets, Arabic) backed up first
  (`migration/backup/…backup-2026-07-03.xlsx`, sha256-verified) + all sheets exported to
  CSV (`migration/backup/sheets-csv/`). Workbook anatomy: master sheet **الحجوزات** +
  operational sheets (أسعار المدن، الأرباح والمصاريف، مصاريف عامة، المخزون، القوائم) +
  6 formula-derived views (dashboard/confirmed/finished/search/CAPI/callback) that the
  Step-4 dashboard recreates live.
- **Schema v2** (`db/schema.sql`): `bookings` widened to the real business fields
  (booking_no SARAB-NNN, first/last name, city/region/venue, times, price/deposit/
  remaining, payment_status, lead_source, interest, callback, notes, status in the
  **owner's Arabic vocabulary** — site leads default to `استفسار`); new tables
  `city_prices`, `event_finances`, `general_expenses`, `inventory`, `options`
  (vocabularies from القوائم), `import_archive` (every non-empty raw row of all 12
  sheets — lossless regardless of mapping). Old v1 table dropped (removed the 3 test
  rows); form function now writes `venue` (was `location`).
- **Import** via D1 HTTP API with bound params (`migration/import_to_d1.py`, gitignored):
  bookings **56** · city_prices **37** · event_finances **6** · general_expenses **5**
  (an earlier "6" count had included the header row) · inventory **4** · options **38** ·
  archive **327**. **Verified: 56/56 bookings × 29 fields — 0 mismatches**; status
  distribution matches the workbook exactly (عرض سعر 23، مؤكد 17، مكتمل 6، ملغي 6،
  استفسار 2، دفع العربون 2). Live form probe on v2 (`emailed:true`, venue mapped,
  status استفسار) then deleted — final count exactly 56.
- **Next (Step 4)**: admin dashboard at a protected path (`/office`) reading D1, behind
  Cloudflare Access (owner email only; one-time-PIN login). Data endpoints must also
  validate the Access JWT themselves — never deploy them unprotected, the data is real.

### 2026-07-03 — Step 4 ✅ (private dashboard behind Cloudflare Access)
- **Zero Trust team already existed** (`sarabtech.cloudflareaccess.com` — presumably from
  the live app's tunnels), so no onboarding was needed. Owner added token permission
  `Access: Apps and Policies → Edit`; org/IdP endpoints remain outside the token's reach.
- **Access app** "SARAB Office (preview)" (id `4613ab44-db54-4ce7-96b1-ae900d9b82b8`,
  aud `c15f0846…9ff8`) walls `sarab-preview.pages.dev/office`; policy allows only
  `sarabtech8@gmail.com`; 24 h sessions. Existing Access apps at creation time: none.
  **Re-scope at Step 5** (add `sarabaibooth.com/office` app or update domain) and update
  `ACCESS_AUD`/`ACCESS_TEAM_DOMAIN` in `wrangler.toml` `[vars]`.
- **Defense in depth**: `functions/office/_middleware.js` verifies the Access JWT
  (signature vs team certs, aud, iss, exp) on every `/office` request including static
  assets; `.dev.vars` `ACCESS_DEV_BYPASS=1` works on localhost only.
- **API** (`functions/office/api/`): `meta` (options/cities/KPIs/months/email),
  `bookings` GET filtered list + POST create (auto-continues `SARAB-NNN` numbering,
  `source='office'`), `bookings/[id]` GET/PATCH (whitelisted fields; **no DELETE** —
  cancellation is the `ملغي` status, history is never erased).
- **UI** `public/office/index.html` — self-contained Arabic RTL page, SARAB dark-gold
  theme: KPI cards (مواعيد قادمة، استفسارات، عروض سعر، مبالغ متبقية), tabs الحجوزات /
  إعادة الاتصال / أسعار المدن, live search + status chips + month/upcoming filters,
  row → edit drawer (all fields, auto `remaining = price − deposit` until manually
  overridden), new-booking drawer, tap-to-WhatsApp everywhere, `noindex`.
- **Verified**: local CRUD green; production `/office` + `/office/api/*` 302 → Access
  login (no data ever served anonymously); tokenless/forged-JWT/hashed-deployment-URL
  requests all 403. Public site + booking form unaffected. Owner login test pending
  (one-time PIN to the allowed email). If the login page offers no email option:
  Zero Trust → Settings → Authentication → Login methods → add **One-time PIN**.
### 2026-07-03 — Step 4.1 ✅ (owner requests: price tiers + booking intel)
- **Price tiers** (owner's design, distance/region-based): new tables `price_tiers` +
  `cities` (migration `db/migrations/2026-07-03-pricing.sql`, idempotent) — seeded from
  the imported `city_prices` (kept untouched): 7 tiers auto-detected from the 7 distinct
  prices, 37 cities mapped, verified. Changing a tier's price re-prices all its cities.
- **أسعار المدن tab** is now a manager: tiers sorted price-ASC with editable name/price,
  add/delete tier (delete only when empty), cities list with a tier `select` to move a
  city, add/delete city. All through `functions/office/api/pricing.js` (GET/POST/PATCH/
  DELETE, `{type:'tier'|'city'}`).
- **Booking intel** (`shared/intel.js`, used by both the public form and the office):
  `dateConflicts` (bookings on the same event_date with مؤكد/دفع العربون/مكتمل) +
  `cityMatch` (free-text location → normalized city → tier price; containment match only
  for names ≥3 chars). Surfaced in three places:
  1. the owner's **notification email** (— فحص تلقائي — block: ⚠ date taken by whom / ✅
     available + 💰 suggested price);
  2. the booking's `extra.auto` JSON (permanent record of what was known at submit);
  3. the **drawer intel strip** (`/office/api/intel`, live re-check on date/city edits)
     with one-tap **اعتماد السعر** (fills price, recalcs remaining) and **رد جاهز عبر
     واتساب** — a pre-filled reply in the lead's own site language (ar/he/en templates in
     `REPLY`, ⚠ draft copy pending owner sign-off).
- **Verified**: local curls (pricing CRUD, intel, form-with-intel) + headless browser
  (`_vintel.mjs`: pricing tab renders, intel strip shows conflict + price, اعتماد السعر
  fills 1800, reply button present, zero console errors; shots `voffice-pricing.png`,
  `voffice-intel.png`). Live demo lead #59 (date 2026-07-18 + الناصرة) stored
  `extra.auto` = conflict SARAB-030 + 1800 ₪ and emailed the enriched notification.
  **Gotcha logged:** a POST fired seconds after `wrangler pages deploy` hit the previous
  function version (propagation) — wait ~20 s before end-to-end tests. Demo row #59 to
  delete before Step 5.
### 2026-07-03 — Step 4.2 ✅ (owner requests: full workbook surface + pro polish)
- **المالية tab**: finance KPIs (revenue over مؤكد/دفع العربون/مكتمل, collected deposits,
  total expenses, approximate net) + the two imported tables now fully editable:
  per-event الأرباح والمصاريف (expand-row editor; `total_expenses`/`net_profit`
  recomputed server-side — the workbook's own formula: net = price − Σcosts) and
  مصاريف عامة (with the imported expense-category vocabulary as a datalist).
  API `functions/office/api/finance.js` (GET/POST/PATCH/DELETE, `{table:'event'|'general'}`).
- **المخزون tab**: items editable via the same expand-row editor; `qty_left` and
  `state` (منخفض when ≤ alert_at) computed server-side. `functions/office/api/inventory.js`.
- **Date-conflict red flags**: `/office/api/bookings` returns `conflict_dates` (dates
  with 2+ non-ملغي bookings); the table paints those date cells red with ⚠ on every
  affected row. (In prod today: 2026-07-18 = SARAB-030 + demo lead #59.)
- **Booking delete** (owner's explicit request, overriding the earlier no-delete
  stance): DELETE `/office/api/bookings/:id` + a confirm-guarded حذف button in the
  drawer footer. Recommended habit stays "mark ملغي"; delete is for junk/test rows.
- **CSV export** of the current filter (BOM'd UTF-8 → Excel-safe Arabic) + the count
  line now shows Σ remaining for the visible rows.
- **Smartphone layout**: ≤720px the bookings table becomes labeled cards
  (`td::before = attr(data-l)`), tab bar scrolls, drawer is full-width. Desktop keeps
  the dense table.
- **Verified** (`_venhance.mjs`, headless desktop + 390×844 mobile): conflict flags ×2
  on both form factors, card layout active (thead hidden), finance/general/inventory
  rows render + editor expands, drawer delete visible, zero console errors. Shots:
  `venh-finance/inventory/mobile/mobile-drawer.png`. API round-trips all green
  (totals recompute, low-stock flip, delete→404).
### 2026-07-03 — Step 4.3 ✅ (analytics · Meta attribution & CAPI · privacy+נגישות · dynamic filters)
- **Analytics, self-hosted in D1** (`events` table; no cookies, no IPs, per-tab session id,
  Do-Not-Track honored): `src/lib/analytics.js` beacon → `POST /api/hit` (always 204) logs
  view / scroll-depth 25-100 / wa taps / form submits / visible-time, with edge geo
  (request.cf country+city), referrer host, utm_*, fbclid, device, lang. **الزوار tab**
  (`/office/api/stats?days=7|30|90`): KPI cards + daily/sources/countries/scroll-funnel/
  lang/device bars + "Meta leads" counter. Live-verified (geo captured).
- **Meta attribution (owner-critical)**: the site captures `utm_*`+`fbclid` per visit
  (sessionStorage); the booking POST attaches them; `functions/api/book.js` auto-sets
  `lead_source` in the owner's vocabulary (fbclid/utm→`إعلان ممول (Meta)`, referrer→
  انستغرام/فيسبوك/واتساب), stores raw attribution in `extra.attribution`, and the email
  gained a `Source:` line with the campaign. **ميتا CAPI tab**: qualifying bookings
  (مؤكد/عربون/مكتمل) with intl phones + "من ميتا؟" badge + CSV in the workbook's exact
  Meta Events-Manager format (order_id…data_processing_options).
- **Privacy & نگישות**: `public/privacy.html` (trilingual, ⚠ draft template — owner
  review; linked from footer ×3 langs) + `A11yWidget.jsx` floating button: text size,
  high contrast (`html.a11y-contrast` var overrides), stop-motion (localStorage flag read
  by `capability.prefersReducedMotion()`, applied via reload), statement link.
- **Dynamic filters**: status chips are 3-state (tap: include → exclude(✕ red) → off,
  multi-select; server takes `status=`/`xstatus=` CSV) + "إخفاء الماضية" (`nopast=1`,
  keeps undated rows).
- **Verified**: local API round-trips (beacon 204×5, stats aggregates, Meta-attributed
  booking → lead_source auto + attribution JSON, exclude/multi filters) + headless
  click-through (chips cycle classes on→ex→off, visitors 6 KPIs, CAPI table+CSV btn,
  a11y panel opens, privacy links ×2, zero console errors) + live smoke (beacon wrote
  event with IL geo). NOTE: `/privacy.html` 308-redirects to `/privacy` (Pages pretty
  URLs) — fine.
### 2026-07-03 — Step 4.4 ✅ (workbook-faithful CAPI + venue list + privacy rewrite + IG pill)
- **CAPI = workbook rule** (owner correction): the tab now lists ONLY bookings whose
  مصدر العميل = `إعلان ممول (Meta)` (or fbclid-attributed) AND status مؤكد/عربون/مكتمل —
  set the source on a booking and it joins CAPI automatically. `lead_source` in the
  drawer is now a proper **select** of the imported vocabulary (manual choice is the
  primary flow; website auto-attribution just pre-fills it).
- **Venue reuse list**: `meta.venues` = DISTINCT used venues → القاعة/المكان datalist,
  like the workbook's hall list. (Workbook functionality coverage otherwise: status/
  payment/interest pick-lists, callback list, date search, city list with add-by-typing,
  KPIs, finance auto-totals — all present.)
- **Privacy rewritten** to be CAPI-compatible + future-proof: standard wording — use for
  service/operations/marketing improvement; no selling; limited sharing with service
  providers and ad/measurement platforms (Meta) for conversion measurement & campaign
  optimization; rights + policy-may-update clause. (Beacon still honors DNT in code —
  doing more than promised.) ⚠ Template, not legal advice; owner may want counsel review.
- **Footer Instagram**: gold pill + inline IG glyph (`.site-footer__ig`/`__igicon`).
- **Post-login fix (owner report)**: the edit drawer sat stuck mid-screen — the
  ASSET-ANALYSIS §5.1 RTL bug again (logical `inset-inline-end` + physical
  `translateX`; the RTL override pushed the drawer INTO view). Drawer + toast now use
  physical `left` + `visibility` gating. Selects also surface stored values missing
  from the options list instead of blanking them (a save could have wiped the field).
  Verified headless (`_voffice.mjs`: hidden on load → opens at left edge → closes via
  إغلاق/Escape, zero console errors; shots `docs/styleframes/voffice-{closed,open}.png`),
  playwright uninstalled after per the recipe, redeployed.

### 2026-07-03 — Step 5 ✅ LAUNCHED 🎉
- Production Pages project **sarab-website** (direct upload via wrangler; secret + D1
  bound; `og:image` absolute). Access app "SARAB Office" `7a7535fe…` covers
  apex/www/pages.dev `/office` (aud in `wrangler.toml`).
- Owner attached **sarabaibooth.com + www** via the Pages custom-domain flow.
  **DNS verified vs baseline: 0 removed/changed** — all 10 original production records
  byte-identical; total additions across the whole session: 5 email records (approved
  wizard) + 2 CNAMEs (apex/www → sarab-website.pages.dev). Snapshots in `ops/dns-snapshots/`.
- Live probes: apex 200, www 200, `/api/book` ok, `/office` → Access 302,
  `edit.sarabaibooth.com` alive/untouched. Bookings table = exactly the 56 real rows.
- Code on GitHub (private): https://github.com/sarab48/sarab-website (deploys stay via
  `wrangler pages deploy dist`; the repo is versioned backup).
- Throwaway `sarab-preview` project + its Access app deleted.
- Open (non-blocking): owner copy sign-offs — form error string, WhatsApp reply
  templates (deferred by owner), privacy page wording.

### 2026-07-03 — post-launch polish
- **Arabic type rule (permanent lesson):** letter-spacing breaks cursive joining —
  "التقط" collapsed on mobile AR. Zeroed tracking for AR/HE on `.step__t` +
  `.promise__lead`; audit any future display text the same way. Verified live.
- **Analytics semantics fixed:** "Meta leads" now windows on
  `COALESCE(booked_at,event_date,created_at)` — the 33 were REAL imported Meta-sourced
  bookings mis-windowed by import-date, not bad data (beacon events were never wrong).
- **Returning visitors:** persistent first-party pseudonymous id (`localStorage sarab-vid`
  → `events.visitor`); KPI "زوار عائدون" counts ids with 2+ sessions. Identifies no one;
  covered by the privacy wording (usage data/statistics). DNT still honored.
- **a11y button:** smaller + translucent at rest (opacity .55 → 1 on hover/open) so it
  no longer covers the scroll cue.

### 2026-07-21 — office dash: paid-based net, clash colors, totals, التحليلات tab
- **Net income = money actually received** (owner rule): per-event `net_profit = paid −
  total_expenses` (was price-based) in finance API + `ensureEventFinance` seeding; the
  المالية KPI row now shows إيرادات متوقعة (prices) vs محصّل فعلياً (Σ event paid +
  advances in hand) and صافي الدخل computed from the latter.
- **Date-clash severity**: bookings API returns `confirmed_clash_dates` beside
  `conflict_dates`; the grid flags a clash date red only when a مؤكد/مكتمل booking sits
  on it (real double-booking danger), amber (`.dateflag--soft`) when only unconfirmed
  requests compete.
- **Totals rows**: `<tfoot>` المجموع on all three finance tables (advances / event P&L /
  general expenses).
- **New التحليلات tab** backed by `/office/api/insights`: KPIs (clients, actual bookings,
  conversion %, avg price, top city by clients/bookings/revenue), city + occasion tables,
  bars for months, lead sources, weekdays, venues. "Actual booking" = مؤكد/عربون/مكتمل.
- **Data migration**: `UPDATE event_finances SET net_profit = COALESCE(paid,0) −
  COALESCE(total_expenses,0)` — applied locally; remote pending owner run (permission
  gate). Full remote backup first: `ops/db-backups/2026-07-21-pre-netprofit-recompute/`
  (per-table JSON dumps — the D1 export endpoint was erroring CF-side, 10001).
- Verified: headless (red/amber flags per status mix, finance net 1,280 = 1,500+500−720,
  3 tfoots, insights renders, zero console errors) + live probes (apex/www 200, office
  Access-walled, `edit.` Worker alive, DNS read-back: all prod records present,
  EMAIL_API_TOKEN intact).

### 2026-07-22 — Meta campaign sources: per-campaign CAPI tracking
- **Why**: a second Meta ad campaign is launching; the owner needs to see which campaign
  each booking came from while everything still feeds the same CAPI sheet.
- **Owner-managed campaign list**: new `options` kind `meta_campaign` (no schema change).
  Managed from the ميتا CAPI tab (add / delete, confirm-guarded); campaign names appear
  in the «مصدر العميل» dropdown automatically (merged after «إعلان ممول (Meta)» by
  `/office/api/meta`). New endpoint `functions/office/api/options.js` (POST/DELETE,
  kind-allowlisted; 409 on any name that already exists as a lead_source or campaign —
  a collision would silently re-label old bookings as Meta conversions).
- **CAPI counts every campaign**: `fromMeta` now matches the base source OR any listed
  campaign (fbclid auto-attribution fallback unchanged), so all campaigns flow into the
  confirmed/advance tables and the single Events-Manager CSV — one offline-events sheet
  for all campaigns, exactly as Meta expects (Meta attributes offline conversions to the
  right campaign by user matching; the per-campaign split here is for the owner's eyes).
- **Per-campaign funnel table** in the CAPI tab: عملاء (all statuses) / مؤكد+مكتمل /
  confirmed value / عرابين / conversion % per campaign; deleting a campaign keeps the
  bookings' lead_source text but removes them from CAPI (stated in the confirm).
  التحليلات lead-source bars split per campaign automatically (groups by lead_source).
- Verified headless (`_vcampaign.mjs`): API validation (400 bad kind/empty, 409 clash),
  UI add → dropdown + table row, booking on campaign → CAPI KPI +1 + row funnel
  (1 lead / 1 conf / 2,600 ₪ / 100%), duplicate rejected, delete → out of CAPI, zero
  console errors. Local-only test data; no remote D1 writes.

### 2026-07-22 — auto-city pricing: unknown city on a booking joins the price list
- **Owner rule**: saving a booking (create or edit) whose city isn't priced yet, with a
  price on the booking, adds that city to أسعار المدن at that price — reusing a tier
  that already carries the exact price, else creating one named `فئة {price} ₪`
  (renameable in the pricing tab). Next client from the city gets the اعتماد السعر
  suggestion automatically. `ensureCityPrice` in `functions/office/api/bookings.js`,
  called from POST + PATCH; response carries `city_added` and the drawer toast says so.
- Normalized-name dedup (same `normalizeCity` as the intel match) so «الناصرة»/«ناصرة»
  never become two cities; no price → no add; UNIQUE race swallowed.
- Verified headless (`_vcity.mjs`): add at new price 3100 → new tier; normalized
  duplicate + different price skipped (no stray tier); PATCH city at existing tier price
  1800 → joined that tier (no new tier); no-price city not added; drawer intel then
  offers اعتماد السعر 3,100 for the next client; `_vcampaign.mjs` re-run green; zero
  console errors. Local-only test data, cleaned up.
