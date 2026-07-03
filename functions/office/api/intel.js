/*
  GET /office/api/intel?date=YYYY-MM-DD&city=<free text>&exclude=<booking id>
  → { conflicts: [bookings holding that date], match: {name, price, tier} | null }
  Auth: ../_middleware.js.
*/
import { dateConflicts, cityMatch } from '../../../shared/intel.js'

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url)
  const date = (u.searchParams.get('date') || '').slice(0, 20)
  const city = (u.searchParams.get('city') || '').slice(0, 160)
  const exclude = Number(u.searchParams.get('exclude') || 0) || null
  const [conflicts, match] = await Promise.all([
    dateConflicts(env.DB, date, exclude),
    cityMatch(env.DB, city),
  ])
  return Response.json({ ok: true, conflicts, match })
}
