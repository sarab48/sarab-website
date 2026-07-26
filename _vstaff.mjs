/* طاقم المناسبة verification: a booking stores the worker name(s) + how many workers;
   the count is coerced to a whole number; the names already used come back as the
   الطاقم datalist; the grid shows a الطاقم column; and in the drawer عدد العمال follows
   the names typed until it is set by hand (then the manual value wins).
   Run against `wrangler pages dev dist --port 8791` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8791'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

// 1) create with both fields
const b1 = await send('/office/api/bookings', {
  name: 'اختبار الطاقم', phone: '0509876543', city: 'حيفا', status: 'مؤكد',
  event_date: '2027-01-15', staff: 'وسيم، ندى', staff_count: 2,
})
const created = b1.ok && b1.row.staff === 'وسيم، ندى' && b1.row.staff_count === 2

// 2) PATCH: a decimal count rounds to a whole number, empty clears to null
const p1 = await send('/office/api/bookings/' + b1.row.id, { staff_count: '3.4' }, 'PATCH')
const p2 = await send('/office/api/bookings/' + b1.row.id, { staff: 'وسيم', staff_count: '' }, 'PATCH')
const coerced = p1.row.staff_count === 3 && p2.row.staff_count === null && p2.row.staff === 'وسيم'

// 3) a booking saved with no staff keeps both null (nothing invented)
const b2 = await send('/office/api/bookings', { name: 'بلا طاقم', phone: '0509876500', status: 'استفسار' })
const emptyOk = b2.row.staff === null && b2.row.staff_count === null

// 4) meta offers each worker name separately, split out of the stored strings
await send('/office/api/bookings/' + b2.row.id, { staff: 'ندى / رامي' }, 'PATCH')
const meta = await j(await fetch(BASE + '/office/api/meta'))
const datalist = Array.isArray(meta.staff)
  && ['وسيم', 'ندى', 'رامي'].every((n) => meta.staff.includes(n))
  && !meta.staff.some((n) => n.includes('/'))

// 5) UI
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

// grid column present, and the test booking's row shows its worker
const headers = await page.locator('#grid thead th').allInnerTexts()
const gridCell = await page.locator(`#grid tbody tr[data-id="${b1.row.id}"] td`).last().innerText().catch(() => '')
const gridShows = headers.includes('الطاقم') && gridCell.includes('وسيم')

// existing booking opens with its saved values
await page.locator(`#grid tbody tr[data-id="${b1.row.id}"]`).click()
await page.waitForTimeout(400)
const loaded = await page.inputValue('#f_staff') === 'وسيم'

// new booking: عدد العمال follows the names…
await page.locator('#closeBtn').click()
await page.waitForTimeout(300)
await page.locator('#newBtn').click()
await page.waitForTimeout(300)
await page.fill('#f_staff', 'أحمد، سارة، ليان')
const autoCount = await page.inputValue('#f_staff_count')
// …until it is set by hand — then the manual number stays put
await page.fill('#f_staff_count', '5')
await page.fill('#f_staff', 'أحمد')
const manualWins = await page.inputValue('#f_staff_count')
await page.screenshot({ path: 'docs/styleframes/vstaff-drawer.png' })
await page.locator('#closeBtn').click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'docs/styleframes/vstaff-grid.png' })

// the extra column must not disturb the compact phone rows (name+date / city+status):
// still exactly 4 visible cells per row, الطاقم among the hidden ones
await page.setViewportSize({ width: 390, height: 780 })
await page.waitForTimeout(400)
const row = page.locator(`#grid tbody tr[data-id="${b1.row.id}"]`)
const visibleCells = await row.locator('td').evaluateAll((tds) =>
  tds.filter((td) => getComputedStyle(td).display !== 'none').map((td) => td.dataset.l))
const mobileOk = visibleCells.length === 4 && !visibleCells.includes('الطاقم')
await page.screenshot({ path: 'docs/styleframes/vstaff-mobile.png' })
await page.setViewportSize({ width: 1440, height: 950 })
await page.waitForTimeout(300)
await page.locator(`#grid tbody tr[data-id="${b1.row.id}"]`).click()
await page.waitForTimeout(400)
await page.locator('#closeBtn').click()
await page.waitForTimeout(300)
await page.locator('#newBtn').click()
await page.waitForTimeout(300)
await page.fill('#f_staff', 'أحمد')
await page.fill('#f_staff_count', '5')

// saving from the drawer round-trips both fields
await page.fill('#f_first_name', 'حفظ')
await page.fill('#f_last_name', 'الطاقم')
await page.fill('#f_phone', '0509876544')
await page.locator('#saveBtn').click()
await page.waitForTimeout(1200)
await browser.close()

const list = await j(await fetch(BASE + '/office/api/bookings?q=0509876544'))
const saved = list.rows[0]
const savedOk = !!saved && saved.staff === 'أحمد' && saved.staff_count === 5

// cleanup
for (const id of [b1.row.id, b2.row.id, saved?.id].filter(Boolean))
  await fetch(BASE + '/office/api/bookings/' + id, { method: 'DELETE' })

const pass = created && coerced && emptyOk && datalist && gridShows && loaded
  && autoCount === '3' && manualWins === '5' && mobileOk && savedOk && errors.length === 0
console.log(JSON.stringify({ pass, created, coerced, emptyOk, datalist, staffList: meta.staff,
  gridShows, gridCell, loaded, autoCount, manualWins, mobileOk, visibleCells, savedOk, errors }, null, 1))
console.log(pass ? 'VSTAFF PASS' : 'VSTAFF FAIL')
process.exit(pass ? 0 : 1)
