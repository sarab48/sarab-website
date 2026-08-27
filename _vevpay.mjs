/* Payments inside the event P&L row (2026-08-27): the finance payload carries every
   ledger payment keyed by booking_no (payByBooking), and expanding a client's row in
   أرباح ومصاريف المناسبات lists each payment as kind — amount — method with a total;
   a row with no payments (or no booking link) shows the explanatory note instead.
   Run against `wrangler pages dev dist --port 8798` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8798'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

// A completed booking → auto booking_no + seeded P&L row.
const bk = (await send('/office/api/bookings', {
  first_name: 'فحص', last_name: 'دفعات السطر', phone: '0500000099',
  status: 'مكتمل', price: 1500, event_date: '2026-08-20', city: 'حيفا',
})).row
const bno = bk.booking_no
const seededPaid = ((await fetch(BASE + '/office/api/finance').then(j)).events
  .find((e) => e.booking_no === bno) || {}).paid || 0

// Three ledger payments: advance by bit, a bank-transfer payment with a ref, a tip.
await send('/office/api/payments', { booking_id: bk.id, kind: 'عربون', amount: 300, method: 'bit', paid_on: '2026-08-01' })
await send('/office/api/payments', { booking_id: bk.id, kind: 'دفعة', amount: 500, method: 'تحويل بنكي', method_ref: 'REF-9188', paid_on: '2026-08-20' })
await send('/office/api/payments', { booking_id: bk.id, kind: 'إكرامية', amount: 100, method: 'نقدي', paid_on: '2026-08-20' })

// A manual P&L row with a number no booking has — must show the "no payments" note.
let fin = await send('/office/api/finance', { table: 'event', booking_no: 'TEST-NP', client: 'بلا دفعات', price: 900 })
const noPayRow = fin.events.find((e) => e.booking_no === 'TEST-NP')

const ps = (fin.payByBooking || {})[bno] || []
const apiCarries = ps.length === 3 && ps[0].kind === 'عربون' && ps[0].amount === 300 && ps[0].method === 'bit'
const evRow = fin.events.find((e) => e.booking_no === bno)
// The ledger's exact-delta sync: +300 +500, the tip moves nothing.
const paidSynced = !!evRow && evRow.paid === seededPaid + 800

// UI: expand the client's row → payments listed; expand the unlinked row → the note.
const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(String(e)))
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.click('button[data-tab="finance"]')
await page.waitForSelector('#finev table', { state: 'attached' })
await page.evaluate(() => document.querySelectorAll('details.sec').forEach((d) => d.open = true))
await page.evaluate((no) =>
  [...document.querySelectorAll('#finev tr.frow')].find((x) => x.textContent.includes(no)).click(), bno)
await page.waitForSelector('#finev tr.fedit .evpays')
const txt = await page.$eval('#finev tr.fedit .evpays', (el) => el.textContent)
const listShown = txt.includes('عربون') && txt.includes('bit') && txt.includes('300')
  && txt.includes('تحويل بنكي') && txt.includes('REF-9188') && txt.includes('500')
const tipShown = txt.includes('إكرامية') && txt.includes('100') && txt.includes('خارج حساب')
const totalShown = txt.includes('800')
const editorStill = await page.$$eval('#finev tr.fedit input[data-k]', (is) => is.length > 0)
await page.evaluate(() =>
  [...document.querySelectorAll('#finev tr.frow')].find((x) => x.textContent.includes('TEST-NP')).click())
await page.waitForSelector('#finev tr.fedit .evpays')
const noneTxt = await page.$eval('#finev tr.fedit .evpays', (el) => el.textContent)
const emptyNote = noneTxt.includes('لا دفعات مسجّلة')
await browser.close()

// Cleanup: manual P&L row, the booking's seeded P&L row, then the booking
// (its payments go with it).
await send('/office/api/finance', { table: 'event', id: noPayRow.id }, 'DELETE')
if (evRow) await send('/office/api/finance', { table: 'event', id: evRow.id }, 'DELETE')
await fetch(`${BASE}/office/api/bookings/${bk.id}`, { method: 'DELETE' }).then(j)

const results = {
  'finance payload carries payByBooking (3 rows, ordered)': apiCarries,
  'P&L paid synced by the +800 delta (tip excluded)': paidSynced,
  'expanded row lists kind — amount — method per payment': listShown,
  'tip flagged as outside the booking account': tipShown,
  'total of real payments shown (800)': totalShown,
  'row editor inputs still present under the list': editorStill,
  'unlinked/no-payment row shows the note': emptyNote,
  'no page errors': pageErrors.length === 0,
}
console.table(results)
if (Object.values(results).some((v) => !v)) { console.error(pageErrors); process.exit(1) }
console.log('✓ payments-in-P&L-row verified, test rows removed')
