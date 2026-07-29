/*
  /office/api/calendar — the التقويم panel in the dashboard.
    GET  : is Google Calendar connected, which calendar, and what is out of step.
    POST : push everything that is out of step (bookings the calendar is missing, and
           calendar entries that should no longer exist). Idempotent — safe to press twice.
  Auth: ../_middleware.js. Read-only against `bookings` except for the three gcal_* columns.
*/
import { BOOKED_STATUSES } from './bookings.js'
import { calendarConfigured, calendarProbe, syncBookingCalendar } from '../../../shared/gcal.js'

const IN_BOOKED = BOOKED_STATUSES.map(() => '?').join(',')
// Everything whose calendar state disagrees with its booking state, in one query:
// a real, dated, still-upcoming booking with no event yet — or an event still hanging
// around on a booking that was cancelled, un-dated, or is no longer a real booking.
const PENDING_SQL = `
  SELECT * FROM bookings
   WHERE (status IN (${IN_BOOKED}) AND event_date >= date('now') AND gcal_event_id IS NULL)
      OR (gcal_event_id IS NOT NULL AND (status NOT IN (${IN_BOOKED}) OR event_date IS NULL))
   ORDER BY event_date`
const PENDING_BINDS = [...BOOKED_STATUSES, ...BOOKED_STATUSES]

// One press must never turn into a runaway loop of Google calls.
const MAX_PER_RUN = 200

export async function onRequestGet({ env }) {
  const configured = calendarConfigured(env)
  const [linked, pending] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM bookings WHERE gcal_event_id IS NOT NULL').first(),
    env.DB.prepare(PENDING_SQL).bind(...PENDING_BINDS).all(),
  ])
  return Response.json({
    ok: true,
    configured,
    calendar_id: configured ? env.GCAL_CALENDAR_ID : null,
    timezone: env.GCAL_TIMEZONE || 'Asia/Jerusalem',
    probe: configured ? await calendarProbe(env) : { ok: false, reason: 'not-configured' },
    linked: linked?.n || 0,
    pending: pending.results.length,
    pending_rows: pending.results.slice(0, 20).map((r) => ({
      id: r.id, booking_no: r.booking_no, name: r.name, event_date: r.event_date, status: r.status,
      action: r.gcal_event_id ? 'remove' : 'add',
    })),
  })
}

export async function onRequestPost({ env }) {
  if (!calendarConfigured(env)) {
    return Response.json({ ok: false, error: 'not-configured' }, { status: 400 })
  }
  const { results } = await env.DB.prepare(PENDING_SQL).bind(...PENDING_BINDS).all()
  const batch = results.slice(0, MAX_PER_RUN)

  // Sequential on purpose: a handful of bookings, and Google's per-second write quota is
  // not worth racing for. Every failure is collected, none of them stops the rest.
  const out = { added: 0, removed: 0, failed: 0, errors: [] }
  for (const row of batch) {
    const res = await syncBookingCalendar(env, row, { onCalendar: BOOKED_STATUSES.includes(row.status) })
    if (res.action === 'created' || res.action === 'updated') out.added++
    else if (res.action === 'removed') out.removed++
    else if (!res.ok) {
      out.failed++
      if (out.errors.length < 5) out.errors.push(`${row.booking_no || '#' + row.id}: ${res.error}`)
    }
  }
  out.remaining = Math.max(0, results.length - batch.length)
  return Response.json({ ok: true, ...out })
}
