/*
  GET /office/api/insights[?year=YYYY][&month=YYYY-MM] — تحليلات الحجوزات: business
  intelligence aggregated from the bookings table — confirmed-bookings summary (total /
  already-held / upcoming, by event date), per-year and per-month breakdowns, cities
  (clients vs. actual bookings vs. revenue), occasions, lead sources, weekdays, venues,
  plus headline KPIs.
  `year` / `month` scope every aggregate to events in that period (month wins when both
  are sent). `years` is always unscoped and `months` is scoped to the year only, so the
  filter bar can always show what periods exist.
  "Actual booking" = مؤكد / دفع العربون / مكتمل (same definition as the finance revenue
  KPI). "Client" = every non-cancelled record — anyone who reached out counts.
  Auth: ../_middleware.js.
*/

const BOOKED = "('مؤكد','دفع العربون','مكتمل')"

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

  const gk = (col) => `COALESCE(NULLIF(TRIM(${col}), ''), 'غير محدد')`
  const isBooked = `status IN ${BOOKED}`
  const upcoming = "event_date >= date('now')"
  const [kpi, booked, years, months, cities, occasions, sources, weekdays, venues] = await env.DB.batch([
    env.DB.prepare(`SELECT
      SUM(CASE WHEN status != 'ملغي' THEN 1 ELSE 0 END) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN status = 'مكتمل' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status = 'ملغي' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue,
      COALESCE(AVG(CASE WHEN ${isBooked} THEN price END), 0) AS avg_price
      FROM bookings WHERE 1=1 ${scope}`),
    // The headline the owner asked for: confirmed bookings in scope, split by whether
    // the event already happened (by date) — plus the money still to collect on the
    // upcoming ones.
    env.DB.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      SUM(CASE WHEN NOT ${upcoming} THEN 1 ELSE 0 END) AS held,
      COALESCE(SUM(price), 0) AS revenue,
      COALESCE(SUM(CASE WHEN ${upcoming} THEN price END), 0) AS upcoming_revenue,
      COALESCE(SUM(CASE WHEN ${upcoming} THEN remaining END), 0) AS outstanding
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL ${scope}`),
    env.DB.prepare(`SELECT substr(event_date, 1, 4) AS k, COUNT(*) AS n,
      SUM(CASE WHEN ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      COALESCE(SUM(price), 0) AS revenue
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL AND length(event_date) >= 4
      GROUP BY k ORDER BY k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k, COUNT(*) AS n,
      SUM(CASE WHEN ${upcoming} THEN 1 ELSE 0 END) AS upcoming,
      COALESCE(SUM(price), 0) AS revenue
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL AND length(event_date) >= 7 ${yearScope}
      GROUP BY k ORDER BY k`),
    env.DB.prepare(`SELECT ${gk('city')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY clients DESC, booked DESC, k`),
    env.DB.prepare(`SELECT ${gk('occasion')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY booked DESC, clients DESC, k`),
    env.DB.prepare(`SELECT ${gk('lead_source')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked
      FROM bookings WHERE status != 'ملغي' ${scope}
      GROUP BY k ORDER BY clients DESC, k`),
    env.DB.prepare(`SELECT CAST(strftime('%w', event_date) AS INTEGER) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL AND length(event_date) >= 10 ${scope}
      GROUP BY k ORDER BY n DESC`),
    env.DB.prepare(`SELECT TRIM(venue) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isBooked} AND venue IS NOT NULL AND TRIM(venue) != '' ${scope}
      GROUP BY k ORDER BY n DESC, k LIMIT 12`),
  ])
  return Response.json({
    ok: true,
    scope: { year, month },
    kpi: kpi.results[0],
    booked: booked.results[0],
    years: years.results,
    months: months.results,
    cities: cities.results,
    occasions: occasions.results,
    sources: sources.results,
    weekdays: weekdays.results,
    venues: venues.results,
  })
}
