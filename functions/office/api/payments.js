/*
  /office/api/payments — سجل المدفوعات: one row per payment received on a booking.

  GET ?booking=ID  → that booking's payments + the booking row (the drawer's panel)
  GET              → the finance tab's view: recent ledger, Σ by month / by method,
                     KPIs, and المتأخرات (events already held that still owe money).
                     Ledger filters (the table will only grow): q= matches client /
                     payer / note / booking_no / method_ref, method=, kind=,
                     month=YYYY-MM — all narrow the `rows` list only; the sums, KPIs
                     and المتأخرات stay whole so the totals never silently shrink.
  POST / PATCH / DELETE → record / adjust / remove a payment.

  A payment records who actually paid when that isn't the booking's client (payer,
  2026-08-12) and the payment's paper trail (method_ref: bank account / transfer
  reference / check number) — the receipt automation will name the actual payer.

  إكرامية (tip, 2026-08-12): cash the owner wants counted in-hand but that is NOT the
  client's money against the booking — it never moves deposit/remaining/event P&L and
  the receipt automation must skip it (a tip is not part of the client's receipt). It
  does count in the ledger sums (byMonth/byMethod/KPIs): it is real cash received.

  The stored running totals keep working exactly as before — they are synced by exact
  deltas on every mutation, never rebuilt: recording a payment decrements
  bookings.remaining, an عربون also increments bookings.deposit, and the booking's
  event_finances row (if any) gets paid += amount with net_profit recomputed by the
  same rule finance.js enforces (net = paid − total_expenses). Deleting/editing
  reverses precisely. The owner's manual edits of those fields elsewhere stay allowed
  and untouched — the drawer shows both so any gap is visible instead of hidden.

  استرداد (refund, 2026-09-03): money handed BACK to the client — typically the advance
  of a booking that cancelled. Stored with a NEGATIVE amount whatever sign was sent, so
  every SUM(amount) in the finance views nets it out on its own (cash by month drops in
  the month it was paid back, the method bars, the ledger totals). Toward the booking it
  is the exact reverse of an advance: deposit and remaining move back by it, and so does
  the event's P&L paid. Recording one on a cancelled booking that has no decision yet
  marks its cancel_decision = 'refund' (bookings.js) — a refund IS the decision.

  A payment that carries an issued receipt (doc_number, future Invoice4U automation)
  can no longer be deleted or change amount/kind — a real tax document has to be
  undone with a credit note, not a row delete. Auth: ../_middleware.js.
*/
import { CANCELLED } from './bookings.js'

const bad = (error, status = 400) => Response.json({ ok: false, error }, { status })

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const txt = (v, max) => {
  if (v === undefined || v === null) return null
  return String(v).trim().slice(0, max) || null
}
const today = () => new Date().toISOString().slice(0, 10)

// A tip's effective amount toward the booking's totals is zero — it is extra cash on
// the side, not payment of the price.
const TIP = 'إكرامية'
const REFUND = 'استرداد'
const ADVANCE = 'عربون'
const eff = (kind, amount) => (kind === TIP ? 0 : amount)
// A refund is always negative money; the office types it as a plain number.
const signed = (kind, amount) => (kind === REFUND ? -Math.abs(amount) : amount)
// What moves العربون: an advance adds to it, a refund (negative) takes back from it.
const depositPart = (kind, amount) => (kind === ADVANCE || kind === REFUND ? amount : 0)

// Exact-delta sync of the running totals a payment mutation affects. remaining falls
// by the amount when it is tracked; a booking that never tracked remaining but has a
// price gets it derived from the ledger (price − Σ payments, computed AFTER the
// mutation so the subquery sees the new state). A NULL deposit only materialises when
// an عربون actually lands on it (the CASE keeps NULL as NULL otherwise).
async function applyDelta(env, bookingId, dAmount, dDeposit) {
  await env.DB.prepare(
    `UPDATE bookings SET
       deposit = CASE WHEN ?1 != 0 THEN COALESCE(deposit, 0) + ?1 ELSE deposit END,
       remaining = CASE
         WHEN remaining IS NOT NULL THEN remaining - ?2
         WHEN price IS NOT NULL THEN price - (SELECT COALESCE(SUM(amount), 0) FROM payments
                                              WHERE booking_id = ?3 AND COALESCE(kind, '') != 'إكرامية')
         ELSE NULL END
     WHERE id = ?3`
  ).bind(dDeposit, dAmount, bookingId).run()
  await env.DB.prepare(
    `UPDATE event_finances SET
       paid = COALESCE(paid, 0) + ?1,
       net_profit = COALESCE(paid, 0) + ?1 - COALESCE(total_expenses, 0)
     WHERE booking_no IS NOT NULL
       AND booking_no = (SELECT booking_no FROM bookings WHERE id = ?2)`
  ).bind(dAmount, bookingId).run()
}

async function bookingPayload(env, bookingId) {
  const [list, row] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM payments WHERE booking_id = ?1
                    ORDER BY (paid_on IS NULL), paid_on, id`).bind(bookingId),
    env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(bookingId),
  ])
  return { ok: true, payments: list.results, booking: row.results[0] || null }
}

const ROWS_LIMIT = 200

async function globalPayload(env, f = {}) {
  const conds = []
  const binds = []
  const add = (sql, v) => { binds.push(v); conds.push(sql.replace('?', `?${binds.length}`)) }
  if (f.month) add(`substr(p.paid_on, 1, 7) = ?`, f.month)
  if (f.method) add(`p.method = ?`, f.method)
  if (f.kind) add(`p.kind = ?`, f.kind)
  if (f.q) {
    const like = `%${f.q}%`
    // COALESCE per part: `first || ' ' || last` is NULL in SQLite when either half is
    // NULL, which silently dropped rows where the owner wrote only one of the two.
    conds.push(`(b.name LIKE ?${binds.length + 1}
      OR TRIM(COALESCE(b.first_name, '') || ' ' || COALESCE(b.last_name, '')) LIKE ?${binds.length + 1}
      OR p.payer LIKE ?${binds.length + 1} OR p.note LIKE ?${binds.length + 1}
      OR p.method_ref LIKE ?${binds.length + 1} OR b.booking_no LIKE ?${binds.length + 1})`)
    binds.push(like)
  }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : ''
  const [rows, matched, byMonth, byMethod, kpi, overdue] = await env.DB.batch([
    env.DB.prepare(`SELECT p.*, b.booking_no, b.name, b.first_name, b.last_name, b.city
                    FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id ${where}
                    ORDER BY (p.paid_on IS NULL), p.paid_on DESC, p.id DESC LIMIT ${ROWS_LIMIT}`)
      .bind(...binds),
    // Count + Σ of everything the filter matches, so the UI can total the whole match
    // and say "showing N of M" when the list is clipped.
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(p.amount), 0) AS s
                    FROM payments p LEFT JOIN bookings b ON b.id = p.booking_id ${where}`)
      .bind(...binds),
    env.DB.prepare(`SELECT substr(paid_on, 1, 7) AS k, SUM(amount) AS s, COUNT(*) AS n
                    FROM payments WHERE paid_on IS NOT NULL GROUP BY k ORDER BY k`),
    env.DB.prepare(`SELECT COALESCE(method, 'غير محدّدة') AS k, SUM(amount) AS s, COUNT(*) AS n
                    FROM payments GROUP BY k ORDER BY s DESC`),
    env.DB.prepare(`SELECT
      (SELECT COALESCE(SUM(amount), 0) FROM payments) AS total,
      (SELECT COUNT(*) FROM payments) AS n,
      (SELECT COALESCE(SUM(amount), 0) FROM payments
         WHERE substr(paid_on, 1, 7) = strftime('%Y-%m', 'now')) AS month_now,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE kind = 'إكرامية') AS tips,
      (SELECT COALESCE(-SUM(amount), 0) FROM payments WHERE amount < 0) AS refunds`),
    // Events that already happened and still owe money — nowhere else surfaces these
    // (the advances table and the التحليلات call list only look forward).
    env.DB.prepare(`SELECT id, booking_no, name, first_name, last_name, phone, city,
                           event_date, status, price, deposit, remaining
                    FROM bookings
                    WHERE status IN ('مؤكد','دفع العربون','مكتمل')
                      AND COALESCE(remaining, 0) > 0
                      AND event_date IS NOT NULL AND event_date < date('now')
                    ORDER BY event_date DESC`),
  ])
  return {
    ok: true,
    rows: rows.results,
    matched: matched.results[0],
    limit: ROWS_LIMIT,
    byMonth: byMonth.results,
    byMethod: byMethod.results,
    kpi: kpi.results[0],
    overdue: overdue.results,
  }
}

export async function onRequestGet({ request, env }) {
  const p = new URL(request.url).searchParams
  const booking = Number(p.get('booking'))
  if (booking) return Response.json(await bookingPayload(env, booking))
  return Response.json(await globalPayload(env, {
    q: txt(p.get('q'), 80),
    method: txt(p.get('method'), 60),
    kind: txt(p.get('kind'), 40),
    month: /^\d{4}-\d{2}$/.test(p.get('month') || '') ? p.get('month') : null,
  }))
}

export async function onRequestPost({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const bookingId = Number(b.booking_id)
  const amountIn = Number(b.amount)
  if (!bookingId) return bad('missing-booking')
  // Negative = a refund the owner records deliberately; zero records nothing.
  if (!Number.isFinite(amountIn) || amountIn === 0) return bad('bad-amount')
  const bk = await env.DB.prepare('SELECT id, status, cancel_decision FROM bookings WHERE id = ?1').bind(bookingId).first()
  if (!bk) return bad('booking-not-found', 404)
  const kind = txt(b.kind, 40) || 'دفعة'
  const amount = signed(kind, amountIn)
  const method = txt(b.method, 60)
  const paid_on = DATE_RE.test(String(b.paid_on || '')) ? b.paid_on : today()
  const note = txt(b.note, 300)
  const payer = txt(b.payer, 120)
  const method_ref = txt(b.method_ref, 180)
  await env.DB.prepare(
    `INSERT INTO payments (booking_id, amount, kind, method, paid_on, note, payer, method_ref)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(bookingId, amount, kind, method, paid_on, note, payer, method_ref).run()
  const dAmount = eff(kind, amount)
  if (dAmount) await applyDelta(env, bookingId, dAmount, depositPart(kind, amount))
  // Paying the advance back to a cancelled client settles the open question — unless
  // the owner had already decided to keep it (then this is a partial goodwill refund
  // and the decision stands).
  if (kind === REFUND && bk.status === CANCELLED && !bk.cancel_decision) {
    await env.DB.prepare("UPDATE bookings SET cancel_decision = 'refund' WHERE id = ?1").bind(bookingId).run()
  }
  return Response.json(await bookingPayload(env, bookingId))
}

export async function onRequestPatch({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  const old = await env.DB.prepare('SELECT * FROM payments WHERE id = ?1').bind(id).first()
  if (!old) return bad('not-found', 404)
  if (old.doc_number && ('amount' in b || 'kind' in b)) return bad('has-document')

  const amountIn = 'amount' in b ? Number(b.amount) : old.amount
  if (!Number.isFinite(amountIn) || amountIn === 0) return bad('bad-amount')
  const kind = 'kind' in b ? (txt(b.kind, 40) || 'دفعة') : old.kind
  // Kind flips keep the sign rule: into استرداد turns negative, out of it turns positive.
  const amount = kind === REFUND ? signed(kind, amountIn)
    : old.kind === REFUND && !('amount' in b) ? Math.abs(amountIn) : amountIn
  const method = 'method' in b ? txt(b.method, 60) : old.method
  const paid_on = 'paid_on' in b
    ? (DATE_RE.test(String(b.paid_on || '')) ? b.paid_on : null)
    : old.paid_on
  const note = 'note' in b ? txt(b.note, 300) : old.note
  // Who paid / the paper trail stay editable even on doc-issued payments — correcting
  // a payer name or a bank reference never changes the amounts a document certifies.
  const payer = 'payer' in b ? txt(b.payer, 120) : old.payer
  const method_ref = 'method_ref' in b ? txt(b.method_ref, 180) : old.method_ref

  await env.DB.prepare(
    `UPDATE payments SET amount = ?1, kind = ?2, method = ?3, paid_on = ?4, note = ?5,
       payer = ?6, method_ref = ?7 WHERE id = ?8`
  ).bind(amount, kind, method, paid_on, note, payer, method_ref, id).run()

  const dAmount = eff(kind, amount) - eff(old.kind, old.amount)
  const dDeposit = depositPart(kind, amount) - depositPart(old.kind, old.amount)
  if (dAmount || dDeposit) await applyDelta(env, old.booking_id, dAmount, dDeposit)
  return Response.json(await bookingPayload(env, old.booking_id))
}

export async function onRequestDelete({ request, env }) {
  let b
  try { b = await request.json() } catch { return bad('bad-json') }
  const id = Number(b.id)
  if (!id) return bad('missing-id')
  const old = await env.DB.prepare('SELECT * FROM payments WHERE id = ?1').bind(id).first()
  if (!old) return bad('not-found', 404)
  if (old.doc_number) return bad('has-document')
  await env.DB.prepare('DELETE FROM payments WHERE id = ?1').bind(id).run()
  const dAmount = eff(old.kind, old.amount)
  if (dAmount) await applyDelta(env, old.booking_id, -dAmount, -depositPart(old.kind, old.amount))
  return Response.json(await bookingPayload(env, old.booking_id))
}
