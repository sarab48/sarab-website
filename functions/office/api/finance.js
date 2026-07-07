/*
  /office/api/finance — الأرباح والمصاريف (per-event) + مصاريف عامة + finance KPIs.
  Writes take { table: 'event' | 'general', id?, ...fields }. For event rows the
  totals are recomputed server-side: total_expenses = Σ cost fields,
  net_profit = price − total_expenses (the workbook's own formula).
  Auth: ../_middleware.js.
*/

const EV_FIELDS = ['booking_no', 'event_date', 'city', 'client', 'price', 'paid', 'worker1',
  'worker2', 'hours_cost', 'transport', 'printing', 'other', 'tax_pct', 'tax_value']
const EV_NUM = new Set(['price', 'paid', 'worker1', 'worker2', 'hours_cost', 'transport',
  'printing', 'other', 'tax_pct', 'tax_value'])
const GEN_FIELDS = ['date', 'category', 'description', 'amount', 'method', 'notes']
const GEN_NUM = new Set(['amount'])
const COSTS = ['worker1', 'worker2', 'hours_cost', 'transport', 'printing', 'other', 'tax_value']

const bad = (error, status = 400) => Response.json({ ok: false, error }, { status })

const val = (k, v, nums) => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (nums.has(k)) { const n = Number(v); return Number.isFinite(n) ? n : null }
  return String(v).trim().slice(0, 300) || null
}

async function payload(env) {
  const [ev, gen, kpi, adv] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM event_finances ORDER BY (event_date IS NULL), event_date DESC, id DESC'),
    env.DB.prepare('SELECT * FROM general_expenses ORDER BY (date IS NULL), date DESC, id DESC'),
    env.DB.prepare(`SELECT
      (SELECT COALESCE(SUM(price),0)   FROM bookings WHERE status IN ('مؤكد','دفع العربون','مكتمل')) AS revenue,
      (SELECT COALESCE(SUM(deposit),0) FROM bookings WHERE status IN ('مؤكد','دفع العربون','مكتمل')) AS collected,
      (SELECT COALESCE(SUM(total_expenses),0) FROM event_finances) AS ev_expenses,
      (SELECT COALESCE(SUM(amount),0)  FROM general_expenses) AS gen_expenses`),
    // Advances (عربون) already collected on confirmed bookings that haven't happened yet —
    // cash in hand. Listed on its own so the owner sees collected vs. still-to-collect,
    // separate from the completed-events P&L (which handles done events).
    env.DB.prepare(`SELECT booking_no, event_date, city, name AS client, price, deposit, remaining, status
                    FROM bookings
                    WHERE status IN ('مؤكد','دفع العربون') AND COALESCE(deposit, 0) > 0
                    ORDER BY (event_date IS NULL), event_date ASC, id ASC`),
  ])
  return { ok: true, events: ev.results, general: gen.results, kpi: kpi.results[0], advances: adv.results }
}

async function recomputeEvent(env, id) {
  const r = await env.DB.prepare('SELECT * FROM event_finances WHERE id = ?1').bind(id).first()
  if (!r) return
  const total = COSTS.reduce((s, k) => s + (Number(r[k]) || 0), 0)
  await env.DB.prepare('UPDATE event_finances SET total_expenses = ?1, net_profit = ?2 WHERE id = ?3')
    .bind(total, (Number(r.price) || 0) - total, id).run()
}

export async function onRequestGet({ env }) {
  return Response.json(await payload(env))
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const [fields, nums, table] = b.table === 'event'
    ? [EV_FIELDS, EV_NUM, 'event_finances']
    : b.table === 'general' ? [GEN_FIELDS, GEN_NUM, 'general_expenses'] : [null]
  if (!fields) return bad('unknown-table')
  const row = {}
  for (const k of fields) { const v = val(k, b[k], nums); if (v !== undefined) row[k] = v }
  if (!Object.values(row).some((v) => v !== null)) return bad('empty-row')
  const cols = Object.keys(row)
  const { meta } = await env.DB.prepare(
    `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map((_, i) => `?${i + 1}`).join(',')})`
  ).bind(...cols.map((c) => row[c])).run()
  if (b.table === 'event') await recomputeEvent(env, meta.last_row_id)
  return Response.json(await payload(env))
}

export async function onRequestPatch({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  const [fields, nums, table] = b.table === 'event'
    ? [EV_FIELDS, EV_NUM, 'event_finances']
    : b.table === 'general' ? [GEN_FIELDS, GEN_NUM, 'general_expenses'] : [null]
  if (!fields) return bad('unknown-table')
  const sets = []
  const vals = []
  for (const k of fields) {
    if (!(k in b)) continue
    const v = val(k, b[k], nums)
    sets.push(`${k} = ?${vals.length + 1}`)
    vals.push(v === undefined ? null : v)
  }
  if (!sets.length) return bad('no-fields')
  vals.push(id)
  const { meta } = await env.DB.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?${vals.length}`)
    .bind(...vals).run()
  if (!meta.changes) return bad('not-found', 404)
  if (b.table === 'event') await recomputeEvent(env, id)
  return Response.json(await payload(env))
}

export async function onRequestDelete({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  const table = b.table === 'event' ? 'event_finances' : b.table === 'general' ? 'general_expenses' : null
  if (!table || !id) return bad('invalid')
  await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(id).run()
  return Response.json(await payload(env))
}
