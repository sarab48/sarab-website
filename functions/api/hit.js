/*
  POST /api/hit — anonymous, cookie-less usage beacon (see src/lib/analytics.js).
  Stores no IP and no persistent identifier; geo is the coarse country/city the edge
  already knows. Always answers 204 — analytics must never break the site.
*/

const TYPES = new Set(['view', 'scroll', 'wa', 'submit', 'time', 'section', 'form_start', 'reel'])

export async function onRequestPost({ request, env }) {
  let b
  try { b = JSON.parse(await request.text()) } catch { return new Response(null, { status: 204 }) }
  if (!b || !TYPES.has(b.t)) return new Response(null, { status: 204 })

  const s = (v, n) => (typeof v === 'string' && v ? v.slice(0, n) : null)
  const cf = request.cf || {}
  try {
    await env.DB.prepare(
      `INSERT INTO events (type, session, visitor, lang, country, city, ref, utm_source, utm_medium,
                           utm_campaign, fbclid, device, value, extra)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`
    ).bind(
      b.t, s(b.s, 40), s(b.vi, 40), s(b.l, 8), cf.country || null, cf.city || null, s(b.r, 80),
      s(b.us, 60), s(b.um, 60), s(b.uc, 80), b.f ? 1 : 0, s(b.d, 10),
      Number.isFinite(Number(b.v)) ? Number(b.v) : null, s(b.x, 40)
    ).run()
  } catch (err) {
    console.error('hit insert failed:', err)
  }
  return new Response(null, { status: 204 })
}
