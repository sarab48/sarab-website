/*
  /office/api/bookings/:id — GET one · PATCH update (whitelisted fields only) ·
  DELETE (owner's explicit request; UI asks for confirmation — cancellations should
  normally stay as the ملغي status).
  Auth: ../../_middleware.js.
*/
import { cleanValue } from '../bookings.js'

const WRITABLE = [
  'booked_at', 'event_date', 'occasion', 'first_name', 'last_name', 'name', 'phone',
  'email', 'city', 'region', 'venue', 'start_time', 'end_time', 'hours', 'guests',
  'package', 'price', 'deposit', 'remaining', 'payment_status', 'arrival_time',
  'lead_source', 'interest', 'callback', 'notes', 'status',
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

  vals.push(Number(params.id))
  const { meta } = await env.DB.prepare(`UPDATE bookings SET ${sets.join(', ')} WHERE id = ?${vals.length}`)
    .bind(...vals).run()
  if (!meta.changes) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })

  const row = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(Number(params.id)).first()
  return Response.json({ ok: true, row })
}

export async function onRequestDelete({ env, params }) {
  const { meta } = await env.DB.prepare('DELETE FROM bookings WHERE id = ?1').bind(Number(params.id)).run()
  if (!meta.changes) return Response.json({ ok: false, error: 'not-found' }, { status: 404 })
  return Response.json({ ok: true })
}
