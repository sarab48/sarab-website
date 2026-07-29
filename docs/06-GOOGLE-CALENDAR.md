# 06 — Google Calendar

> **Status: built, deployed, and switched OFF (2026-07-29).** The owner chose the
> in-dashboard **التقويم** tab as the calendar for now and set this aside — "maybe I come
> back to it in the future". Without the three secrets below, every code path here is an
> immediate no-op and the dashboard hides its 🗓 button entirely (`meta.google_calendar`).
> Nothing needs undoing; completing the owner's steps below is all that switches it on.
>
> The two are not alternatives: التقويم is the *view* (it is the bookings, drawn as a
> month), this is the *notification channel* (alarms on a phone that's asleep, plus the
> option of sharing the calendar with a worker). See `docs/05` for the التقويم tab.

Confirmed bookings appear automatically in the owner's Google Calendar, with reminders,
and stay in step with the office dashboard for the life of the booking.

---

## What it does

| In the dashboard | In Google Calendar |
| --- | --- |
| Booking saved as **مؤكد / دفع العربون / مكتمل** with a date | The event is created |
| Its date, time, venue, price, طاقم… edited | The same event is updated — never duplicated |
| Booking set to **ملغي**, or its date cleared | The event is deleted |
| Booking deleted outright | The event is deleted with it |
| Booking still **استفسار / عرض سعر** | Nothing — quotes are not appointments |
| Confirmed booking whose date already passed | Nothing new is created (there is nothing left to attend) |

The event carries the booking number, client name + phone, occasion, venue, arrival time,
الطاقم, price/deposit/remaining, status and ملاحظات in its description, and is colour-coded
by status (green = مؤكد, blue = دفع العربون, grey = مكتمل).

With a وقت البداية recorded it becomes a timed event — ending at وقت النهاية, else after
عدد الساعات, else four hours later. With no start time it becomes an all-day entry on the
event's date.

**A calendar failure never costs a booking.** If Google is unreachable, the key is revoked,
or nothing is configured at all, the booking saves in full and the dashboard says the
calendar didn't get it. The 🗓 **تقويم Google** button in the الحجوزات tab shows what is out
of step and pushes it with one press.

---

## Reminders — read this once

Google's rule: *"Reminders are private information, specific to an authenticated user;
they're not shared across multiple users."* A reminder written through the API by the
service account would belong to the **service account**, and the owner's phone would stay
silent. So the events are created with `reminders.useDefault: true`, and the reminders that
actually ring are the **calendar's own default notifications**, which the owner sets in
Google Calendar.

That is also the better arrangement: the owner retunes them from their phone in seconds,
for every SARAB booking at once, with no deploy. See step 5 below.

---

## The owner's part — one time, about ten minutes

Everything below happens at [console.cloud.google.com](https://console.cloud.google.com)
and in Google Calendar, signed in as **the account whose calendar this is**. It is free.

**1. Make a project**
Top bar → project dropdown → **New project** → name it `SARAB` → **Create**, then make sure
it is the selected project.

**2. Turn the Calendar API on**
Search bar → *Google Calendar API* → **Enable**.

**3. Make a service account (the robot that writes to the calendar)**
Menu ☰ → **APIs & Services → Credentials** → **+ Create credentials → Service account**.
Name it `sarab-office` → **Create and continue** → skip the optional role and access
screens → **Done**.

**4. Give it a key, and send me the file**
Click the service account you just made → **Keys** tab → **Add key → Create new key** →
**JSON** → **Create**. A `.json` file downloads. **That file is the password to the
calendar — send it to me privately and don't post it anywhere.**
While you're on that page, copy the service account's email — it looks like
`sarab-office@sarab-xxxxx.iam.gserviceaccount.com`.

**5. Make a calendar for the bookings and share it with the robot**
In [Google Calendar](https://calendar.google.com) on a computer:
- Left side → **Other calendars +** → **Create new calendar** → name it
  **SARAB — الحجوزات** → **Create calendar**. (A separate calendar keeps work bookings out
  of your personal events, lets you colour and hide them, and gives them their own
  reminders. Using your main calendar works too — just share that one instead.)
- Open that calendar's **Settings and sharing**:
  - **Share with specific people or groups → Add people** → paste the service account
    email from step 4 → permission **Make changes to events** → **Send**.
  - **Event notifications** → set what you want to be reminded of, e.g. **1 day before**
    and **3 hours before**. Also set **All-day event notifications** (e.g. 1 day before)
    — bookings with no start time use those. **These are the reminders that will ring.**
  - Scroll to **Integrate calendar** and copy the **Calendar ID** (it looks like
    `c_9f3…@group.calendar.google.com`). Send me that too.

**6. Send me two things**
- the `.json` key file from step 4
- the Calendar ID from step 5

That's the whole manual part. Nothing to renew, no password that expires, no re-login.

---

## My part, after that

1. Install three encrypted secrets on the Pages project (values never enter the repo):
   ```
   npx wrangler pages secret put GCAL_CLIENT_EMAIL   # client_email from the JSON
   npx wrangler pages secret put GCAL_PRIVATE_KEY    # private_key from the JSON, verbatim
   npx wrangler pages secret put GCAL_CALENDAR_ID    # the Calendar ID
   ```
2. Redeploy, open **🗓 تقويم Google** in the dashboard, confirm it reads
   *«متصل بتقويم …»*, and press **مزامنة الآن** once to push the bookings that are already
   confirmed and still upcoming.

`GCAL_TIMEZONE` is a plain var in `wrangler.toml` (`Asia/Jerusalem`); `GCAL_TOKEN_URL` and
`GCAL_API_BASE` exist only so the test suite can point at a stub — never set in production.

---

## If something looks wrong

| The panel says | What it means |
| --- | --- |
| **لم تُضبط بيانات الاتصال بعد** | The three secrets aren't installed yet (or were dropped by a deploy — see below). |
| **التقويم غير مُشارك مع حساب الخدمة** | Step 5's share didn't happen, went to the wrong address, or the Calendar ID is wrong. |
| **تعذّر الوصول إلى Google** | Google was unreachable, or the private key is malformed. Press مزامنة الآن again later. |
| **N حجز بحاجة للمزامنة** | Normal after a Google outage or before the first sync. Press **مزامنة الآن**. |

Known repo gotcha: a `wrangler.toml`-config deploy can drop dashboard-set Pages secrets.
If the panel suddenly reports "not configured" after a deploy, re-put the three secrets and
redeploy — the same rule that already applies to `EMAIL_API_TOKEN`.

Deleting an event by hand in Google Calendar is safe: the next save of that booking notices
it is gone (404) and creates a fresh one. Editing an event by hand is also safe — updates
are sent as a `PATCH`, so guests or attachments you added survive; only the fields the
dashboard owns are overwritten.

---

## Where the code lives

- `shared/gcal.js` — service-account JWT (RS256 via Web Crypto), token cache, event
  building, create/update/delete. Never throws into a caller.
- `functions/office/api/bookings.js` (POST) and `functions/office/api/bookings/[id].js`
  (PATCH, DELETE) — the hooks. Whether a booking belongs on the calendar is decided in one
  place only: `BOOKED_STATUSES` in `bookings.js`.
- `functions/office/api/calendar.js` — the panel's status + the catch-up sync.
- `bookings.gcal_event_id / gcal_link / gcal_synced_at` — migration
  `db/migrations/2026-07-29-gcal.sql`, purely additive.
- `_vcal.mjs` — end-to-end test against a stub that speaks Google's protocol and verifies
  our JWT signature with the real public key. Self-contained: it starts its own
  `wrangler pages dev` on 8797 (`--binding` is the only flag that actually reaches the
  Worker's `env` in `pages dev`; `--env-file` is parsed but never bound). Run with
  `npm run build && node _vcal.mjs`.
