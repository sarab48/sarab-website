/*
  /office/api/whatsapp — the واتساب tab's data (auth: ../_middleware.js).
  GET            → contact summary (per number: name, counts, ad referral, linked booking) + KPIs
  GET ?phone=    → that number's messages, oldest first
  POST           → { action:'to-booking', phone } — turn a history-only contact into an
                   استفسار booking (live inbound leads are auto-created by the webhook;
                   this is the owner's button for synced old chats).
*/

import { findBookingByPhone, localPhone } from '../../api/wa-webhook.js'

const LEAD_META = 'إعلان ممول (Meta)'
const LEAD_WA = 'واتساب'

export async function onRequestGet({ request, env }) {
  const phone = (new URL(request.url).searchParams.get('phone') || '').replace(/\D/g, '')

  if (phone) {
    const { results } = await env.DB.prepare(
      `SELECT id, wamid, ts, direction, origin, type, body, referral, booking_id
       FROM wa_messages WHERE phone = ?1 AND direction IN ('in','out')
       ORDER BY ts, id LIMIT 500`
    ).bind(phone).all()
    return Response.json({ ok: true, phone, messages: results })
  }

  const [contacts, kpi] = await env.DB.batch([
    env.DB.prepare(
      `SELECT m.phone,
              COALESCE(
                (SELECT name FROM wa_messages WHERE phone = m.phone AND name IS NOT NULL ORDER BY ts DESC, id DESC LIMIT 1),
                (SELECT name FROM wa_contacts WHERE phone = m.phone)
              ) AS name,
              COUNT(*) AS n,
              MIN(m.ts) AS first_ts,
              MAX(m.ts) AS last_ts,
              MAX(CASE WHEN m.referral IS NOT NULL THEN 1 ELSE 0 END) AS from_ad,
              (SELECT referral FROM wa_messages WHERE phone = m.phone AND referral IS NOT NULL ORDER BY ts DESC, id DESC LIMIT 1) AS referral,
              (SELECT body FROM wa_messages WHERE phone = m.phone AND direction = 'in' AND body IS NOT NULL AND body != '' ORDER BY ts, id LIMIT 1) AS first_msg,
              MAX(m.booking_id) AS booking_id,
              b.booking_no, b.status
       FROM wa_messages m
       LEFT JOIN bookings b ON b.id = (SELECT MAX(booking_id) FROM wa_messages WHERE phone = m.phone)
       WHERE m.phone IS NOT NULL AND m.direction IN ('in','out')
       GROUP BY m.phone
       ORDER BY last_ts DESC
       LIMIT 300`
    ),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(DISTINCT phone) FROM wa_messages WHERE phone IS NOT NULL AND direction IN ('in','out')) AS contacts,
         (SELECT COUNT(*) FROM wa_messages WHERE direction IN ('in','out')) AS messages,
         (SELECT COUNT(DISTINCT phone) FROM wa_messages WHERE referral IS NOT NULL) AS ad_contacts,
         (SELECT COUNT(*) FROM wa_messages WHERE direction = 'in' AND origin = 'live'
            AND ts >= strftime('%Y-%m-%dT%H:%M:%SZ','now','-7 days')) AS in_7d,
         (SELECT COUNT(*) FROM bookings WHERE source = 'whatsapp') AS auto_leads`
    ),
  ])

  // Numbers the webhook auto-linked to an existing booking keep booking_id on their
  // rows; numbers matching a booking by phone but never linked (pure history) stay
  // unlinked here — the button in the tab resolves those on demand.
  return Response.json({ ok: true, contacts: contacts.results, kpi: kpi.results[0] })
}

export async function onRequestPost({ request, env }) {
  let body
  try { body = await request.json() } catch { return Response.json({ ok: false, error: 'bad-json' }, { status: 400 }) }
  if (body?.action !== 'to-booking')
    return Response.json({ ok: false, error: 'bad-action' }, { status: 400 })
  const phone = String(body.phone || '').replace(/\D/g, '')
  if (phone.length < 9) return Response.json({ ok: false, error: 'bad-phone' }, { status: 400 })

  // Already a booking for this number (imported, manual, or webhook-made)? Link, don't duplicate.
  const existing = await findBookingByPhone(env.DB, phone)
  if (existing) {
    await env.DB.prepare('UPDATE wa_messages SET booking_id = ?1 WHERE phone = ?2 AND booking_id IS NULL')
      .bind(existing.id, phone).run()
    return Response.json({ ok: true, id: existing.id, booking_no: existing.booking_no, existing: true })
  }

  const info = await env.DB.prepare(
    `SELECT
       COALESCE(
         (SELECT name FROM wa_messages WHERE phone = ?1 AND name IS NOT NULL ORDER BY ts DESC, id DESC LIMIT 1),
         (SELECT name FROM wa_contacts WHERE phone = ?1)
       ) AS name,
       (SELECT body FROM wa_messages WHERE phone = ?1 AND direction = 'in' AND body IS NOT NULL AND body != '' ORDER BY ts, id LIMIT 1) AS first_msg,
       (SELECT referral FROM wa_messages WHERE phone = ?1 AND referral IS NOT NULL ORDER BY ts DESC, id DESC LIMIT 1) AS referral,
       (SELECT MIN(ts) FROM wa_messages WHERE phone = ?1 AND direction = 'in') AS first_ts`
  ).bind(phone).first()

  const referral = info?.referral ? JSON.parse(info.referral) : null
  const { meta } = await env.DB.prepare(
    `INSERT INTO bookings (name, phone, lead_source, source, notes, booked_at, extra)
     VALUES (?1, ?2, ?3, 'whatsapp', ?4, ?5, ?6)`
  ).bind(
    info?.name || null,
    localPhone(phone),
    referral ? LEAD_META : LEAD_WA,
    info?.first_msg ? info.first_msg.slice(0, 300) : null,
    info?.first_ts ? info.first_ts.slice(0, 10) : null,
    JSON.stringify({ wa: { referral: referral || undefined, from_history: true } })
  ).run()
  await env.DB.prepare('UPDATE wa_messages SET booking_id = ?1 WHERE phone = ?2 AND booking_id IS NULL')
    .bind(meta.last_row_id, phone).run()
  return Response.json({ ok: true, id: meta.last_row_id, existing: false })
}
