/*
  Google Calendar sync — a booking that becomes real (مؤكد / دفع العربون / مكتمل) appears
  in the owner's Google Calendar, updates itself when the booking is edited, and disappears
  again if the booking is cancelled or deleted.

  Auth: a Google **service account**, signing its own JWT here (Web Crypto, RS256) and
  exchanging it for an access token. The owner shares one calendar with that service
  account's address — no OAuth consent screen, no refresh token to expire, no re-login ever.

  Why reminders are `useDefault: true` and not per-event overrides
  ---------------------------------------------------------------
  Google's own docs: "Reminders are private information, specific to an authenticated user;
  they're not shared across multiple users." A reminder written by the service account would
  therefore belong to the *service account*, and the owner's phone would stay silent. The
  reminders that actually fire are the ones set on the calendar itself, in Google Calendar's
  own settings — which is also better for the owner: they can retune "1 day before / 3 hours
  before" from their phone at any time, no deploy needed. See docs/06-GOOGLE-CALENDAR.md.

  Nothing in here is allowed to break a save. Every entry point returns a plain result
  object ({ ok, action, error }) and never throws; a missing configuration, a Google outage
  or a revoked key all degrade to "the booking saved, the calendar didn't get it".
*/

import { displayName } from './names.js'

const SCOPE = 'https://www.googleapis.com/auth/calendar'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3'
const DEFAULT_TZ = 'Asia/Jerusalem'
const TIMEOUT_MS = 8000

// Status → Google colorId, echoing the dashboard's own status colours.
const STATUS_COLOR = { 'مؤكد': '10', 'دفع العربون': '7', 'مكتمل': '8' }

export function calendarConfigured(env) {
  return !!(env?.GCAL_CLIENT_EMAIL && env?.GCAL_PRIVATE_KEY && env?.GCAL_CALENDAR_ID)
}

const tokenUrl = (env) => env.GCAL_TOKEN_URL || GOOGLE_TOKEN_URL
const apiBase = (env) => env.GCAL_API_BASE || GOOGLE_API_BASE
const timezone = (env) => env.GCAL_TIMEZONE || DEFAULT_TZ

// ---------- service-account access token ----------

function b64url(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let bin = ''
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const b64urlText = (s) => b64url(new TextEncoder().encode(s))

// The key as it appears in the service-account JSON. Whether it was pasted with real
// newlines or with literal "\n" escapes, both land here as the same PKCS#8 bytes.
function pkcs8Bytes(pem) {
  const body = String(pem).replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(body)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

// One token per isolate, reused until a minute before it expires.
let tokenCache = { key: '', token: '', exp: 0 }

async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000)
  const cacheKey = `${env.GCAL_CLIENT_EMAIL}|${tokenUrl(env)}`
  if (tokenCache.token && tokenCache.key === cacheKey && tokenCache.exp - 60 > now) return tokenCache.token

  const aud = tokenUrl(env)
  const head = b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64urlText(JSON.stringify({
    iss: env.GCAL_CLIENT_EMAIL, scope: SCOPE, aud, iat: now, exp: now + 3600,
  }))
  const key = await crypto.subtle.importKey(
    'pkcs8', pkcs8Bytes(env.GCAL_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`)
  )
  const res = await fetch(aud, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${head}.${claim}.${b64url(sig)}`,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`token ${res.status}: ${data.error_description || data.error || 'no access_token'}`)
  }
  tokenCache = {
    key: cacheKey,
    token: data.access_token,
    exp: now + (Number(data.expires_in) || 3600),
  }
  return tokenCache.token
}

async function calendarFetch(env, path, init = {}) {
  const token = await accessToken(env)
  const res = await fetch(`${apiBase(env)}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const text = await res.text()
  let body = {}
  try { body = text ? JSON.parse(text) : {} } catch { /* DELETE answers with an empty body */ }
  return { status: res.status, ok: res.ok, body }
}

// ---------- the event we put in the calendar ----------

const trim = (v) => String(v ?? '').trim()
// Same rule as the dashboard's fullName() (owner's rule 2026-08-19): the name the owner
// wrote (first/last) always wins; `name` (WhatsApp profile / website form) is fallback.
const personName = (row) => displayName(row) || 'بدون اسم'

const HHMM = /^\s*(\d{1,2})[:.](\d{2})/
function parseTime(v) {
  const m = HHMM.exec(String(v ?? ''))
  if (!m) return null
  const h = Number(m[1]); const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}
const asClock = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/*
  When the booking records a وقت البداية we place a timed event; the end comes from
  وقت النهاية, else from عدد الساعات, else a 4-hour default (a typical event). An end
  that lands past midnight rolls onto the next day. With no start time at all, the
  booking becomes an all-day entry on its date — still visible, still reminded.
*/
export function eventTimes(row, tz) {
  const date = trim(row.event_date).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const start = parseTime(row.start_time)
  if (start === null) {
    return { start: { date }, end: { date: addDays(date, 1) } }
  }
  const explicitEnd = parseTime(row.end_time)
  const hours = Number(row.hours)
  const span = explicitEnd !== null
    ? (explicitEnd > start ? explicitEnd - start : explicitEnd + 1440 - start)
    : Math.round((Number.isFinite(hours) && hours > 0 ? hours : 4) * 60)
  const endAbs = start + span
  return {
    start: { dateTime: `${date}T${asClock(start)}:00`, timeZone: tz },
    end: { dateTime: `${endAbs >= 1440 ? addDays(date, 1) : date}T${asClock(endAbs)}:00`, timeZone: tz },
  }
}

export function eventBody(row, env) {
  const tz = timezone(env)
  const times = eventTimes(row, tz)
  if (!times) return null

  const who = personName(row)
  const occasion = trim(row.occasion)
  const place = [trim(row.venue), trim(row.city)].filter(Boolean).join(' — ')
  const money = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))
    ? null : `${new Intl.NumberFormat('en-US').format(Number(v))} ₪`)

  const staffCount = Number(row.staff_count)
  const lines = [
    ['رقم الحجز', trim(row.booking_no) || `#${row.id}`],
    ['العميل', [who, trim(row.phone)].filter(Boolean).join(' · ')],
    ['المناسبة', occasion],
    ['المكان', place],
    ['وقت الوصول', trim(row.arrival_time)],
    ['الطاقم', [trim(row.staff), Number.isFinite(staffCount) && staffCount > 0 ? `(${staffCount} عمال)` : '']
      .filter(Boolean).join(' ')],
    ['السعر', money(row.price)],
    ['العربون', money(row.deposit)],
    ['المتبقي', money(row.remaining)],
    ['الحالة', trim(row.status)],
    ['ملاحظات', trim(row.notes)],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
  lines.push('', '— أُضيف تلقائياً من مكتب SARAB')

  return {
    summary: `SARAB · ${who}${occasion ? ` — ${occasion}` : ''}`.slice(0, 200),
    description: lines.join('\n'),
    location: place || undefined,
    colorId: STATUS_COLOR[trim(row.status)],
    ...times,
    // See the header: only the calendar's own default notifications reach the owner.
    reminders: { useDefault: true },
    extendedProperties: { private: { sarab_booking_id: String(row.id), sarab_booking_no: trim(row.booking_no) } },
  }
}

// ---------- sync ----------

const today = () => new Date().toISOString().slice(0, 10)

async function remember(env, row, eventId, link) {
  await env.DB.prepare(
    'UPDATE bookings SET gcal_event_id = ?1, gcal_link = ?2, gcal_synced_at = ?3 WHERE id = ?4'
  ).bind(eventId, link, eventId ? new Date().toISOString() : null, row.id).run()
  row.gcal_event_id = eventId
  row.gcal_link = link
  row.gcal_synced_at = eventId ? new Date().toISOString() : null
}

/*
  Put `row` in the calendar, keep it in step, or take it out — whichever its current state
  calls for. `onCalendar` is the caller's verdict on whether this booking belongs there at
  all (the office passes BOOKED_STATUSES.includes(row.status)), so the list of "real
  booking" statuses stays defined in exactly one place.

  Never throws. Mutates `row` with the calendar columns so callers can return them.
*/
export async function syncBookingCalendar(env, row, { onCalendar } = {}) {
  if (!row) return { ok: true, action: 'skipped', reason: 'no-row' }
  if (!calendarConfigured(env)) return { ok: true, action: 'skipped', reason: 'not-configured' }

  const calId = encodeURIComponent(env.GCAL_CALENDAR_ID)
  try {
    const body = onCalendar ? eventBody(row, env) : null

    // Cancelled, un-confirmed, or its date removed → the calendar entry must go.
    if (!body) {
      if (!row.gcal_event_id) return { ok: true, action: 'skipped', reason: 'not-booked' }
      const del = await calendarFetch(env, `/calendars/${calId}/events/${encodeURIComponent(row.gcal_event_id)}`,
        { method: 'DELETE' })
      // 404/410 = someone already deleted it in Google Calendar; the outcome is the same.
      if (!del.ok && del.status !== 404 && del.status !== 410) {
        return { ok: false, action: 'remove', error: `HTTP ${del.status}` }
      }
      await remember(env, row, null, null)
      return { ok: true, action: 'removed' }
    }

    if (row.gcal_event_id) {
      // PATCH, not PUT: anything the owner added to the event by hand in Google Calendar
      // (a guest, an attachment) survives our update.
      const up = await calendarFetch(env, `/calendars/${calId}/events/${encodeURIComponent(row.gcal_event_id)}`,
        { method: 'PATCH', body: JSON.stringify(body) })
      if (up.ok) {
        await remember(env, row, up.body.id || row.gcal_event_id, up.body.htmlLink || row.gcal_link)
        return { ok: true, action: 'updated' }
      }
      // Deleted on Google's side — fall through and make a fresh one.
      if (up.status !== 404 && up.status !== 410) return { ok: false, action: 'update', error: `HTTP ${up.status}` }
      row.gcal_event_id = null
    }

    // A booking whose date has already passed and that was never on the calendar gets
    // nothing new — there is no meeting left to be reminded about.
    if (trim(row.event_date).slice(0, 10) < today()) return { ok: true, action: 'skipped', reason: 'past' }

    const made = await calendarFetch(env, `/calendars/${calId}/events`, { method: 'POST', body: JSON.stringify(body) })
    if (!made.ok || !made.body.id) return { ok: false, action: 'create', error: `HTTP ${made.status}` }
    await remember(env, row, made.body.id, made.body.htmlLink || null)
    return { ok: true, action: 'created', link: row.gcal_link }
  } catch (err) {
    console.error('gcal sync failed for booking', row.id, err)
    return { ok: false, action: 'error', error: String(err && err.message || err) }
  }
}

// A booking being deleted outright: drop its calendar entry too, then let the caller
// delete the row. Never throws — a booking must always be deletable.
export async function removeBookingCalendar(env, row) {
  if (!row?.gcal_event_id || !calendarConfigured(env)) return { ok: true, action: 'skipped' }
  try {
    const del = await calendarFetch(env,
      `/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}/events/${encodeURIComponent(row.gcal_event_id)}`,
      { method: 'DELETE' })
    if (!del.ok && del.status !== 404 && del.status !== 410) return { ok: false, error: `HTTP ${del.status}` }
    return { ok: true, action: 'removed' }
  } catch (err) {
    console.error('gcal delete failed for booking', row.id, err)
    return { ok: false, error: String(err && err.message || err) }
  }
}

// Reachability probe for the dashboard's التقويم panel: does the key work and can we
// actually see the calendar the owner shared? Read-only.
export async function calendarProbe(env) {
  if (!calendarConfigured(env)) return { ok: false, reason: 'not-configured' }
  try {
    const res = await calendarFetch(env, `/calendars/${encodeURIComponent(env.GCAL_CALENDAR_ID)}`)
    if (!res.ok) {
      return {
        ok: false,
        reason: res.status === 404 ? 'not-shared' : `HTTP ${res.status}`,
        detail: res.body?.error?.message || '',
      }
    }
    return { ok: true, summary: res.body.summary || '', timeZone: res.body.timeZone || timezone(env) }
  } catch (err) {
    return { ok: false, reason: 'unreachable', detail: String(err && err.message || err) }
  }
}
