/*
  GET /office/api/stats?days=30 — visitor analytics aggregates for the الزوار tab.
  Auth: ../_middleware.js.
*/

export async function onRequestGet({ request, env }) {
  const days = Math.min(Math.max(parseInt(new URL(request.url).searchParams.get('days') || '30', 10) || 30, 1), 365)
  const cut = `-${days} days`
  const q = (sql) => env.DB.prepare(sql).bind(cut)

  const [kpi, series, countries, sources, langs, devices, funnel, metaLeads] = await env.DB.batch([
    q(`SELECT
        (SELECT COUNT(DISTINCT session) FROM events WHERE type='view'   AND ts >= datetime('now', ?1)) AS visits,
        (SELECT COUNT(*)                FROM events WHERE type='view'   AND ts >= datetime('now', ?1)) AS views,
        (SELECT COUNT(*)                FROM events WHERE type='wa'     AND ts >= datetime('now', ?1)) AS wa,
        (SELECT COUNT(*)                FROM events WHERE type='submit' AND ts >= datetime('now', ?1)) AS submits,
        (SELECT ROUND(COALESCE(AVG(value),0)) FROM events WHERE type='time' AND ts >= datetime('now', ?1)) AS avg_time,
        (SELECT COUNT(*) FROM (SELECT visitor FROM events WHERE type='view' AND visitor IS NOT NULL AND ts >= datetime('now', ?1)
           GROUP BY visitor HAVING COUNT(DISTINCT session) > 1)) AS returning`),
    q(`SELECT date(ts) AS d, COUNT(DISTINCT session) AS n FROM events
       WHERE type='view' AND ts >= datetime('now', ?1) GROUP BY d ORDER BY d`),
    q(`SELECT COALESCE(country,'؟') AS k, COUNT(DISTINCT session) AS n FROM events
       WHERE type='view' AND ts >= datetime('now', ?1) GROUP BY k ORDER BY n DESC LIMIT 8`),
    q(`SELECT COALESCE(NULLIF(utm_source,''), NULLIF(ref,''), 'مباشر') AS k, COUNT(DISTINCT session) AS n FROM events
       WHERE type='view' AND ts >= datetime('now', ?1) GROUP BY k ORDER BY n DESC LIMIT 8`),
    q(`SELECT COALESCE(lang,'؟') AS k, COUNT(DISTINCT session) AS n FROM events
       WHERE type='view' AND ts >= datetime('now', ?1) GROUP BY k ORDER BY n DESC`),
    q(`SELECT COALESCE(device,'؟') AS k, COUNT(DISTINCT session) AS n FROM events
       WHERE type='view' AND ts >= datetime('now', ?1) GROUP BY k ORDER BY n DESC`),
    q(`SELECT CAST(value AS INTEGER) AS k, COUNT(DISTINCT session) AS n FROM events
       WHERE type='scroll' AND ts >= datetime('now', ?1) GROUP BY k ORDER BY k`),
    q(`SELECT COUNT(*) AS n FROM bookings
       WHERE COALESCE(booked_at, event_date, substr(created_at,1,10)) >= date('now', ?1)
         AND (lead_source = 'إعلان ممول (Meta)' OR json_extract(extra, '$.attribution.fbclid') = 1)`),
  ])

  return Response.json({
    ok: true, days,
    kpi: kpi.results[0],
    series: series.results,
    countries: countries.results,
    sources: sources.results,
    langs: langs.results,
    devices: devices.results,
    funnel: funnel.results,
    meta_leads: metaLeads.results[0].n,
  })
}
