/* تقويم Google verification — end-to-end against a stub that speaks Google's protocol.

   Self-contained, unlike the other _v* tests: it generates a throwaway RSA key, starts a
   fake Google (token endpoint + Calendar v3) on 8899, and boots its own
   `wrangler pages dev` on 8797 with the GCAL_* vars layered on top of .dev.vars — so a
   normal dev session stays un-configured (calendar = a no-op) and nothing on disk changes.

   Run: `npm run build && node _vcal.mjs`

   The stub verifies our RS256 JWT with the public key, so a broken signature fails
   everything rather than silently passing.
*/
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { generateKeyPairSync, createVerify } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = 'http://localhost:8797'
const STUB_PORT = 8899
const CAL_ID = 'sarab-test@group.calendar.google.com'
const SCRATCH = '/tmp/claude-1000/-home-admin9-HADDAD-TECH-PROJECTS-sarab-website/f9c81c0e-8868-4ba7-b177-3d0620a83ce2/scratchpad'

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })

// ---------- fake Google ----------
const events = new Map()          // eventId → event body
let nextId = 1
let failMode = false              // simulate a Google outage
let tokenCalls = 0
let badJwt = null

const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

const stub = createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => raw += c)
  req.on('end', () => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(obj === undefined ? '' : JSON.stringify(obj))
    }
    const url = new URL(req.url, 'http://x')
    const path = decodeURIComponent(url.pathname)

    if (path === '/__control') {                       // test-only knobs
      if (url.searchParams.has('fail')) failMode = url.searchParams.get('fail') === '1'
      return send(200, { failMode, events: [...events.values()], tokenCalls, badJwt })
    }
    if (failMode) return send(503, { error: 'stub outage' })

    if (path === '/token') {
      tokenCalls++
      const assertion = new URLSearchParams(raw).get('assertion') || ''
      const [h, p, sig] = assertion.split('.')
      const ok = h && p && sig && createVerify('RSA-SHA256')
        .update(`${h}.${p}`).verify(publicKey, b64urlDecode(sig))
      const claim = p ? JSON.parse(b64urlDecode(p).toString()) : {}
      if (!ok || claim.iss !== 'sarab-bot@test.iam.gserviceaccount.com') {
        badJwt = `sigOk=${ok} iss=${claim.iss}`
        return send(401, { error: 'invalid_grant' })
      }
      return send(200, { access_token: 'stub-token', expires_in: 3600, token_type: 'Bearer' })
    }

    if (!/^Bearer stub-token$/.test(req.headers.authorization || '')) return send(401, { error: 'unauthorized' })

    const m = /^\/calendars\/([^/]+)(?:\/events(?:\/(.+))?)?$/.exec(path)
    if (!m) return send(404, { error: { message: 'no such route' } })
    if (m[1] !== CAL_ID) return send(404, { error: { message: 'Not Found' } })

    if (!path.includes('/events')) return send(200, { summary: 'SARAB — الحجوزات', timeZone: 'Asia/Jerusalem' })

    const id = m[2]
    if (req.method === 'POST') {
      const ev = { ...JSON.parse(raw), id: `ev${nextId++}`, htmlLink: `https://calendar.google.com/event?eid=ev${nextId - 1}` }
      events.set(ev.id, ev)
      return send(200, ev)
    }
    if (req.method === 'PATCH') {
      if (!events.has(id)) return send(404, { error: { message: 'Not Found' } })
      const ev = { ...events.get(id), ...JSON.parse(raw) }
      events.set(id, ev)
      return send(200, ev)
    }
    if (req.method === 'DELETE') {
      if (!events.has(id)) return send(404, { error: { message: 'Not Found' } })
      events.delete(id)
      return send(204)
    }
    return send(405, { error: 'method' })
  })
})
await new Promise((r) => stub.listen(STUB_PORT, '127.0.0.1', r))

// ---------- our server, configured to talk to it ----------
// `--binding` is the only switch that actually reaches the Worker's `env` in
// `pages dev` (--env-file is parsed but never bound). ACCESS_DEV_BYPASS still comes
// from .dev.vars, which pages dev loads on its own. Literal \n in the key is fine —
// shared/gcal.js accepts the escaped form the service-account JSON uses.
mkdirSync(SCRATCH, { recursive: true })
const server = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', '8797', '--log-level', 'warn',
  '--binding',
  'GCAL_CLIENT_EMAIL=sarab-bot@test.iam.gserviceaccount.com',
  `GCAL_PRIVATE_KEY=${pem.replace(/\n/g, '\\n')}`,
  `GCAL_CALENDAR_ID=${CAL_ID}`,
  `GCAL_TOKEN_URL=http://127.0.0.1:${STUB_PORT}/token`,
  `GCAL_API_BASE=http://127.0.0.1:${STUB_PORT}`,
  'GCAL_TIMEZONE=Asia/Jerusalem',
], { stdio: 'ignore' })

const shutdown = () => { try { server.kill('SIGTERM') } catch {} ; try { stub.close() } catch {} }
process.on('exit', shutdown)

const control = (qs = '') => fetch(`http://127.0.0.1:${STUB_PORT}/__control${qs}`).then((r) => r.json())
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(j)
const get = (path) => fetch(BASE + path).then(j)

for (let i = 0; ; i++) {
  try { await get('/office/api/meta'); break } catch {
    if (i > 60) { shutdown(); throw new Error('wrangler pages dev never came up on 8797') }
    await new Promise((r) => setTimeout(r, 1000))
  }
}

const iso = (days) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10)
const results = {}
try {
  // 1) The panel sees a healthy, reachable calendar (and the JWT was accepted).
  const status0 = await get('/office/api/calendar')
  results.connected = status0.configured && status0.probe.ok && status0.probe.summary === 'SARAB — الحجوزات'

  // 2) A confirmed booking lands in the calendar, with the right shape.
  const made = await send('/office/api/bookings', {
    name: 'اختبار التقويم', phone: '0500000111', status: 'مؤكد', event_date: iso(30),
    start_time: '19:00', hours: 5, city: 'سخنين', venue: 'قاعة الاختبار', occasion: 'عرس',
    price: 900, deposit: 300, remaining: 600, staff: 'ندى، رامي', staff_count: 2,
  })
  const bkId = made.row.id
  let st = await control()
  const ev = st.events.find((e) => e.extendedProperties?.private?.sarab_booking_id === String(bkId))
  if (!ev) console.error('DEBUG no event:\n status=', JSON.stringify(status0),
    '\n calendar=', JSON.stringify(made.calendar), '\n stub=', JSON.stringify(st))
  results.created = made.calendar?.action === 'created' && !!ev
  results.eventShape = !!ev
    && ev.summary === 'SARAB · اختبار التقويم — عرس'
    && ev.start.dateTime === `${iso(30)}T19:00:00` && ev.start.timeZone === 'Asia/Jerusalem'
    && ev.end.dateTime === `${iso(31)}T00:00:00`   // 19:00 + 5 ساعات → منتصف ليل اليوم التالي
    && ev.location === 'قاعة الاختبار — سخنين'
    && ev.reminders.useDefault === true && ev.colorId === '10'
    && ev.description.includes('العميل: اختبار التقويم · 0500000111')
    && ev.description.includes('الطاقم: ندى، رامي (2 عمال)')
  results.rowLinked = !!ev && made.row.gcal_event_id === ev.id && !!made.row.gcal_link
    && (await get('/office/api/bookings/' + bkId)).row.gcal_event_id === ev.id

  // 3) Editing the booking moves the same event — no duplicate.
  const moved = await send('/office/api/bookings/' + bkId, { event_date: iso(31), venue: 'قاعة أخرى' }, 'PATCH')
  st = await control()
  const ev2 = st.events.find((e) => e.id === ev.id)
  results.updated = moved.calendar?.action === 'updated' && st.events.length === 1
    && ev2.start.dateTime.startsWith(iso(31)) && ev2.location === 'قاعة أخرى — سخنين'

  // 4) Cancelling takes it back out, and the booking forgets the link.
  const cancelled = await send('/office/api/bookings/' + bkId, { status: 'ملغي' }, 'PATCH')
  st = await control()
  results.removedOnCancel = cancelled.calendar?.action === 'removed' && st.events.length === 0
    && cancelled.row.gcal_event_id === null

  // 5) Re-confirming puts it back.
  const reconf = await send('/office/api/bookings/' + bkId, { status: 'مؤكد' }, 'PATCH')
  st = await control()
  results.reAdded = reconf.calendar?.action === 'created' && st.events.length === 1

  // 6) No وقت البداية → an all-day entry on the event's date.
  const allDay = await send('/office/api/bookings', {
    name: 'بدون وقت', phone: '0500000222', status: 'دفع العربون', event_date: iso(40), city: 'حيفا',
  })
  st = await control()
  const evAll = st.events.find((e) => e.extendedProperties?.private?.sarab_booking_id === String(allDay.row.id))
  results.allDay = !!evAll && evAll.start.date === iso(40) && evAll.end.date === iso(41)
    && !evAll.start.dateTime && evAll.colorId === '7'

  // 7) A confirmed booking whose date already passed gets nothing new.
  const past = await send('/office/api/bookings', {
    name: 'مناسبة ماضية', phone: '0500000333', status: 'مكتمل', event_date: iso(-20), city: 'الناصرة',
  })
  results.pastSkipped = past.calendar?.action === 'skipped' && past.calendar.reason === 'past'
    && past.row.gcal_event_id === null

  // 8) Google down: the booking still saves, in full, and says so.
  await control('?fail=1')
  const duringOutage = await send('/office/api/bookings/' + bkId, { price: 1234, notes: 'حُفظ أثناء العطل' }, 'PATCH')
  results.savesDuringOutage = duringOutage.ok === true && duringOutage.row.price === 1234
    && duringOutage.row.notes === 'حُفظ أثناء العطل' && duringOutage.calendar?.ok === false
  const bornOffline = await send('/office/api/bookings', {
    name: 'وُلد أثناء العطل', phone: '0500000444', status: 'مؤكد', event_date: iso(50), city: 'عكا',
  })
  await control('?fail=0')

  // 9) The التقويم panel reports the gap, and «مزامنة الآن» closes it.
  const gap = await get('/office/api/calendar')
  results.gapReported = gap.pending >= 1 && gap.pending_rows.some((r) => r.id === bornOffline.row.id && r.action === 'add')
  const synced = await send('/office/api/calendar', {})
  const after = await get('/office/api/calendar')
  results.backfilled = synced.added >= 1 && synced.failed === 0 && after.pending === 0
  st = await control()
  results.offlineOneNowThere = st.events.some((e) => e.extendedProperties?.private?.sarab_booking_id === String(bornOffline.row.id))

  // 10) Pressing it again changes nothing (idempotent).
  const again = await send('/office/api/calendar', {})
  const stAgain = await control()
  results.idempotent = again.added === 0 && again.removed === 0 && stAgain.events.length === st.events.length

  // 11) Deleting a booking takes its event with it.
  const evCount = stAgain.events.length
  await fetch(BASE + '/office/api/bookings/' + bkId, { method: 'DELETE' })
  st = await control()
  results.deletedWithBooking = st.events.length === evCount - 1
    && !st.events.some((e) => e.extendedProperties?.private?.sarab_booking_id === String(bkId))

  // 12) The dashboard's التقويم box shows the healthy state, with no console errors.
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })
  await page.locator('#calBtn').click()
  await page.waitForFunction(() => document.querySelector('#calBox')?.textContent.includes('متصل'), { timeout: 10000 })
  const calText = await page.locator('#calBox').textContent()
  await page.screenshot({ path: 'docs/styleframes/voffice-calendar.png' })
  results.panelHealthy = calText.includes('متصل بتقويم «SARAB — الحجوزات»') && calText.includes('موجودة في التقويم')
  await page.locator('#calHide').click()
  results.panelHides = !(await page.locator('#calBox').isVisible())
  await browser.close()

  results.jwtAlwaysValid = (await control()).badJwt === null
  results.consoleErrors = errors
} finally {
  // Leave nothing behind in the local DB for the next test run.
  for (const q of ['اختبار التقويم', 'بدون وقت', 'مناسبة ماضية', 'وُلد أثناء العطل']) {
    const r = await get('/office/api/bookings?q=' + encodeURIComponent(q)).catch(() => ({ rows: [] }))
    for (const row of r.rows || []) await fetch(BASE + '/office/api/bookings/' + row.id, { method: 'DELETE' }).catch(() => {})
  }
  shutdown()
}

const pass = Object.entries(results).every(([k, v]) => k === 'consoleErrors' ? v.length === 0 : v === true)
console.log(JSON.stringify(results, null, 2))
console.log(pass ? '\nPASS' : '\nFAIL')
process.exit(pass ? 0 : 1)
