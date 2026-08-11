/*
  /office/api/bookings/:id — GET one · PATCH update (whitelisted fields only) ·
  DELETE (owner's explicit request; UI asks for confirmation — cancellations should
  normally stay as the ملغي status).
  Auth: ../../_middleware.js.
*/
import { cleanValue, ensureBookingNo, ensureEventFinance, ensureCityPrice, BOOKED_STATUSES } from '../bookings.js'
import { syncBookingCalendar, removeBookingCalendar } from '../../../../shared/gcal.js'

const WRITABLE = [
  'booked_at', 'added_at', 'event_date', 'occasion', 'first_name', 'last_name', 'name', 'phone',
  'email', 'city', 'region', 'venue', 'start_time', 'end_time', 'hours', 'guests',
  'package', 'price', 'deposit', 'remaining', 'payment_status', 'arrival_time',
  'staff', 'staff_count', 'lead_source', 'interest', 'callback', 'notes', 'status',
]

export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(Number(params.id)).first()
  if (!row) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })
  return Response.json({ ok: true, row })
}

export async function onRequestPatch({ request, env, params }) {
  let body
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'bad-json' }, { status: 400 }) }

  const sets = []
  const vals = []
  for (const k of WRITABLE) {
    if (!(k in body)) continue
    const v = cleanValue(k, body[k])
    sets.push(`${k} = ?${vals.length + 1}`)
    vals.push(v === undefined ? null : v)
  }
  if (!sets.length) return Response.json({ ok: false, error: 'no-fields' }, { status: 400 })

  // Turning into a real booking stamps تاريخ الحجز automatically (never overwrites an
  // explicit value — neither one already saved nor one sent in this same edit).
  if (BOOKED_STATUSES.includes(body.status) && !('booked_at' in body)) {
    sets.push("booked_at = COALESCE(booked_at, date('now'))")
  }

  vals.push(Number(params.id))
  const { meta } = await env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?${vals.length}`)
    .bind(...vals).run()
  if (!meta.changes) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })

  const row = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(Number(params.id)).first()
  // A website/WhatsApp lead that just became a real booking gets its SARAB-NNN here — the
  // finance row is keyed on it, so this must run first (idempotent, existing numbers kept).
  await ensureBookingNo(env, row)
  // Newly completed booking → auto-seed its row in أرباح ومصاريف المناسبات (idempotent).
  await ensureEventFinance(env, row)
  // Unknown city + a price on the booking → auto-join the price list (idempotent).
  const cityAdded = await ensureCityPrice(env, row)
  // A real booking belongs in the owner's Google Calendar; one that stopped being real
  // (ملغي, or its date cleared) comes back out. Never fails the save — see shared/gcal.js.
  const calendar = await syncBookingCalendar(env, row, { onCalendar: BOOKED_STATUSES.includes(row.status) })
  return Response.json({ ok: true, row, city_added: cityAdded, calendar })
}

export async function onRequestDelete({ env, params }) {
  // Read first: the calendar entry has to go before the row that points at it does.
  const row = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(Number(params.id)).first()
  if (!row) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })
  const calendar = await removeBookingCalendar(env, row)
  const { meta } = await env.DB.prepare('DELETE FROM bookings WHERE id = ?1').bind(Number(params.id)).run()
  if (!meta.changes) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })
  // Its payment history goes with it — an orphaned ledger row would show a nameless
  // payment forever. (Revisit before the receipt automation: a payment carrying an
  // issued document should block this delete instead.)
  await env.DB.prepare('DELETE FROM payments WHERE booking_id = ?1').bind(Number(params.id)).run()
  return Response.json({ ok: true, calendar })
}
