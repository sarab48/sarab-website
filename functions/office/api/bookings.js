/*
  /office/api/bookings — GET: filtered list · POST: create (auto-assigns the next
  SARAB-NNN number, continuing the owner's numbering). Auth: ../_middleware.js.
*/
import { normalizeCity } from '../../../shared/intel.js'
import { syncBookingCalendar } from '../../../shared/gcal.js'
import { displayName, nameSql } from '../../../shared/names.js'

// Fields the office may write. Numbers are coerced; anything else is text.
const WRITABLE = [
  'booked_at', 'added_at', 'event_date', 'occasion', 'first_name', 'last_name', 'name', 'phone',
  'email', 'city', 'client_city', 'region', 'venue', 'start_time', 'end_time', 'hours', 'guests',
  'package', 'price', 'deposit', 'remaining', 'payment_status', 'arrival_time',
  'staff', 'staff_count', 'lead_source', 'interest', 'callback', 'notes', 'status',
  'cancelled_at', 'cancel_decision', 'cancel_reason',
  'extra_hours', 'extra_amount', 'extra_note',
]

// Statuses that mean "actually booked" — reaching one of them stamps booked_at.
export const BOOKED_STATUSES = ['مؤكد', 'دفع العربون', 'مكتمل']
// The cancelled status. A booking that cancels keeps it; the cancellation record
// (cancelled_at / cancel_decision / cancel_reason, 2026-09-03) lives beside it so the
// office can find clients who paid an advance and decide what happens to it.
export const CANCELLED = 'ملغي'
// What happens to the advance after a cancellation: kept by SARAB, or refunded to the
// client (the refund itself is a ledger row — payments.js kind استرداد). NULL = undecided.
export const CANCEL_DECISIONS = ['kept', 'refund']
const NUMERIC = new Set(['hours', 'price', 'deposit', 'remaining', 'staff_count', 'extra_hours', 'extra_amount'])

// What the client owes in total (2026-09-16): the agreed price plus whatever was charged
// on the spot for extra time. NULL when no price is tracked — exactly like `price` was —
// so every COALESCE(... , deposit) fallback keeps working. `p` prefixes a table alias.
export const totalSql = (p = '') => `(${p}price + COALESCE(${p}extra_amount, 0))`

export function cleanValue(key, v) {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (key === 'callback') return v === true || v === 1 || v === '1' ? 1 : 0
  if (key === 'cancel_decision') return CANCEL_DECISIONS.includes(String(v)) ? String(v) : null
  if (key === 'staff_count') {
    const n = Math.round(Number(v))
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  if (NUMERIC.has(key)) {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return String(v).trim().slice(0, 500) || null
}

// Next SARAB-NNN, continuing the workbook numbering.
async function nextBookingNo(env) {
  const { results } = await env.DB.prepare(
    "SELECT MAX(CAST(substr(booking_no, 7) AS INTEGER)) AS m FROM bookings WHERE booking_no LIKE 'SARAB-%'"
  ).all()
  return `SARAB-${String((results[0]?.m || 0) + 1).padStart(3, '0')}`
}

// Leads that arrive on their own (website form, WhatsApp) start as استفسار with no number —
// numbering is for real bookings. The moment such a lead becomes one (مؤكد / دفع العربون /
// مكتمل) it gets the next SARAB-NNN, so it carries an identity in the owner's system and can
// be linked from the finance tables. Idempotent: an existing number is never changed. Retries
// on the UNIQUE clash two concurrent saves could produce. Mutates `row` and returns it.
export async function ensureBookingNo(env, row) {
  if (!row || row.booking_no || !BOOKED_STATUSES.includes(row.status)) return row
  for (let attempt = 0; attempt < 3; attempt++) {
    const no = await nextBookingNo(env)
    try {
      const { meta } = await env.DB.prepare(
        'UPDATE bookings SET booking_no = ?1 WHERE id = ?2 AND booking_no IS NULL'
      ).bind(no, row.id).run()
      if (meta.changes) row.booking_no = no
      return row
    } catch { /* someone took that number between the read and the write — try the next one */ }
  }
  return row
}

// When a booking becomes مكتمل, make sure it has a row in the per-event P&L table
// (أرباح ومصاريف المناسبات) seeded from the booking — so the owner only fills in the
// costs. Idempotent: keyed on booking_no, so re-saving a completed booking (or one that
// was already given a finance row / imported) never creates a duplicate. Callers run
// ensureBookingNo first: without a number there is nothing to key on and the event would
// silently never reach the finance list.
export async function ensureEventFinance(env, row) {
  if (!row || row.status !== 'مكتمل' || !row.booking_no) return
  const existing = await env.DB.prepare('SELECT id FROM event_finances WHERE booking_no = ?1')
    .bind(row.booking_no).first()
  if (existing) return
  const price = Number(row.price)
  const priceVal = Number.isFinite(price) ? price : null
  const extra = Number(row.extra_amount)
  const total = priceVal != null ? priceVal + (Number.isFinite(extra) ? extra : 0) : null
  const remaining = Number(row.remaining)   // unrecorded → 0 (nothing left outstanding)
  const deposit = Number(row.deposit)
  // Collected so far: for a completed event, the total owed (price + extra time) minus any
  // balance still outstanding (so a fully-paid event seeds paid = total); if the price
  // itself isn't recorded, fall back to the deposit we do know about. The row's own
  // `price` stays the agreed base price — the extra is read from the booking.
  const paid = total != null
    ? total - (Number.isFinite(remaining) ? remaining : 0)
    : Number.isFinite(deposit) ? deposit : null
  // «ساعات» is the owner's info field (hours worked, never a cost since 2026-09-16) —
  // prefilled as booked + extra hours when the booking knows either.
  const hrs = Number(row.hours), xh = Number(row.extra_hours)
  const hoursWorked = Number.isFinite(hrs) || Number.isFinite(xh)
    ? (Number.isFinite(hrs) ? hrs : 0) + (Number.isFinite(xh) ? xh : 0) : null
  // net_profit seeds from what was actually received (paid), matching the finance rule.
  await env.DB.prepare(
    `INSERT INTO event_finances
       (booking_no, event_date, city, client, price, paid, hours_cost, total_expenses, net_profit)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)`
  ).bind(row.booking_no, row.event_date || null, row.city || null, displayName(row) || null,
    priceVal, paid, hoursWorked, paid ?? 0).run()
}

// When the owner books a client in a city the price list doesn't know yet, remember it:
// the city joins the list at the price set for that client — reusing a tier that already
// carries that exact price, else creating one — so the next client from the same city
// gets the اعتماد السعر suggestion automatically. Normalized name matching (same rule as
// the intel city match) keeps "الناصرة"/"ناصرة" from becoming two cities. Returns the
// city name when it was added, else null.
export async function ensureCityPrice(env, row) {
  const name = String(row?.city || '').trim().slice(0, 100)
  const price = Number(row?.price)
  if (!name || !Number.isFinite(price) || price <= 0) return null
  const { results } = await env.DB.prepare('SELECT name FROM cities').all()
  const norm = normalizeCity(name)
  if (results.some((c) => normalizeCity(c.name) === norm)) return null
  let tier = await env.DB.prepare('SELECT id FROM price_tiers WHERE price = ?1 ORDER BY id LIMIT 1')
    .bind(price).first()
  if (!tier) {
    const ins = await env.DB.prepare('INSERT INTO price_tiers (name, price) VALUES (?1, ?2)')
      .bind(`فئة ${price} ₪`, price).run()
    tier = { id: ins.meta.last_row_id }
  }
  try {
    await env.DB.prepare('INSERT INTO cities (name, tier_id) VALUES (?1, ?2)').bind(name, tier.id).run()
  } catch { return null } // UNIQUE race — someone beat us to it, which is fine
  return name
}

// ---------- مناسبات العميل — one client, several dates (2026-10-20) ----------
// A group is the set of bookings sharing `group_id`; the token is the id of the booking
// the group was started from and stays valid as a token even if that row is deleted.
// NULL = a booking on its own. Each date remains a complete booking (its own city price,
// hours, staff, payments, P&L row, calendar entry, clash flag) — the group only says
// "same client", so the office can show and total them together.

// Resolve a `group_with` reference: a booking id (number / "#12"), or a SARAB number in
// any of the ways the owner types it ("SARAB-012", "sarab-12", "12").
export async function findBookingRef(env, ref) {
  if (ref == null || ref === '') return null
  const s = String(ref).trim()
  let m
  if (typeof ref === 'number' || (m = s.match(/^#(\d+)$/))) {
    return env.DB.prepare('SELECT id, group_id, booking_no FROM bookings WHERE id = ?1')
      .bind(Number(m ? m[1] : ref)).first()
  }
  const no = (m = s.match(/^(?:SARAB-?)?(\d{1,6})$/i)) ? `SARAB-${m[1].padStart(3, '0')}` : s.toUpperCase()
  return env.DB.prepare('SELECT id, group_id, booking_no FROM bookings WHERE booking_no = ?1').bind(no).first()
}

// The group id of `anchor`, starting a group on it when it has none yet.
export async function groupIdOf(env, anchor) {
  if (anchor.group_id) return anchor.group_id
  await env.DB.prepare('UPDATE bookings SET group_id = ?1 WHERE id = ?1 AND group_id IS NULL').bind(anchor.id).run()
  return anchor.id
}

// Link booking `id` with the booking `ref` points at. An existing group keeps its token:
// a lone booking joins the other's group (whichever side it is on); when both already
// have groups, `id`'s group merges into `ref`'s.
export async function linkBooking(env, id, ref) {
  const anchor = await findBookingRef(env, ref)
  if (!anchor) return { ok: false, error: 'link-target-not-found' }
  if (anchor.id === id) return { ok: false, error: 'link-self' }
  const me = await env.DB.prepare('SELECT id, group_id FROM bookings WHERE id = ?1').bind(id).first()
  if (!me) return { ok: false, error: 'not-found' }
  if (me.group_id && !anchor.group_id) {
    await env.DB.prepare('UPDATE bookings SET group_id = ?1 WHERE id = ?2').bind(me.group_id, anchor.id).run()
    return { ok: true, group_id: me.group_id }
  }
  const gid = await groupIdOf(env, anchor)
  if (me.group_id === gid) return { ok: true, group_id: gid }
  if (me.group_id) await env.DB.prepare('UPDATE bookings SET group_id = ?1 WHERE group_id = ?2').bind(gid, me.group_id).run()
  else await env.DB.prepare('UPDATE bookings SET group_id = ?1 WHERE id = ?2').bind(gid, id).run()
  return { ok: true, group_id: gid }
}

// Take booking `id` out of its group. A group left with a single member dissolves.
export async function unlinkBooking(env, id) {
  const me = await env.DB.prepare('SELECT id, group_id FROM bookings WHERE id = ?1').bind(id).first()
  if (!me) return { ok: false, error: 'not-found' }
  if (!me.group_id) return { ok: true, group_id: null }
  await env.DB.prepare('UPDATE bookings SET group_id = NULL WHERE id = ?1').bind(id).run()
  await tidyGroup(env, me.group_id)
  return { ok: true, group_id: null }
}

// A group of one is no group: clear the token so the 🔗 marker never points nowhere.
export async function tidyGroup(env, gid) {
  if (!gid) return
  await env.DB.prepare(`UPDATE bookings SET group_id = NULL
                        WHERE group_id = ?1 AND (SELECT COUNT(*) FROM bookings WHERE group_id = ?1) < 2`).bind(gid).run()
}

const GROUP_COLS = `id, booking_no, group_id, event_date, occasion, city, venue, status, start_time,
                    price, extra_amount, ${totalSql()} AS total, deposit, remaining, phone, ${nameSql()} AS name`

// Every booking of the group, soonest date first (undated last) — what the drawer strip lists.
export async function groupRows(env, gid) {
  if (!gid) return []
  return (await env.DB.prepare(`SELECT ${GROUP_COLS} FROM bookings WHERE group_id = ?1
                                ORDER BY (event_date IS NULL), event_date, id`).bind(gid).all()).results
}

// Other bookings carrying this booking's phone (last 9 digits, however it was typed) that
// are not in its group yet — the clients the owner booked twice before linking existed.
// A suggestion only: the same number can belong to a hall manager booking for others.
export async function samePhoneRows(env, row) {
  const digits = String(row?.phone || '').replace(/\D/g, '')
  if (digits.length < 9) return []
  return (await env.DB.prepare(`SELECT ${GROUP_COLS} FROM bookings
     WHERE id != ?1 AND (group_id IS NULL OR group_id != ?2)
       AND replace(replace(replace(replace(COALESCE(phone, ''), ' ', ''), '-', ''), '+', ''), '.', '') LIKE '%' || ?3
     ORDER BY (event_date IS NULL), event_date DESC, id DESC LIMIT 8`)
    .bind(row.id, row.group_id || 0, digits.slice(-9)).all()).results
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
  // One client's dates (the 🔗 chip in the grid): every booking sharing that group token.
  const group = parseInt(u.searchParams.get('group') || '', 10)
  if (group) { where.push('group_id = ?'); params.push(group) }

  const order = u.searchParams.get('order') === 'new'
    ? 'id DESC'
    : "(event_date IS NULL) ASC, event_date ASC, id ASC"
  const limit = Math.min(parseInt(u.searchParams.get('limit') || '500', 10) || 500, 1000)

  const sql = `SELECT * FROM bookings
               ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY ${order} LIMIT ${limit}`
  const [list, conf, groups] = await Promise.all([
    env.DB.prepare(sql).bind(...params).all(),
    // Dates carrying 2+ live bookings. Severity depends on whether one of them is an
    // actual confirmed booking (مؤكد/مكتمل): that's a real double-booking risk (red);
    // several unconfirmed requests on the same date are only competition (amber).
    env.DB.prepare(`SELECT event_date,
                      MAX(CASE WHEN status IN ('مؤكد','مكتمل') THEN 1 ELSE 0 END) AS confirmed
                    FROM bookings
                    WHERE event_date IS NOT NULL AND status != 'ملغي'
                    GROUP BY event_date HAVING COUNT(*) > 1`).all(),
    // How many dates each client group holds — counted over the whole table, not the
    // filtered page, so a 🔗 3 chip is right even when the list shows one of the three.
    env.DB.prepare('SELECT group_id, COUNT(*) AS n FROM bookings WHERE group_id IS NOT NULL GROUP BY group_id').all(),
  ])
  const gn = new Map(groups.results.map((g) => [g.group_id, g.n]))
  for (const r of list.results) r.group_n = r.group_id ? (gn.get(r.group_id) || 1) : 0
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
  row.added_at ||= new Date().toISOString().slice(0, 10)
  if (!row.booked_at && BOOKED_STATUSES.includes(row.status)) row.booked_at = row.added_at
  // The cancellation record only exists on a cancelled booking.
  if (row.status === CANCELLED) row.cancelled_at ||= row.added_at
  else { row.cancelled_at = null; row.cancel_decision = null }

  // «تاريخ آخر لهذا العميل»: the new date joins the group of the booking it was added from.
  if (body.group_with != null && body.group_with !== '') {
    const anchor = await findBookingRef(env, body.group_with)
    if (!anchor) return Response.json({ ok: false, error: 'link-target-not-found' }, { status: 400 })
    row.group_id = await groupIdOf(env, anchor)
  }

  row.booking_no = await nextBookingNo(env)
  row.source = 'office'

  const cols = Object.keys(row)
  const sql = `INSERT INTO bookings (${cols.join(',')})
               VALUES (${cols.map((_, i) => `?${i + 1}`).join(',')})`
  const { meta } = await env.DB.prepare(sql).bind(...cols.map((c) => row[c])).run()
  const created = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(meta.last_row_id).first()
  await ensureEventFinance(env, created)
  const cityAdded = await ensureCityPrice(env, created)
  // Added straight in as a real booking → straight into the owner's Google Calendar.
  const calendar = await syncBookingCalendar(env, created, { onCalendar: BOOKED_STATUSES.includes(created.status) })
  return Response.json({ ok: true, row: created, city_added: cityAdded, calendar, group: await groupRows(env, created.group_id) })
}
