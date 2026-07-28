/* المالية verification: a lead that arrives without a رقم حجز (website form / واتساب) and is
   later marked مكتمل must reach the finance list — it gets the next SARAB-NNN and a seeded
   P&L row. Also: the seeding is idempotent, any completed event still missing from the list
   is reported in `missing`, and the tab's «أضف للمالية» button fills the gap.
   Run against `wrangler pages dev dist --port 8793` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8793'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)
const get = (path) => fetch(BASE + path).then(j)

// A website lead: no booking_no, status استفسار — exactly the shape that used to fall out.
const lead = await send('/api/book', {
  name: 'رودينا اختبار', phone: '0501112233', date: '2026-07-28', location: 'سخنين',
})
const row0 = await get('/office/api/bookings?q=رودينا اختبار')
const bk = row0.rows[0]
const startsNumberless = lead.ok && bk && bk.booking_no === null && bk.status === 'استفسار'

// Owner fills the money in and marks it مكتمل → number assigned + finance row seeded.
const done = await send(`/office/api/bookings/${bk.id}`, {
  status: 'مكتمل', price: 850, deposit: 850, remaining: 0, city: 'سخنين',
}, 'PATCH')
const numbered = /^SARAB-\d{3}$/.test(done.row.booking_no || '')
let fin = await get('/office/api/finance')
const seeded = fin.events.find((e) => e.booking_no === done.row.booking_no)
const seededRight = !!seeded && seeded.price === 850 && seeded.paid === 850
  && seeded.client === 'رودينا اختبار' && seeded.city === 'سخنين' && seeded.net_profit === 850

// Re-saving must not duplicate the row, nor renumber the booking.
const again = await send(`/office/api/bookings/${bk.id}`, { status: 'مكتمل' }, 'PATCH')
fin = await get('/office/api/finance')
const noDupe = fin.events.filter((e) => e.booking_no === done.row.booking_no).length === 1
  && again.row.booking_no === done.row.booking_no

// The owner's own numbers keep their edits: costs entered by hand survive a re-save.
await send('/office/api/finance', { table: 'event', id: seeded.id, printing: 160, transport: 30 }, 'PATCH')
await send(`/office/api/bookings/${bk.id}`, { status: 'مكتمل' }, 'PATCH')
fin = await get('/office/api/finance')
const kept = fin.events.find((e) => e.id === seeded.id)
const editsKept = kept.printing === 160 && kept.total_expenses === 190 && kept.net_profit === 660

// A completed event with no P&L row is reported — and the catch-up POST closes the gap.
await send('/office/api/finance', { table: 'event', id: seeded.id }, 'DELETE')
fin = await get('/office/api/finance')
const reported = (fin.missing || []).some((m) => m.id === bk.id && m.booking_no === done.row.booking_no)
fin = await send('/office/api/finance', { from_booking: bk.id })
const refilled = !(fin.missing || []).some((m) => m.id === bk.id)
  && fin.events.some((e) => e.booking_no === done.row.booking_no && e.paid === 850)

// A booking that is not مكتمل is never seeded and never reported.
const soon = await send('/office/api/bookings', {
  name: 'حجز قادم اختبار', phone: '0501112244', status: 'مؤكد', price: 1000, deposit: 300,
  remaining: 700, event_date: '2027-03-03', city: 'حيفا',
})
fin = await get('/office/api/finance')
const onlyCompleted = !fin.events.some((e) => e.booking_no === soon.row.booking_no)
  && !(fin.missing || []).some((m) => m.id === soon.row.id)
  && fin.advances.some((a) => a.booking_no === soon.row.booking_no)

// UI: the alert + button appear only while a gap exists, and clicking it clears the gap.
await send('/office/api/finance', { table: 'event', id: fin.events.find((e) => e.booking_no === done.row.booking_no).id }, 'DELETE')
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.click('button[data-tab="finance"]')
await page.waitForSelector('#finmiss .finadd', { timeout: 15000 })
const alertShown = (await page.textContent('#finmiss .verdict')).includes('غير مُدرجة')
  && (await page.textContent('#finmiss tbody')).includes('رودينا اختبار')
await page.click('#finmiss .finadd')
await page.waitForSelector('#finmiss', { state: 'detached', timeout: 15000 })
const rowLanded = (await page.textContent('#finev tbody')).includes('رودينا اختبار')
await page.screenshot({ path: '/tmp/claude-1000/-home-admin9-HADDAD-TECH-PROJECTS-sarab-website/39be4677-4f1a-471e-8003-b1d7945356ef/scratchpad/finance-tab.png', fullPage: true })
await browser.close()

const checks = {
  'lead starts with no رقم حجز': startsNumberless,
  'مكتمل assigns SARAB-NNN': numbered,
  'finance row seeded from the booking': seededRight,
  'idempotent — no duplicate, no renumber': noDupe,
  'owner edits survive a re-save': editsKept,
  'gap reported in missing': reported,
  'أضف للمالية closes the gap': refilled,
  'non-completed stays out (advances only)': onlyCompleted,
  'tab shows the alert + client': alertShown,
  'clicking it lands the row in the P&L table': rowLanded,
  'no console errors': errors.length === 0,
}
for (const [k, v] of Object.entries(checks)) console.log((v ? '✓ ' : '✗ ') + k)
if (errors.length) console.log(errors.join('\n'))
console.log(Object.values(checks).every(Boolean) ? '\nALL PASS' : '\nFAILURES')
process.exit(Object.values(checks).every(Boolean) ? 0 : 1)
