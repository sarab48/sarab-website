/*
  /office/api/bookings — GET: filtered list · POST: create (auto-assigns the next
  SARAB-NNN number, continuing the owner's numbering). Auth: ../_middleware.js.
*/

// Fields the office may write. Numbers are coerced; anything else is text.
const WRITABLE = [
  'booked_at', 'event_date', 'occasion', 'first_name', 'last_name', 'name', 'phone',
  'email', 'city', 'region', 'venue', 'start_time', 'end_time', 'hours', 'guests',
  'package', 'price', 'deposit', 'remaining', 'payment_status', 'arrival_time',
  'lead_source', 'interest', 'callback', 'notes', 'status',
]
const NUMERIC = new Set(['hours', 'price', 'deposit', 'remaining'])

export function cleanValue(key, v) {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (key === 'callback') return v === true || v === 1 || v === '1' ? 1 : 0
  if (NUMERIC.has(key)) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return String(v).trim().slice(0, 500) || null
}

// When a booking becomes مكتمل, make sure it has a row in the per-event P&L table
// (أرباح ومصاريف المناسبات) seeded from the booking — so the owner only fills in the
// costs. Idempotent: keyed on booking_no, so re-saving a completed booking (or one that
// was already given a finance row / imported) never creates a duplicate.
export async function ensureEventFinance(env, row) {
  if (!row || row.status !== 'مكتمل' || !row.booking_no) return
  const existing = await env.DB.prepare('SELECT id FROM event_finances WHERE booking_no = ?1')
    .bind(row.booking_no).first()
  if (existing) return
  const price = Number(row.price)
  const priceVal = Number.isFinite(price) ? price : null
  const remaining = Number(row.remaining)   // unrecorded → 0 (nothing left outstanding)
  const deposit = Number(row.deposit)
  // Collected so far: for a completed event, the price minus any balance still outstanding
  // (so a fully-paid event seeds paid = price); if the price itself isn't recorded, fall
  // back to the deposit we do know about.
  const paid = priceVal != null
    ? priceVal - (Number.isFinite(remaining) ? remaining : 0)
    : Number.isFinite(deposit) ? deposit : null
  // net_profit seeds from what was actually received (paid), matching the finance rule.
  await env.DB.prepare(
    `INSERT INTO event_finances
       (booking_no, event_date, city, client, price, paid, total_expenses, net_profit)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)`
  ).bind(row.booking_no, row.event_date || null, row.city || null, row.name || null,
    priceVal, paid, paid ?? 0).run()
}

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const where = []
  const params = []

  const q = (u.searchParams.get('q') || '').trim()
  if (q) {
    const like = `%${q}%`
    where.push(`(booking_no LIKE ? OR name LIKE ? OR first_name LIKE ? OR last_name LIKE ?
                 OR phone LIKE ? OR city LIKE ? OR venue LIKE ? OR occasion LIKE ?)`)
    params.push(like, like, like, like, like, like, like, like)
  }
  const statuses = (u.searchParams.get('status') || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (statuses.length) { where.push(`status IN (${statuses.map(() => '?').join(',')})`); params.push(...statuses) }
  const xstatuses = (u.searchParams.get('xstatus') || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (xstatuses.length) { where.push(`status NOT IN (${xstatuses.map(() => '?').join(',')})`); params.push(...xstatuses) }
  const month = u.searchParams.get('month')
  if (month) { where.push('substr(event_date, 1, 7) = ?'); params.push(month) }
  // Exact-day availability check (office "فحص تاريخ"): everything booked on one date.
  const date = u.searchParams.get('date')
  if (date) { where.push('event_date = ?'); params.push(date.slice(0, 20)) }
  if (u.searchParams.get('upcoming') === '1') where.push("event_date >= date('now')")
  if (u.searchParams.get('nopast') === '1') where.push("(event_date IS NULL OR event_date >= date('now'))")
  if (u.searchParams.get('callback') === '1') where.push('callback = 1')
  const source = u.searchParams.get('source')
  if (source) { where.push('source = ?'); params.push(source) }

  const order = u.searchParams.get('order') === 'new'
    ? 'id DESC'
    : "(event_date IS NULL) ASC, event_date ASC, id ASC"
  const limit = Math.min(parseInt(u.searchParams.get('limit') || '500', 10) || 500, 1000)

  const sql = `SELECT * FROM bookings
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY ${order} LIMIT ${limit}`
  const [list, conf] = await Promise.all([
    env.DB.prepare(sql).bind(...params).all(),
    // Dates carrying 2+ live bookings. Severity depends on whether one of them is an
    // actual confirmed booking (مؤكد/مكتمل): that's a real double-booking risk (red);
    // several unconfirmed requests on the same date are only competition (amber).
    env.DB.prepare(`SELECT event_date,
                      MAX(CASE WHEN status IN ('مؤكد','مكتمل') THEN 1 ELSE 0 END) AS confirmed
                    FROM bookings
                    WHERE event_date IS NOT NULL AND status != 'ملغي'
                    GROUP BY event_date HAVING COUNT(*) > 1`).all(),
  ])
  return Response.json({
    ok: true,
    rows: list.results,
    conflict_dates: conf.results.map((r) => r.event_date),
    confirmed_clash_dates: conf.results.filter((r) => r.confirmed).map((r) => r.event_date),
  })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'bad-json' }, { status: 400 }) }

  const row = {}
  for (const k of WRITABLE) {
    const v = cleanValue(k, body[k])
    if (v !== undefined) row[k] = v
  }
  if (!row.name && (row.first_name || row.last_name)) {
    row.name = [row.first_name, row.last_name].filter(Boolean).join(' ')
  }
  if (!row.name && !row.phone) return Response.json({ ok: false, error: 'missing-fields' }, { status: 400 })
  row.status ||= 'استفسار'

  // Next SARAB-NNN, continuing the workbook numbering.
  const { results } = await env.DB.prepare(
    "SELECT MAX(CAST(substr(booking_no, 7) AS INTEGER)) AS m FROM bookings WHERE booking_no LIKE 'SARAB-%'"
  ).all()
  const next = (results[0]?.m || 0) + 1
  row.booking_no = `SARAB-${String(next).padStart(3, '0')}`
  row.source = 'office'

  const cols = Object.keys(row)
  const sql = `INSERT INTO bookings (${cols.join(',')})
               VALUES (${cols.map((_, i) => `?${i + 1}`).join(',')})`
  const { meta } = await env.DB.prepare(sql).bind(...cols.map((c) => row[c])).run()
  const created = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(meta.last_row_id).first()
  await ensureEventFinance(env, created)
  return Response.json({ ok: true, row: created })
}
