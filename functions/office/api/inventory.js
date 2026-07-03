/*
  /office/api/inventory — المخزون. qty_left and state are computed server-side:
  qty_left = initial + added − used; state = منخفض when qty_left ≤ alert_at (if set),
  otherwise جيد. Auth: ../_middleware.js.
*/

const FIELDS = ['item', 'unit', 'qty_initial', 'qty_added', 'qty_used', 'alert_at']
const NUM = new Set(['qty_initial', 'qty_added', 'qty_used', 'alert_at'])

const bad = (error, status = 400) => Response.json({ ok: false, error }, { status })

const val = (k, v) => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (NUM.has(k)) { const n = Number(v); return Number.isFinite(n) ? n : null }
  return String(v).trim().slice(0, 200) || null
}

async function finalize(env, id) {
  const r = await env.DB.prepare('SELECT * FROM inventory WHERE id = ?1').bind(id).first()
  if (!r) return
  const left = (Number(r.qty_initial) || 0) + (Number(r.qty_added) || 0) - (Number(r.qty_used) || 0)
  const state = r.alert_at != null && left <= Number(r.alert_at) ? 'منخفض' : 'جيد'
  await env.DB.prepare('UPDATE inventory SET qty_left = ?1, state = ?2 WHERE id = ?3').bind(left, state, id).run()
}

const list = async (env) => ({
  ok: true,
  items: (await env.DB.prepare('SELECT * FROM inventory ORDER BY id').all()).results,
})

export async function onRequestGet({ env }) {
  return Response.json(await list(env))
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const row = {}
  for (const k of FIELDS) { const v = val(k, b[k]); if (v !== undefined) row[k] = v }
  if (!row.item) return bad('missing-item')
  const cols = Object.keys(row)
  const { meta } = await env.DB.prepare(
    `INSERT INTO inventory (${cols.join(',')}) VALUES (${cols.map((_, i) => `?${i + 1}`).join(',')})`
  ).bind(...cols.map((c) => row[c])).run()
  await finalize(env, meta.last_row_id)
  return Response.json(await list(env))
}

export async function onRequestPatch({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  const sets = []
  const vals = []
  for (const k of FIELDS) {
    if (!(k in b)) continue
    const v = val(k, b[k])
    sets.push(`${k} = ?${vals.length + 1}`)
    vals.push(v === undefined ? null : v)
  }
  if (!sets.length) return bad('no-fields')
  vals.push(id)
  const { meta } = await env.DB.prepare(`UPDATE inventory SET ${sets.join(', ')} WHERE id = ?${vals.length}`)
    .bind(...vals).run()
  if (!meta.changes) return bad('not-found', 404)
  await finalize(env, id)
  return Response.json(await list(env))
}

export async function onRequestDelete({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  await env.DB.prepare('DELETE FROM inventory WHERE id = ?1').bind(id).run()
  return Response.json(await list(env))
}
