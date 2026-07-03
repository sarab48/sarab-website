/*
  /office/api/pricing — tier/city management. GET returns tiers (price ASC) with their
  cities; writes take { type: 'tier'|'city', ... }. A tier can only be deleted when
  empty; imported city_prices stays untouched as the migration record.
  Auth: ../_middleware.js.
*/

const bad = (error, status = 400) => Response.json({ ok: false, error }, { status })

async function tree(env) {
  const [tiers, cities] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, price, pos FROM price_tiers ORDER BY price, id'),
    env.DB.prepare('SELECT id, name, tier_id FROM cities ORDER BY name'),
  ])
  const byTier = {}
  for (const c of cities.results) (byTier[c.tier_id] ??= []).push(c)
  return tiers.results.map((t) => ({ ...t, cities: byTier[t.id] || [] }))
}

export async function onRequestGet({ env }) {
  return Response.json({ ok: true, tiers: await tree(env) })
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  if (b.type === 'tier') {
    const name = String(b.name || '').trim().slice(0, 100)
    const price = Number(b.price)
    if (!name || !Number.isFinite(price) || price < 0) return bad('invalid-tier')
    await env.DB.prepare('INSERT INTO price_tiers (name, price) VALUES (?1, ?2)').bind(name, price).run()
  } else if (b.type === 'city') {
    const name = String(b.name || '').trim().slice(0, 100)
    const tierId = Number(b.tier_id)
    if (!name || !tierId) return bad('invalid-city')
    const tier = await env.DB.prepare('SELECT id FROM price_tiers WHERE id = ?1').bind(tierId).first()
    if (!tier) return bad('no-such-tier')
    try {
      await env.DB.prepare('INSERT INTO cities (name, tier_id) VALUES (?1, ?2)').bind(name, tierId).run()
    } catch {
      return bad('city-exists')
    }
  } else return bad('unknown-type')
  return Response.json({ ok: true, tiers: await tree(env) })
}

export async function onRequestPatch({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  if (b.type === 'tier') {
    const sets = []
    const vals = []
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 100)
      if (!name) return bad('invalid-name')
      sets.push(`name = ?${vals.length + 1}`); vals.push(name)
    }
    if (b.price !== undefined) {
      const price = Number(b.price)
      if (!Number.isFinite(price) || price < 0) return bad('invalid-price')
      sets.push(`price = ?${vals.length + 1}`); vals.push(price)
    }
    if (!sets.length) return bad('no-fields')
    vals.push(id)
    await env.DB.prepare(`UPDATE price_tiers SET ${sets.join(', ')} WHERE id = ?${vals.length}`).bind(...vals).run()
  } else if (b.type === 'city') {
    if (b.tier_id !== undefined) {
      const tier = await env.DB.prepare('SELECT id FROM price_tiers WHERE id = ?1').bind(Number(b.tier_id)).first()
      if (!tier) return bad('no-such-tier')
      await env.DB.prepare('UPDATE cities SET tier_id = ?1 WHERE id = ?2').bind(Number(b.tier_id), id).run()
    }
    if (b.name !== undefined) {
      const name = String(b.name).trim().slice(0, 100)
      if (!name) return bad('invalid-name')
      await env.DB.prepare('UPDATE cities SET name = ?1 WHERE id = ?2').bind(name, id).run()
    }
  } else return bad('unknown-type')
  return Response.json({ ok: true, tiers: await tree(env) })
}

export async function onRequestDelete({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  if (b.type === 'tier') {
    const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM cities WHERE tier_id = ?1').bind(id).first()
    if (used.n > 0) return bad('tier-not-empty')
    await env.DB.prepare('DELETE FROM price_tiers WHERE id = ?1').bind(id).run()
  } else if (b.type === 'city') {
    await env.DB.prepare('DELETE FROM cities WHERE id = ?1').bind(id).run()
  } else return bad('unknown-type')
  return Response.json({ ok: true, tiers: await tree(env) })
}
