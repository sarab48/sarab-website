/* photos_taken + bank verification (2026-08-27): the two info-only fields on the event
   P&L row save, edit, and clear through the API without ever touching total_expenses or
   net_profit, and the المالية tab shows them — as columns, in the tfoot sums, and as
   inputs in the row editor.
   Run against `wrangler pages dev dist --port 8796` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8796'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

// New row with both fields + real costs: totals must count the costs only.
let fin = await send('/office/api/finance', {
  table: 'event', booking_no: 'TEST-PB', client: 'فحص صور وبنك', price: 3000, paid: 2000,
  worker1: 400, printing: 100, photos_taken: 421, bank: 900,
})
let row = fin.events.find((e) => e.booking_no === 'TEST-PB')
const storedRight = !!row && row.photos_taken === 421 && row.bank === 900
const totalsClean = !!row && row.total_expenses === 500 && row.net_profit === 1500

// Edit one, clear the other — totals must not move.
fin = await send('/office/api/finance', { table: 'event', id: row.id, photos_taken: 600, bank: '' }, 'PATCH')
row = fin.events.find((e) => e.id === row.id)
const editWorks = !!row && row.photos_taken === 600 && row.bank === null && row.net_profit === 1500

// UI: columns + values + tfoot + editor inputs.
const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(String(e)))
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.click('button[data-tab="finance"]')
await page.waitForSelector('#finev table', { state: 'attached' })
await page.evaluate(() => document.querySelectorAll('details.sec').forEach((d) => d.open = true))
const head = await page.$$eval('#finev thead th', (ths) => ths.map((t) => t.textContent.trim()))
const columnsShown = head.includes('BANK') && head.some((h) => h.includes('الصور'))
const cells = await page.$$eval('#finev tbody tr.frow', (trs) => {
  const t = trs.find((x) => x.textContent.includes('TEST-PB'))
  return t ? [...t.children].map((c) => c.textContent.trim()) : null
})
const valuesShown = !!cells && cells.includes('600')
const foot = await page.$$eval('#finev tfoot td', (tds) => tds.map((t) => t.textContent.trim()))
const footSums = foot.length === 10 - 3 && foot.some((t) => t === '600' || t.includes('600'))
await page.evaluate(() =>
  [...document.querySelectorAll('#finev tr.frow')].find((x) => x.textContent.includes('TEST-PB')).click())
await page.waitForSelector('#finev tr.fedit')
const inputs = await page.$$eval('#finev tr.fedit input[data-k]',
  (is) => Object.fromEntries(is.map((i) => [i.dataset.k, i.value])))
const editorShows = inputs.photos_taken === '600' && inputs.bank === ''
await browser.close()

await send('/office/api/finance', { table: 'event', id: row.id }, 'DELETE')

const results = {
  'photos_taken + bank stored on POST': storedRight,
  'totals ignore them (expenses 500, net 1500)': totalsClean,
  'PATCH edits one and clears the other, net stable': editWorks,
  'table shows the two new columns': columnsShown,
  'row renders the values': valuesShown,
  'tfoot sums them': footSums,
  'row editor has both inputs': editorShows,
  'no page errors': pageErrors.length === 0,
}
console.table(results)
if (Object.values(results).some((v) => !v)) { console.error(pageErrors); process.exit(1) }
console.log('✓ photos_taken + bank verified, test row removed')
