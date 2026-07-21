/*
  GET /office/api/insights — تحليلات الحجوزات: business intelligence aggregated from the
  bookings table — cities (clients vs. actual bookings vs. revenue), occasions, lead
  sources, monthly load, weekdays, venues, plus headline KPIs.
  "Actual booking" = مؤكد / دفع العربون / مكتمل (same definition as the finance revenue
  KPI). "Client" = every non-cancelled record — anyone who reached out counts.
  Auth: ../_middleware.js.
*/

const BOOKED = "('مؤكد','دفع العربون','مكتمل')"

export async function onRequestGet({ env }) {
  const gk = (col) => `COALESCE(NULLIF(TRIM(${col}), ''), 'غير محدد')`
  const isBooked = `status IN ${BOOKED}`
  const [kpi, cities, occasions, sources, months, weekdays, venues] = await env.DB.batch([
    env.DB.prepare(`SELECT
      SUM(CASE WHEN status != 'ملغي' THEN 1 ELSE 0 END) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      SUM(CASE WHEN status = 'مكتمل' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status = 'ملغي' THEN 1 ELSE 0 END) AS cancelled,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue,
      COALESCE(AVG(CASE WHEN ${isBooked} THEN price END), 0) AS avg_price
      FROM bookings`),
    env.DB.prepare(`SELECT ${gk('city')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي'
      GROUP BY k ORDER BY clients DESC, booked DESC, k`),
    env.DB.prepare(`SELECT ${gk('occasion')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked,
      COALESCE(SUM(CASE WHEN ${isBooked} THEN price END), 0) AS revenue
      FROM bookings WHERE status != 'ملغي'
      GROUP BY k ORDER BY booked DESC, clients DESC, k`),
    env.DB.prepare(`SELECT ${gk('lead_source')} AS k,
      COUNT(*) AS clients,
      SUM(CASE WHEN ${isBooked} THEN 1 ELSE 0 END) AS booked
      FROM bookings WHERE status != 'ملغي'
      GROUP BY k ORDER BY clients DESC, k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k, COUNT(*) AS n,
      COALESCE(SUM(price), 0) AS revenue
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL AND length(event_date) >= 7
      GROUP BY k ORDER BY k`),
    env.DB.prepare(`SELECT CAST(strftime('%w', event_date) AS INTEGER) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isBooked} AND event_date IS NOT NULL AND length(event_date) >= 10
      GROUP BY k ORDER BY n DESC`),
    env.DB.prepare(`SELECT TRIM(venue) AS k, COUNT(*) AS n
      FROM bookings WHERE ${isBooked} AND venue IS NOT NULL AND TRIM(venue) != ''
      GROUP BY k ORDER BY n DESC, k LIMIT 12`),
  ])
  return Response.json({
    ok: true,
    kpi: kpi.results[0],
    cities: cities.results,
    occasions: occasions.results,
    sources: sources.results,
    months: months.results,
    weekdays: weekdays.results,
    venues: venues.results,
  })
}
