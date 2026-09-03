/*
  GET /office/api/cancellations — تبويب الإلغاءات: every cancelled booking (status ملغي)
  with what the client had paid, what went back, and what SARAB kept — plus each one's
  ledger rows so the tab can show the trail without a second call.

  The decision itself (bookings.cancel_decision: kept | refund | NULL) and the reason /
  cancel date are written through PATCH /office/api/bookings/:id; a refund is recorded
  through POST /office/api/payments with kind استرداد (stored negative). Nothing here
  writes — this is the read model both the tab and the finance KPI use, so the two can
  never disagree (finance.js imports cancellationSummary below).

  Money rule: the payments ledger is the source of truth — paid_in = Σ positive non-tip
  rows, refunded = Σ negative rows. A cancelled booking whose advance was only ever
  typed into the deposit field (no positive ledger row at all) falls back to that field
  and is flagged `no_ledger` so the owner sees the gap instead of a silent zero. Since
  a refund reduces the deposit field by exactly its amount, the original advance in
  that fallback is deposit + refunded — so recording a refund never makes the ledger
  claim the client paid nothing.

  Per-row `state`:
    pending    — money in hand, nothing decided yet
    refund_due — decided to refund, not (fully) paid back yet (`due` says how much)
    refunded   — everything paid back
    partial    — part paid back, the rest deliberately kept
    kept       — decided to keep it all
    none       — the cancellation involved no money
  Auth: ../_middleware.js.
*/
import { displayName } from '../../../shared/names.js'

const TIP = 'إكرامية'

export async function cancellationRows(env) {
  const [list, pays] = await env.DB.batch([
    env.DB.prepare(`SELECT b.id, b.booking_no, b.first_name, b.last_name, b.name, b.phone,
        b.event_date, b.occasion, b.city, b.price, b.deposit, b.remaining, b.status,
        b.cancelled_at, b.cancel_decision, b.cancel_reason, b.booked_at,
        COALESCE((SELECT SUM(p.amount) FROM payments p
                  WHERE p.booking_id = b.id AND p.amount > 0 AND COALESCE(p.kind, '') != ?1), 0) AS ledger_in,
        COALESCE((SELECT -SUM(p.amount) FROM payments p
                  WHERE p.booking_id = b.id AND p.amount < 0), 0) AS refunded
      FROM bookings b
      WHERE b.status = 'ملغي'
      ORDER BY (b.cancelled_at IS NULL), b.cancelled_at DESC, (b.event_date IS NULL), b.event_date DESC, b.id DESC`)
      .bind(TIP),
    env.DB.prepare(`SELECT p.id, p.booking_id, p.kind, p.amount, p.method, p.paid_on, p.payer, p.method_ref, p.note
      FROM payments p JOIN bookings b ON b.id = p.booking_id
      WHERE b.status = 'ملغي'
      ORDER BY p.booking_id, (p.paid_on IS NULL), p.paid_on, p.id`),
  ])
  const byBooking = {}
  for (const p of pays.results) (byBooking[p.booking_id] ??= []).push(p)
  return list.results.map((r) => {
    const ledgerIn = Number(r.ledger_in) || 0
    const refunded = Number(r.refunded) || 0
    const noLedger = ledgerIn <= 0
    const paid_in = noLedger ? Math.max(Number(r.deposit) || 0, 0) + refunded : ledgerIn
    const kept = Math.max(paid_in - refunded, 0)
    let state
    if (paid_in <= 0 && refunded <= 0) state = 'none'
    else if (refunded > 0 && refunded >= paid_in) state = 'refunded'
    else if (r.cancel_decision === 'kept') state = refunded > 0 ? 'partial' : 'kept'
    else if (r.cancel_decision === 'refund') state = 'refund_due'
    else state = refunded > 0 ? 'partial' : 'pending'
    const { ledger_in, ...rest } = r
    return {
      ...rest,
      name: displayName(r) || null,
      paid_in, refunded, kept,
      due: state === 'refund_due' ? kept : 0,
      no_ledger: noLedger && paid_in > 0,
      state,
      payments: byBooking[r.id] || [],
    }
  })
}

// The finance tab's numbers, from the very same rows. `kept` counts only money whose
// fate is settled (kept / partial) — it is SARAB's income; `pending` is cash still in
// hand but not yet SARAB's (undecided, or a refund still to be paid out).
export function cancellationSummary(rows) {
  const s = { n: 0, paid_in: 0, refunded: 0, kept: 0, pending: 0, pending_n: 0 }
  for (const r of rows) {
    if (r.state === 'none') continue
    s.n++
    s.paid_in += r.paid_in
    s.refunded += r.refunded
    if (r.state === 'kept' || r.state === 'partial') s.kept += r.kept
    else if (r.state === 'pending' || r.state === 'refund_due') { s.pending += r.kept; s.pending_n++ }
  }
  return s
}

export async function onRequestGet({ env }) {
  const rows = await cancellationRows(env)
  return Response.json({ ok: true, rows, summary: cancellationSummary(rows) })
}
