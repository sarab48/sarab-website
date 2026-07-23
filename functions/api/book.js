/*
  POST /api/book — booking backend (docs/05, Step 1).
  Saves the submission to D1, then emails the owner via Cloudflare Email Service
  (REST API; sending to the owner's own verified destination address is free on
  all plans, no sending domain needed). Email is best-effort: a mail failure must
  never lose a booking that is already safe in D1.
  Bindings: DB (D1) · vars: CF_ACCOUNT_ID, EMAIL_FROM, EMAIL_TO · secret: EMAIL_API_TOKEN.
*/

import { dateConflicts, cityMatch } from '../../shared/intel.js'

const LIMITS = { name: 120, phone: 40, date: 20, occasion: 160, location: 160, lang: 8 }

const field = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

export async function onRequestPost({ request, env }) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'bad-json' }, 400)
  }

  // Honeypot: the hidden "company" field stays empty for humans. Bots get a fake success.
  if (field(body.company, 50)) return json({ ok: true })

  const b = {
    name: field(body.name, LIMITS.name),
    phone: field(body.phone, LIMITS.phone),
    event_date: field(body.date, LIMITS.date),
    occasion: field(body.occasion, LIMITS.occasion),
    location: field(body.location, LIMITS.location),
    lang: field(body.lang, LIMITS.lang),
  }
  if (!b.name || !b.phone) return json({ ok: false, error: 'missing-fields' }, 400)

  // Ad attribution captured by the site (src/lib/analytics.js) → auto lead source in
  // the owner's own vocabulary. Meta ads are the one that matters most to him.
  const rawAttr = body.attr && typeof body.attr === 'object' ? body.attr : {}
  const attr = {
    utm_source: field(rawAttr.us, 60),
    utm_medium: field(rawAttr.um, 60),
    utm_campaign: field(rawAttr.uc, 80),
    fbclid: rawAttr.f ? 1 : 0,
    ref: field(rawAttr.r, 80),
  }
  let leadSource = null
  if (attr.fbclid || /^(facebook|fb|instagram|ig|meta)$/i.test(attr.utm_source || '')) leadSource = 'إعلان ممول (Meta)'
  else if (/instagram/i.test(attr.ref || '')) leadSource = 'انستغرام'
  else if (/facebook/i.test(attr.ref || '')) leadSource = 'فيسبوك'
  else if (/whatsapp/i.test(attr.ref || '')) leadSource = 'واتساب'

  let id
  try {
    const { meta } = await env.DB.prepare(
      `INSERT INTO bookings (name, phone, event_date, occasion, venue, lang, lead_source, source, added_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'website', date('now'))`
    )
      .bind(b.name, b.phone, b.event_date || null, b.occasion || null, b.location || null, b.lang || null, leadSource)
      .run()
    id = meta.last_row_id
  } catch (err) {
    console.error('D1 insert failed:', err)
    return json({ ok: false, error: 'server' }, 500)
  }
  b.lead_source = leadSource
  b.attr = attr

  // Review-ready intel for the owner: is the date taken, what does that city cost.
  // Best-effort — never blocks or fails the booking.
  let intel = { conflicts: [], match: null }
  try {
    const [conflicts, match] = await Promise.all([
      dateConflicts(env.DB, b.event_date, id),
      cityMatch(env.DB, b.location),
    ])
    intel = { conflicts, match }
    await env.DB.prepare("UPDATE bookings SET extra = json_patch(COALESCE(extra,'{}'), ?1) WHERE id = ?2")
      .bind(JSON.stringify({
        auto: {
          date_conflicts: conflicts.map((c) => `${c.booking_no || '#' + c.id} ${c.name || ''} (${c.status})`),
          matched_city: match ? match.name : null,
          suggested_price: match ? match.price : null,
        },
        attribution: Object.values(b.attr || {}).some((v) => v) ? b.attr : undefined,
      }), id).run()
  } catch (err) {
    console.error('intel failed:', err)
  }

  let emailed = false
  try {
    emailed = await notifyOwner(env, b, id, intel)
  } catch (err) {
    console.error('email notify threw:', err)
  }

  return json({ ok: true, id, emailed })
}

async function notifyOwner(env, b, id, intel = { conflicts: [], match: null }) {
  if (!env.EMAIL_API_TOKEN) {
    console.error('EMAIL_API_TOKEN not set — booking saved, notification skipped')
    return false
  }

  // Local 05x numbers → international (+972) so the tap-to-WhatsApp link works.
  const digits = b.phone.replace(/\D/g, '')
  const wa =
    digits.length >= 9 ? `https://wa.me/${digits.startsWith('0') ? '972' + digits.slice(1) : digits}` : ''

  const dateLine = !b.event_date
    ? 'التاريخ: غير محدد'
    : intel.conflicts.length
      ? `⚠️ التاريخ ${b.event_date} عليه حجز: ${intel.conflicts.map((c) => `${c.booking_no || '#' + c.id} ${c.name || ''} (${c.status})`).join(' · ')}`
      : `✅ التاريخ ${b.event_date} متاح`
  const priceLine = intel.match
    ? `💰 السعر المقترح: ${intel.match.price} ₪ (${intel.match.name} · ${intel.match.tier})`
    : 'المدينة: بدون تطابق مع قائمة الأسعار — حدّد السعر يدوياً'

  const text = [
    'New booking request from the website:',
    '',
    `Name:      ${b.name}`,
    `Phone:     ${b.phone}${wa ? `  (${wa})` : ''}`,
    `Date:      ${b.event_date || '—'}`,
    `Occasion:  ${b.occasion || '—'}`,
    `Location:  ${b.location || '—'}`,
    `Language:  ${b.lang || '—'}`,
    `Source:    ${b.lead_source || (b.attr && (b.attr.utm_source || b.attr.ref)) || '—'}${b.attr && b.attr.utm_campaign ? ` · حملة: ${b.attr.utm_campaign}` : ''}`,
    '',
    '— فحص تلقائي —',
    dateLine,
    priceLine,
    '',
    `Saved as booking #${id} in D1 (sarab-bookings). Review in the office: /office`,
  ].join('\n')

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/email/sending/send`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.EMAIL_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: env.EMAIL_TO,
        subject: `📸 New SARAB booking — ${b.name}${b.event_date ? ` — ${b.event_date}` : ''}`,
        text,
      }),
    }
  )
  if (!res.ok) {
    console.error('Email Service error', res.status, await res.text())
    return false
  }
  return true
}
