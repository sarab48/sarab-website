/*
  Booking "intel" shared by the public form function and the office API:
  - dateConflicts: bookings already holding a given event date (blocking statuses).
  - cityMatch: free-text location → known city → tier price.
  Review-ready data for the owner, never a hard rule — he decides.
*/

export function normalizeCity(s) {
  return String(s || '')
    .trim()
    .replace(/^ال/, '')
    .replace(/\s+/g, ' ')
}

export async function dateConflicts(db, date, excludeId) {
  if (!date) return []
  const base = `SELECT id, booking_no, name, status, start_time, city FROM bookings
                WHERE event_date = ?1 AND status IN ('مؤكد','دفع العربون','مكتمل')`
  const stmt = excludeId
    ? db.prepare(base + ' AND id != ?2 ORDER BY id').bind(date, excludeId)
    : db.prepare(base + ' ORDER BY id').bind(date)
  return (await stmt.all()).results
}

export async function cityMatch(db, text) {
  const t = normalizeCity(text)
  if (!t) return null
  const { results } = await db.prepare(
    'SELECT c.id, c.name, p.price, p.name AS tier FROM cities c JOIN price_tiers p ON p.id = c.tier_id'
  ).all()
  let hit = results.find((c) => normalizeCity(c.name) === t)
  if (!hit) {
    // containment match only for reasonably long names, to avoid false hits
    hit = results.find((c) => {
      const n = normalizeCity(c.name)
      return n.length >= 3 && t.length >= 3 && (t.includes(n) || n.includes(t))
    })
  }
  return hit || null
}
