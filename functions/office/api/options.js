/*
  /office/api/options — owner-managed vocabularies editable from the dashboard.
  Today that is only Meta campaign names (kind = meta_campaign): each value joins the
  مصدر العميل dropdown (merged in ./meta.js) and marks its bookings as Meta-sourced for
  the ميتا CAPI tab. Auth: ../_middleware.js.
*/

const EDITABLE_KINDS = new Set(['meta_campaign'])

async function readBody(request) {
  try { return await request.json() } catch { return null }
}

async function list(env, kind) {
  const { results } = await env.DB.prepare(
    'SELECT value FROM options WHERE kind = ?1 ORDER BY pos, id'
  ).bind(kind).all()
  return Response.json({ ok: true, kind, values: results.map((r) => r.value) })
}

export async function onRequestPost({ request, env }) {
  const body = await readBody(request)
  const kind = String(body?.kind || '')
  const value = String(body?.value || '').trim().slice(0, 80)
  if (!EDITABLE_KINDS.has(kind)) return Response.json({ ok: false, error: 'bad-kind' }, { status: 400 })
  if (!value) return Response.json({ ok: false, error: 'empty' }, { status: 400 })

  // A campaign named like an existing مصدر العميل value (or an existing campaign) would
  // silently re-label those bookings as Meta conversions — refuse the collision.
  const clash = await env.DB.prepare(
    "SELECT 1 FROM options WHERE value = ?1 AND kind IN (?2, 'lead_source') LIMIT 1"
  ).bind(value, kind).first()
  if (clash) return Response.json({ ok: false, error: 'exists' }, { status: 409 })

  await env.DB.prepare(
    `INSERT INTO options (kind, value, pos)
     VALUES (?1, ?2, 1 + COALESCE((SELECT MAX(pos) FROM options WHERE kind = ?1), 0))`
  ).bind(kind, value).run()
  return list(env, kind)
}

export async function onRequestDelete({ request, env }) {
  const body = await readBody(request)
  const kind = String(body?.kind || '')
  const value = String(body?.value || '')
  if (!EDITABLE_KINDS.has(kind)) return Response.json({ ok: false, error: 'bad-kind' }, { status: 400 })
  await env.DB.prepare('DELETE FROM options WHERE kind = ?1 AND value = ?2').bind(kind, value).run()
  return list(env, kind)
}
