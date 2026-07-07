/*
  GET /office/api/meta — everything the dashboard needs on load besides the rows:
  the owner's vocabularies (options), city prices, KPIs, available months, and who
  is signed in. Auth handled by ../_middleware.js.
*/

export async function onRequestGet({ env, data }) {
  const [options, cities, counts, kpi, months, venues, occasions] = await env.DB.batch([
    env.DB.prepare('SELECT kind, value, pos FROM options ORDER BY kind, pos'),
    env.DB.prepare(`SELECT c.id, c.name, p.price FROM cities c
                    JOIN price_tiers p ON p.id = c.tier_id ORDER BY p.price, c.name`),
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status'),
    env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM bookings WHERE status = 'استفسار') AS inquiries,
      (SELECT COUNT(*) FROM bookings WHERE status IN ('مؤكد','دفع العربون') AND event_date >= date('now')) AS upcoming,
      (SELECT COUNT(*) FROM bookings WHERE status = 'عرض سعر') AS quotes,
      (SELECT COALESCE(SUM(remaining), 0) FROM bookings
         WHERE status IN ('مؤكد','دفع العربون','مكتمل') AND remaining > 0) AS outstanding`),
    env.DB.prepare(`SELECT DISTINCT substr(event_date, 1, 7) AS m FROM bookings
                    WHERE event_date IS NOT NULL AND length(event_date) >= 7 ORDER BY m DESC`),
    // halls/venues already used once — offered for reuse, like the workbook's lists
    env.DB.prepare(`SELECT DISTINCT venue AS v FROM bookings
                    WHERE venue IS NOT NULL AND venue != '' ORDER BY v`),
    // event types actually used in bookings (most-used first) — folded into the occasion
    // vocabulary below so the dropdown shows the full real list and auto-grows with new ones
    env.DB.prepare(`SELECT occasion AS o, COUNT(*) AS n FROM bookings
                    WHERE occasion IS NOT NULL AND occasion != ''
                    GROUP BY occasion ORDER BY n DESC, o`),
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

  return Response.json({
    ok: true,
    email: data.accessEmail,
    options: opts,
    cities: cities.results,
    statusCounts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])),
    kpi: kpi.results[0],
    months: months.results.map((r) => r.m),
    venues: venues.results.map((r) => r.v),
  })
}
