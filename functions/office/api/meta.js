/*
  GET /office/api/meta — everything the dashboard needs on load besides the rows:
  the owner's vocabularies (options), city prices, KPIs, available months, and who
  is signed in. Auth handled by ../_middleware.js.
*/

import { calendarConfigured } from '../../../shared/gcal.js'

// Worker names already assigned to an event, one entry per person: a booking's `staff`
// may hold several names ("أحمد، سارة"), so split the stored strings apart before
// offering them back as the الطاقم datalist.
export function staffNames(rows) {
  const seen = new Map()   // lowercased key → first spelling seen, so the list has no near-dupes
  for (const r of rows) {
    for (const part of String(r.s || '').split(/[,،;/+]/)) {
      const name = part.trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!seen.has(key)) seen.set(key, name)
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'ar'))
}

export async function onRequestGet({ env, data }) {
  const [options, cities, counts, kpi, months, venues, occasions, staff] = await env.DB.batch([
    env.DB.prepare('SELECT kind, value, pos FROM options ORDER BY kind, pos'),
    env.DB.prepare(`SELECT c.id, c.name, c.region, p.price FROM cities c
                    JOIN price_tiers p ON p.id = c.tier_id ORDER BY p.price, c.name`),
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status'),
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM bookings WHERE status = 'استفسار') AS inquiries,
      -- Owner's rule (2026-08-01): دفع العربون is not confirmed yet — counted apart.
      (SELECT COUNT(*) FROM bookings WHERE status = 'مؤكد' AND event_date >= date('now')) AS upcoming,
      (SELECT COUNT(*) FROM bookings WHERE status = 'دفع العربون' AND event_date >= date('now')) AS deposit_upcoming,
      (SELECT COUNT(*) FROM bookings WHERE status = 'عرض سعر') AS quotes,
      (SELECT COALESCE(SUM(remaining), 0) FROM bookings
         WHERE status IN ('مؤكد','دفع العربون','مكتمل') AND remaining > 0) AS outstanding`),
    env.DB.prepare(`SELECT DISTINCT substr(event_date, 1, 7) AS m FROM bookings
                    WHERE event_date IS NOT NULL AND length(event_date) >= 7 ORDER BY m DESC`),
    // halls/venues already used once — offered for reuse, like the workbook's lists.
    // Kept per (venue, city) with a count so the drawer can put the chosen city's
    // halls first; the flat list is derived below for everything else.
    env.DB.prepare(`SELECT venue AS v, city AS c, COUNT(*) AS n FROM bookings
                    WHERE venue IS NOT NULL AND venue != ''
                    GROUP BY venue, city ORDER BY v`),
    // event types actually used in bookings (most-used first) — folded into the occasion
    // vocabulary below so the dropdown shows the full real list and auto-grows with new ones
    env.DB.prepare(`SELECT occasion AS o, COUNT(*) AS n FROM bookings
                    WHERE occasion IS NOT NULL AND occasion != ''
                    GROUP BY occasion ORDER BY n DESC, o`),
    // workers already sent to an event — offered for reuse in the الطاقم field
    env.DB.prepare(`SELECT DISTINCT staff AS s FROM bookings
                    WHERE staff IS NOT NULL AND staff != ''`),
  ])

  const opts = {}
  for (const r of options.results) (opts[r.kind] ??= []).push(r.value)

  // Merge every event type seen in bookings into the curated occasion list: keep the
  // owner's order, append any real type that isn't listed yet, and keep أخرى ("other") last.
  const curatedOcc = opts.occasion || []
  const usedOcc = occasions.results.map((r) => r.o).filter((o) => !curatedOcc.includes(o))
  const OTHER = 'أخرى'
  opts.occasion = [...curatedOcc, ...usedOcc].filter((o) => o !== OTHER)
  if ([...curatedOcc, ...usedOcc].includes(OTHER)) opts.occasion.push(OTHER)

  // Meta campaign names (owner-managed in the ميتا CAPI tab, kind = meta_campaign) join
  // the مصدر العميل dropdown right after the base Meta entry, so each booking can be
  // tagged with its exact campaign — and every campaign counts as Meta in CAPI.
  const ls = opts.lead_source || []
  const camps = (opts.meta_campaign || []).filter((c) => !ls.includes(c))
  if (camps.length) {
    const at = ls.indexOf('إعلان ممول (Meta)')
    ls.splice(at === -1 ? ls.length : at + 1, 0, ...camps)
    opts.lead_source = ls
  }

  return Response.json({
    ok: true,
    email: data.accessEmail,
    options: opts,
    cities: cities.results,
    statusCounts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])),
    kpi: kpi.results[0],
    months: months.results.map((r) => r.m),
    venues: [...new Set(venues.results.map((r) => r.v))],
    venue_cities: venues.results,
    staff: staffNames(staff.results),
    // Whether the optional Google Calendar link is switched on (docs/06-GOOGLE-CALENDAR.md).
    // Off = the dashboard hides its button entirely; the التقويم tab is unaffected either way.
    google_calendar: calendarConfigured(env),
  })
}
