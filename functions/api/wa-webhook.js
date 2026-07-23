/*
  /api/wa-webhook — WhatsApp Cloud API webhook receiver (docs/05, 2026-07-23).

  Accepts Meta-format payloads whether they come from Meta directly or forwarded by a
  coexistence provider. Handles:
    - `messages`            live inbound messages (with click-to-WhatsApp ad `referral`)
    - `smb_message_echoes`  messages the owner sends from the phone app
    - `history`             the coexistence 6-month chat back-sync
    - `smb_app_state_sync`  address-book contact names
    - anything else         kept verbatim as a `log` row — nothing is ever dropped

  Every message lands in wa_messages (deduped by wamid). A live inbound message from a
  number with no booking auto-creates an استفسار row — ad-referral leads get
  lead_source «إعلان ممول (Meta)», the rest «واتساب». History NEVER auto-creates
  bookings (old chats include non-leads); the office واتساب tab adds those on demand.

  Auth (either passes):
    - `?token=` query equal to secret WA_WEBHOOK_TOKEN (also the GET verify_token)
    - valid X-Hub-Signature-256 HMAC of the raw body with secret WA_APP_SECRET
  POSTs always answer 200 once authorized — Meta disables webhooks that keep failing,
  and an unparsed payload is safer in the log than retried into the void.
*/

const LEAD_META = 'إعلان ممول (Meta)'
const LEAD_WA = 'واتساب'

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

const sameString = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// GET — Meta's subscription handshake (hub.challenge echo) + a bare health probe.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  if (mode === 'subscribe') {
    if (env.WA_WEBHOOK_TOKEN && sameString(token || '', env.WA_WEBHOOK_TOKEN))
      return new Response(challenge || '', { status: 200 })
    return new Response('forbidden', { status: 403 })
  }
  return json({ ok: true, service: 'sarab-wa-webhook' })
}

async function validSignature(request, rawBody, secret) {
  const header = request.headers.get('X-Hub-Signature-256') || ''
  if (!header.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return sameString(header.slice(7).toLowerCase(), hex)
}

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text()
  if (rawBody.length > 1_000_000) return json({ ok: false, error: 'too-large' }, 413)

  const urlToken = new URL(request.url).searchParams.get('token') || ''
  let authed = env.WA_WEBHOOK_TOKEN && sameString(urlToken, env.WA_WEBHOOK_TOKEN)
  if (!authed && env.WA_APP_SECRET) authed = await validSignature(request, rawBody, env.WA_APP_SECRET)
  if (!authed) return json({ ok: false, error: 'forbidden' }, 403)

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    await logRaw(env, { parse_error: true, body: rawBody.slice(0, 50_000) })
    return json({ ok: true })
  }

  const stats = { stored: 0, contacts: 0, leads: 0, logged: 0 }
  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        try {
          await handleChange(env, change, stats)
        } catch (err) {
          console.error('wa-webhook change failed:', err)
          await logRaw(env, change)
          stats.logged++
        }
      }
    }
    if (!Array.isArray(payload.entry) || !payload.entry.length) {
      await logRaw(env, payload)
      stats.logged++
    }
  } catch (err) {
    console.error('wa-webhook fatal:', err)
  }
  return json({ ok: true, ...stats })
}

// Shape-driven, not field-driven: Meta reuses value shapes across fields — the history
// sync delivers the owner's sent messages as value.message_echoes under field "history"
// (seen live 2026-07-23), not inside history[].threads. Whatever isn't recognized by
// shape is raw-logged.
async function handleChange(env, change, stats) {
  const field = change.field || ''
  const value = change.value || {}
  const bizDigits = String(value.metadata?.display_phone_number || '').replace(/\D/g, '')
  const origin = field === 'history' ? 'history' : 'live'
  let handled = false

  if (Array.isArray(value.messages)) {
    handled = true
    // Profile names ride alongside in value.contacts, keyed by wa_id.
    const names = {}
    for (const c of value.contacts || []) if (c.wa_id) names[c.wa_id] = c.profile?.name || null
    for (const m of value.messages) {
      // The history sync also delivers received messages in this same shape (field
      // "history", seen live 2026-07-23) — store them, but only genuinely live
      // inbound messages may auto-create/link leads.
      const fromDigits = String(m.from || '').replace(/\D/g, '')
      const out = bizDigits && fromDigits === bizDigits
      const stored = await storeMessage(env, m, {
        direction: out ? 'out' : 'in',
        origin,
        phone: out ? (m.to || null) : m.from,
        name: names[m.from] || null,
      })
      if (stored) {
        stats.stored++
        // "unsupported" events (status reactions, instantly-deleted messages — Meta
        // error 131060) are kept in the log but are not real contact: no auto-lead.
        if (origin === 'live' && !out && m.type !== 'unsupported')
          await linkOrCreateLead(env, m, names[m.from] || null, stored.rowId, stats)
      }
    }
  }

  if (Array.isArray(value.message_echoes)) {
    handled = true
    for (const m of value.message_echoes) {
      const stored = await storeMessage(env, m, {
        direction: 'out', origin, phone: m.to || null, name: null,
      })
      if (stored) stats.stored++
    }
  }

  if (Array.isArray(value.history)) {
    handled = true
    for (const chunk of value.history) {
      for (const thread of chunk.threads || []) {
        const threadPhone = String(thread.id || '').replace(/\D/g, '') || null
        for (const m of thread.messages || []) {
          const fromDigits = String(m.from || '').replace(/\D/g, '')
          const out = bizDigits && fromDigits === bizDigits
          const stored = await storeMessage(env, m, {
            direction: out ? 'out' : 'in',
            origin: 'history',
            phone: out ? threadPhone : (fromDigits || threadPhone),
            name: null,
          })
          if (stored) stats.stored++
        }
      }
    }
  }

  if (Array.isArray(value.state_sync)) {
    handled = true
    for (const s of value.state_sync) {
      if (s.type !== 'contact' || !s.contact) continue
      const phone = String(s.contact.phone_number || '').replace(/\D/g, '')
      const name = (s.contact.full_name || s.contact.first_name || '').trim()
      if (!phone) continue
      await env.DB.prepare(
        `INSERT INTO wa_contacts (phone, name) VALUES (?1, ?2)
         ON CONFLICT(phone) DO UPDATE SET name = excluded.name WHERE excluded.name != ''`
      ).bind(phone, name || null).run()
      stats.contacts++
    }
  }

  // Statuses (delivered/read receipts) carry nothing the owner needs — drop quietly.
  if (Array.isArray(value.statuses)) handled = true

  if (!handled) {
    await logRaw(env, change)
    stats.logged++
  }
}

// One message → one wa_messages row. Returns null when wamid was already seen
// (webhook retry or history overlapping live) so nothing downstream double-fires.
async function storeMessage(env, m, { direction, origin, phone, name }) {
  const wamid = m.id || null
  const ts = m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : null
  const type = m.type || 'unknown'
  const body =
    type === 'text' ? (m.text?.body ?? '') :
    (m[type]?.caption ?? m[type]?.body ?? null)
  const referral = m.referral ? JSON.stringify(m.referral) : null
  const digits = String(phone || '').replace(/\D/g, '') || null
  // Non-text content keeps its full JSON so media ids / locations / contacts survive.
  const raw = type === 'text' && !m.context ? null : JSON.stringify(m)

  const { meta } = await env.DB.prepare(
    `INSERT OR IGNORE INTO wa_messages (wamid, ts, direction, origin, phone, name, type, body, referral, raw)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(wamid, ts, direction, origin, digits, name, type, body, referral, raw).run()
  if (!meta.changes) return null
  if (name && digits) {
    await env.DB.prepare(
      `INSERT INTO wa_contacts (phone, name) VALUES (?1, ?2)
       ON CONFLICT(phone) DO UPDATE SET name = excluded.name`
    ).bind(digits, name).run()
  }
  return { rowId: meta.last_row_id }
}

// The owner's numbers are stored as typed (05x…, spaces, dashes) — match on the last
// 9 digits, which are identical between 9725XXXXXXXX and 05XXXXXXXX.
export async function findBookingByPhone(db, digits) {
  const last9 = String(digits || '').replace(/\D/g, '').slice(-9)
  if (last9.length < 9) return null
  return db.prepare(
    `SELECT id, booking_no, lead_source FROM bookings
     WHERE replace(replace(replace(replace(phone,' ',''),'-',''),'+',''),'.','') LIKE '%' || ?1
     ORDER BY id DESC LIMIT 1`
  ).bind(last9).first()
}

export const localPhone = (digits) =>
  digits.startsWith('972') ? '0' + digits.slice(-9) : digits

// The CTWA referral names the ad (id + headline) but not the owner's campaign — that
// link is taught once in the واتساب tab (options kind wa_ad_map, value "adId|campaign")
// and applied automatically to every later lead from the same ad.
export async function campaignForAd(db, referral) {
  const sid = String(referral?.source_id || '')
  if (!sid) return null
  const row = await db.prepare(
    "SELECT value FROM options WHERE kind = 'wa_ad_map' AND value LIKE ?1 LIMIT 1"
  ).bind(sid + '|%').first()
  return row ? row.value.slice(sid.length + 1) : null
}

// Live inbound only: a known number links to its booking (an empty lead_source gets
// filled when the ad referral says Meta); an unknown number becomes a fresh استفسار.
async function linkOrCreateLead(env, m, name, waRowId, stats) {
  const digits = String(m.from || '').replace(/\D/g, '')
  if (!digits) return
  const referral = m.referral || null
  const metaSource = referral ? (await campaignForAd(env.DB, referral)) || LEAD_META : null
  const existing = await findBookingByPhone(env.DB, digits)

  if (existing) {
    await env.DB.prepare('UPDATE wa_messages SET booking_id = ?1 WHERE id = ?2')
      .bind(existing.id, waRowId).run()
    if (referral && !existing.lead_source) {
      await env.DB.prepare(
        `UPDATE bookings SET lead_source = ?1,
           extra = json_patch(COALESCE(extra,'{}'), ?2) WHERE id = ?3`
      ).bind(metaSource, JSON.stringify({ wa: { referral } }), existing.id).run()
    }
    return
  }

  // notes stay empty on purpose (owner request 2026-07-23) — the first message is
  // always visible in the واتساب tab, and ملاحظات is the owner's own space.
  const { meta } = await env.DB.prepare(
    `INSERT INTO bookings (name, phone, lead_source, source, extra, added_at)
     VALUES (?1, ?2, ?3, 'whatsapp', ?4, date('now'))`
  ).bind(
    name || null,
    localPhone(digits),
    metaSource || LEAD_WA,
    JSON.stringify({ wa: { first_wamid: m.id || null, referral: referral || undefined } })
  ).run()
  await env.DB.prepare('UPDATE wa_messages SET booking_id = ?1 WHERE id = ?2')
    .bind(meta.last_row_id, waRowId).run()
  stats.leads++
}

async function logRaw(env, obj) {
  try {
    await env.DB.prepare(
      `INSERT INTO wa_messages (direction, origin, type, raw) VALUES ('log', 'live', 'raw', ?1)`
    ).bind(JSON.stringify(obj).slice(0, 100_000)).run()
  } catch (err) {
    console.error('wa-webhook raw log failed:', err)
  }
}
