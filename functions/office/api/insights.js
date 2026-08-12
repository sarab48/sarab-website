/*
  GET /office/api/insights[?year=YYYY][&month=YYYY-MM] — تحليلات الحجوزات: business
  intelligence aggregated from the bookings table.

  Owner's rule (2026-08-01, matching the CAPI tab): **دفع العربون is NOT confirmed yet.**
  Confirmed = مؤكد / مكتمل only; deposit-paid bookings are counted and valued separately
  everywhere ("بانتظار التأكيد"). The operational side (SARAB numbering, booked_at
  stamping, calendar sync) still treats all three as real bookings — that is bookings.js
  BOOKED_STATUSES and is deliberately unchanged.

  `year` / `month` scope every aggregate to events in that period (month wins when both
  are sent). Exceptions so the filter bar and quality checks stay whole: `years` is always
  unscoped, `months` is scoped to the year only, `gaps` is always global, and `made`
  (bookings signed per month) scopes by booked_at — "what did we sign in 2026", not
  "what happens in 2026".
  Auth: ../_middleware.js.
*/

const CONFIRMED = "('مؤكد','مكتمل')"
const REAL = "('مؤكد','مكتمل','دفع العربون')"

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const yearQ = u.searchParams.get('year') || ''
  const monthQ = u.searchParams.get('month') || ''
  const year = /^\d{4}$/.test(yearQ) ? yearQ : null
  const month = /^\d{4}-\d{2}$/.test(monthQ) ? monthQ : null
  // The event_date prefix everything is scoped by; regex-validated above, safe to inline.
  const prefix = month || year
  const scope = prefix ? `AND substr(event_date, 1, ${prefix.length}) = '${prefix}'` : ''
  // The months list stays year-wide even when a single month is selected, so the month
  // chips / table don't collapse to one entry.
  const yearPrefix = year || (month ? month.slice(0, 4) : null)
  const yearScope = yearPrefix ? `AND substr(event_date, 1, 4) = '${yearPrefix}'` : ''
  const madeScope = prefix ? `AND substr(booked_at, 1, ${prefix.length}) = '${prefix}'` : ''

  const gk = (col) => `COALESCE(NULLIF(TRIM(${col}), ''), 'غير محدد')`
  const isConf = `status IN ${CONFIRMED}`
  const isDep = `status = 'دفع العربون'`
  // What a booking actually collected: price − what it still owes; no price tracked →
  // the deposit is what we know arrived. Same rule as the finance tab's «محصّل».
  const collected = `COALESCE(price - COALESCE(remaining, 0), COALESCE(deposit, 0))`
  const upcoming = "event_date >= date('now')"
  const noVal = (col) => `(${col} IS NULL OR TRIM(${col}) = '')`
  const [kpi, booked, deposit, years, months, made, collections, gaps,
    cities, occasions, sources, weekdays, venues] = await env.DB.batch([
    env.DB.prepare(`SELECT
      SUM(CASE WHEN status != 'ملغي' THEN 1 ELSE 0 END) AS clients,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN status = 'مكتمل' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status = 'ملغي' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN ${isConf} THEN price END), 0) AS revenue,
      COALESCE(AVG(CASE WHEN ${isConf} THEN price END), 0) AS avg_price
      FROM bookings WHERE 1=1 ${scope}`),
    // The headline: confirmed bookings in scope, split by whether the event already
    // happened (by date) — plus the money still to collect on the upcoming ones.
    env.DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN NOT ${upcoming} THEN 1 ELSE 0 END) AS held,
      COALESCE(SUM(price), 0) AS revenue,
      COALESCE(SUM(CASE WHEN ${upcoming} THEN price END), 0) AS upcoming_revenue,
      COALESCE(SUM(CASE WHEN ${upcoming} THEN remaining END), 0) AS outstanding
      FROM bookings WHERE ${isConf} AND event_date IS NOT NULL ${scope}`),
    // دفع العربون — held apart on the owner's rule: paid a deposit, not confirmed yet.
    env.DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      COALESCE(SUM(price), 0) AS value,
      COALESCE(SUM(deposit), 0) AS collected
      FROM bookings WHERE ${isDep} AND event_date IS NOT NULL ${scope}`),
    env.DB.prepare(`SELECT substr(event_date, 1, 4) AS k,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS n,
      SUM(CASE WHEN ${isConf} AND ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN ${isDep} THEN 1 ELSE 0 END) AS dep,
      COALESCE(SUM(CASE WHEN ${isConf} THEN price END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN ${isConf} THEN ${collected} END), 0) AS collected,
      COALESCE(SUM(CASE WHEN ${isConf} THEN remaining END), 0) AS due
      FROM bookings WHERE status IN ${REAL} AND event_date IS NOT NULL AND length(event_date) >= 4
      GROUP BY k ORDER BY k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS n,
      SUM(CASE WHEN ${isConf} AND ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN ${isDep} THEN 1 ELSE 0 END) AS dep,
      COALESCE(SUM(CASE WHEN ${isConf} THEN price END), 0) AS revenue,
      COALESCE(SUM(CASE WHEN ${isConf} THEN ${collected} END), 0) AS collected,
      COALESCE(SUM(CASE WHEN ${isConf} THEN remaining END), 0) AS due
      FROM bookings WHERE status IN ${REAL} AND event_date IS NOT NULL AND length(event_date) >= 7 ${yearScope}
      GROUP BY k ORDER BY k`),
    // Bookings *signed* per month (تاريخ الحجز) — how sales are going, independent of
    // when the events fall. booked_at is fully backfilled as of 2026-08-01.
    env.DB.prepare(`SELECT substr(booked_at, 1, 7) AS k,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS n,
      SUM(CASE WHEN ${isDep} THEN 1 ELSE 0 END) AS dep
      FROM bookings WHERE status IN ${REAL} AND booked_at IS NOT NULL AND length(booked_at) >= 7 ${madeScope}
      GROUP BY k ORDER BY k`),
    // للتحصيل: upcoming events still owing money — the call list. Confirmed and deposit
    // rows both listed (the status column keeps them apart), soonest first.
    env.DB.prepare(`SELECT id, booking_no, name, phone, event_date, city, status,
      price, deposit, remaining
      FROM bookings
      WHERE status IN ${REAL} AND ${upcoming} AND COALESCE(remaining, 0) > 0 ${scope}
      ORDER BY event_date ASC, id ASC LIMIT 100`),
    // بيانات ناقصة (always global): records missing the fields the analyses lean on.
    // Occasion/booking-date only matter once it's a real booking; source and phone
    // matter for every live lead.
    env.DB.prepare(`SELECT id, booking_no, name, event_date, status,
      CASE WHEN ${noVal('occasion')} AND status IN ${REAL} THEN 1 ELSE 0 END AS miss_occasion,
      CASE WHEN ${noVal('lead_source')} THEN 1 ELSE 0 END AS miss_source,
      CASE WHEN ${noVal('phone')} THEN 1 ELSE 0 END AS miss_phone,
      CASE WHEN booked_at IS NULL AND status IN ${REAL} THEN 1 ELSE 0 END AS miss_booked_at
      FROM bookings
      WHERE status != 'ملغي' AND (
        (${noVal('occasion')} AND status IN ${REAL})
        OR ${noVal('lead_source')} OR ${noVal('phone')}
        OR (booked_at IS NULL AND status IN ${REAL}))
      ORDER BY (status IN ${REAL}) DESC, (event_date IS NULL), event_date DESC LIMIT 60`),
    env.DB.prepare(`SELECT ${gk('city')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isConf} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY clients DESC, booked DESC, k`),
    env.DB.prepare(`SELECT ${gk('occasion')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isConf} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY booked DESC, clients DESC, k`),
    env.DB.prepare(`SELECT ${gk('lead_source')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isConf} THEN 1 ELSE 0 END) AS booked
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY clients DESC, k`),
    env.DB.prepare(`SELECT CAST(strftime('%w', event_date) AS INTEGER) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isConf} AND event_date IS NOT NULL AND length(event_date) >= 10 ${scope}
      GROUP BY k ORDER BY n DESC`),
    env.DB.prepare(`SELECT TRIM(venue) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isConf} AND venue IS NOT NULL AND TRIM(venue) != '' ${scope}
      GROUP BY k ORDER BY n DESC, k LIMIT 12`),
  ])
  return Response.json({
    ok: true,
    scope: { year, month },
    kpi: kpi.results[0],
    booked: booked.results[0],
    deposit: deposit.results[0],
    years: years.results,
    months: months.results,
    made: made.results,
    collections: collections.results,
    gaps: gaps.results,
    cities: cities.results,
    occasions: occasions.results,
    sources: sources.results,
    weekdays: weekdays.results,
    venues: venues.results,
  })
}
