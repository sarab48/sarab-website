/*
  /office/api/finance — الأرباح والمصاريف (per-event) + مصاريف عامة + finance KPIs.
  Writes take { table: 'event' | 'general', id?, ...fields }. For event rows the
  totals are recomputed server-side: total_expenses = Σ cost fields,
  net_profit = paid − total_expenses (owner's rule: net income counts the money
  actually received, not the demanded price).
  Auth: ../_middleware.js.
*/
import { ensureBookingNo, ensureEventFinance } from './bookings.js'
import { nameSql } from '../../../shared/names.js'

// photos_taken + bank are the owner's info-only fields — accepted and stored, but
// deliberately absent from COSTS so they never move total_expenses or net_profit.
const EV_FIELDS = ['booking_no', 'event_date', 'city', 'client', 'price', 'paid', 'worker1',
  'worker2', 'hours_cost', 'transport', 'printing', 'other', 'tax_pct', 'tax_value',
  'photos_taken', 'bank']
const EV_NUM = new Set(['price', 'paid', 'worker1', 'worker2', 'hours_cost', 'transport',
  'printing', 'other', 'tax_pct', 'tax_value', 'photos_taken', 'bank'])
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

// collected per booking, in SQL: what its price minus what it still owes; with no
// price tracked, the deposit is what we know arrived. Same rule the tab's «محصّل»
// column and the payments backfill used — the three can never disagree.
const COLLECTED = `COALESCE(price - COALESCE(remaining, 0), COALESCE(deposit, 0))`

async function payload(env) {
  const [ev, gen, kpi, adv, miss, byYear, mPay, mEvExp, mGenExp, mEvents, mExpected, evPay] = await env.DB.batch([
    // The client column follows the booking (linked by SARAB-NNN): the owner-written
    // first+last wins over whatever the row was seeded with — WhatsApp-profile names
    // stop showing the moment the owner names the client on the booking itself. The
    // stored client is only touched when the owner edits the row, never rewritten here.
    env.DB.prepare(`SELECT f.*, COALESCE(NULLIF(TRIM(COALESCE(b.first_name, '') || ' ' ||
                             COALESCE(b.last_name, '')), ''), f.client, b.name) AS client_display
                    FROM event_finances f
                    LEFT JOIN bookings b ON b.booking_no = f.booking_no
                    ORDER BY (f.event_date IS NULL), f.event_date DESC, f.id DESC`),
    env.DB.prepare('SELECT * FROM general_expenses ORDER BY (date IS NULL), date DESC, id DESC'),
    env.DB.prepare(`SELECT
      (SELECT COALESCE(SUM(price),0)   FROM bookings WHERE status IN ('مؤكد','دفع العربون','مكتمل')) AS revenue,
      (SELECT COALESCE(SUM(deposit),0) FROM bookings WHERE status IN ('مؤكد','دفع العربون','مكتمل')) AS collected,
      (SELECT COALESCE(SUM(paid),0)    FROM event_finances) AS ev_paid,
      (SELECT COALESCE(SUM(total_expenses),0) FROM event_finances) AS ev_expenses,
      (SELECT COALESCE(SUM(amount),0)  FROM general_expenses) AS gen_expenses`),
    // Advances (عربون) already collected on confirmed bookings that haven't happened yet —
    // cash in hand. Listed on its own so the owner sees collected vs. still-to-collect,
    // separate from the completed-events P&L (which handles done events).
    env.DB.prepare(`SELECT booking_no, event_date, city, ${nameSql()} AS client, price, deposit, remaining, status
                    FROM bookings
                    WHERE status IN ('مؤكد','دفع العربون') AND COALESCE(deposit, 0) > 0
                    ORDER BY (event_date IS NULL), event_date ASC, id ASC`),
    // Completed events with no P&L row — normally none (one is seeded the moment a booking
    // turns مكتمل), so anything here is a gap: an event the owner would otherwise be
    // calculating without. A booking with no booking_no can't match a finance row at all,
    // hence the NULL-safe comparison. Surfaced in the tab with a one-click add.
    env.DB.prepare(`SELECT b.id, b.booking_no, b.event_date, b.city, ${nameSql('b.')} AS client,
                           b.price, b.deposit, b.remaining
                    FROM bookings b
                    WHERE b.status = 'مكتمل'
                      AND NOT EXISTS (SELECT 1 FROM event_finances f
                                      WHERE f.booking_no IS NOT NULL AND f.booking_no = b.booking_no)
                    ORDER BY (b.event_date IS NULL), b.event_date DESC, b.id DESC`),
    // السنوات مالياً — the owner's headline question, per event year: how many confirmed
    // bookings, what they're worth (expected), what actually arrived (collected), what is
    // still owed (due), and how many haven't happened yet. دفع العربون kept apart on the
    // owner's rule (deposit paid ≠ confirmed) with its own count + cash-in-hand.
    env.DB.prepare(`SELECT substr(event_date, 1, 4) AS k,
      SUM(CASE WHEN status IN ('مؤكد','مكتمل') THEN 1 ELSE 0 END) AS n,
      SUM(CASE WHEN status IN ('مؤكد','مكتمل') AND event_date >= date('now') THEN 1 ELSE 0 END) AS upcoming,
      COALESCE(SUM(CASE WHEN status IN ('مؤكد','مكتمل') THEN price END), 0) AS expected,
      COALESCE(SUM(CASE WHEN status IN ('مؤكد','مكتمل') THEN ${COLLECTED} END), 0) AS collected,
      COALESCE(SUM(CASE WHEN status IN ('مؤكد','مكتمل') THEN remaining END), 0) AS due,
      SUM(CASE WHEN status = 'دفع العربون' THEN 1 ELSE 0 END) AS dep_n,
      COALESCE(SUM(CASE WHEN status = 'دفع العربون' THEN deposit END), 0) AS dep_paid
      FROM bookings
      WHERE status IN ('مؤكد','مكتمل','دفع العربون')
        AND event_date IS NOT NULL AND length(event_date) >= 4
      GROUP BY k ORDER BY k DESC`),
    // الأشهر — four month-keyed slices merged below into one cash picture per month:
    // payments received (the ledger, by paid_on), event expenses (by event month),
    // general expenses (by their date), events held (confirmed, by event month).
    env.DB.prepare(`SELECT substr(paid_on, 1, 7) AS k, SUM(amount) AS v
                    FROM payments WHERE paid_on IS NOT NULL GROUP BY k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k, SUM(COALESCE(total_expenses, 0)) AS v
                    FROM event_finances WHERE event_date IS NOT NULL AND length(event_date) >= 7
                    GROUP BY k`),
    env.DB.prepare(`SELECT substr(date, 1, 7) AS k, SUM(COALESCE(amount, 0)) AS v
                    FROM general_expenses WHERE date IS NOT NULL AND length(date) >= 7
                    GROUP BY k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k, COUNT(*) AS v
                    FROM bookings
                    WHERE status IN ('مؤكد','مكتمل')
                      AND event_date IS NOT NULL AND length(event_date) >= 7
                    GROUP BY k`),
    env.DB.prepare(`SELECT substr(event_date, 1, 7) AS k, COALESCE(SUM(price), 0) AS v
                    FROM bookings
                    WHERE status IN ('مؤكد','مكتمل')
                      AND event_date IS NOT NULL AND length(event_date) >= 7
                    GROUP BY k`),
    // Every ledger payment keyed by its booking's SARAB number — the events P&L rows
    // link by booking_no, so each expanded row can list what the client actually paid
    // and how (kind — amount — method), straight from the same ledger the drawer edits.
    env.DB.prepare(`SELECT b.booking_no, p.kind, p.amount, p.method, p.paid_on, p.payer, p.method_ref, p.note
                    FROM payments p JOIN bookings b ON b.id = p.booking_id
                    WHERE b.booking_no IS NOT NULL
                    ORDER BY b.booking_no, (p.paid_on IS NULL), p.paid_on, p.id`),
  ])
  // Merge the month slices; net follows the owner's rule (2026-08-12): money actually
  // received that month minus the EVENT expenses only — general expenses stay out of
  // the monthly net for now (they keep their own section) and may join later.
  const months = new Map()
  const fold = (rows, field) => {
    for (const r of rows) {
      if (!/^\d{4}-\d{2}$/.test(r.k || '')) continue
      const o = months.get(r.k) || { k: r.k, collected: 0, ev_expenses: 0, gen_expenses: 0, events: 0, expected: 0 }
      o[field] += Number(r.v) || 0
      months.set(r.k, o)
    }
  }
  fold(mPay.results, 'collected')
  fold(mEvExp.results, 'ev_expenses')
  fold(mGenExp.results, 'gen_expenses')
  fold(mEvents.results, 'events')
  fold(mExpected.results, 'expected')
  const byMonth = [...months.values()]
    .map((m) => ({ ...m, net: m.collected - m.ev_expenses }))
    .sort((a, b) => b.k.localeCompare(a.k))
  const payByBooking = {}
  for (const p of evPay.results) {
    const { booking_no, ...rest } = p
    if (!payByBooking[booking_no]) payByBooking[booking_no] = []
    payByBooking[booking_no].push(rest)
  }
  return {
    ok: true,
    events: ev.results.map(({ client_display, ...r }) => ({ ...r, client: client_display ?? r.client })),
    general: gen.results,
    kpi: kpi.results[0],
    advances: adv.results,
    missing: miss.results,
    byYear: byYear.results,
    byMonth,
    payByBooking,
  }
}

async function recomputeEvent(env, id) {
  const r = await env.DB.prepare('SELECT * FROM event_finances WHERE id = ?1').bind(id).first()
  if (!r) return
  const total = COSTS.reduce((s, k) => s + (Number(r[k]) || 0), 0)
  await env.DB.prepare('UPDATE event_finances SET total_expenses = ?1, net_profit = ?2 WHERE id = ?3')
    .bind(total, (Number(r.paid) || 0) - total, id).run()
}

export async function onRequestGet({ env }) {
  return Response.json(await payload(env))
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  // "أضف للمالية" on a completed booking the list is missing: seed the row straight from the
  // booking, through the very same helpers the automatic path uses (numbering + idempotent
  // insert), so a manual catch-up and an automatic seed can never disagree.
  if (b.from_booking) {
    const bk = await env.DB.prepare("SELECT * FROM bookings WHERE id = ?1 AND status = 'مكتمل'")
      .bind(Number(b.from_booking)).first()
    if (!bk) return bad('booking-not-found', 404)
    await ensureBookingNo(env, bk)
    await ensureEventFinance(env, bk)
    return Response.json(await payload(env))
  }
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
