/* التحليلات verification — confirmed-bookings totals with year/month filtering.
   Seeds bookings in two years no other data touches (2003 held, 2031 upcoming), then
   checks the الحجوزات المؤكدة KPIs, the year/month chips, the السنوات table, the
   month drill-down, and that filtering rescopes the overview. Cleans up after itself.

   Run against `wrangler pages dev dist --port 8794` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8794'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }

// First KPI strip inside التحليلات = the confirmed-bookings row:
// [total, upcoming, held, revenue, upcoming_revenue, outstanding]
const bookedKpis = (page) => page.locator('#insights section.kpis').first().locator('.kpi b').allTextContents()

const results = {}
let browser
try {
  // 2031: three real bookings (4,500 ₪, 900 ₪ still to collect) + one استفسار that must not count.
  await seed({ name: 'تحليل أ', phone: '0590000011', status: 'مؤكد', event_date: '2031-05-10', price: 1000, remaining: 400 })
  await seed({ name: 'تحليل ب', phone: '0590000012', status: 'دفع العربون', event_date: '2031-05-20', price: 2000, remaining: 500 })
  await seed({ name: 'تحليل ج', phone: '0590000013', status: 'مؤكد', event_date: '2031-08-15', price: 1500, remaining: 0 })
  await seed({ name: 'تحليل د', phone: '0590000014', status: 'استفسار', event_date: '2031-05-11' })
  // 2003: one booking whose date passed → held, never upcoming.
  await seed({ name: 'تحليل هـ', phone: '0590000015', status: 'مؤكد', event_date: '2003-06-10', price: 800 })

  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })
  await page.locator('#tabs button[data-tab="insights"]').click()
  await page.waitForSelector('#insights .chip[data-year]', { timeout: 10000 })

  // Unfiltered: كل السنوات is on, both seeded years show as chips with their counts,
  // and the السنوات table carries a totals row.
  results.allChipDefault = await page.locator('#insights .chip[data-year=""].on').count() === 1
  results.yearChips = (await page.locator('#insights .chip[data-year="2031"]').textContent()).includes('(3)')
    && (await page.locator('#insights .chip[data-year="2003"]').textContent()).includes('(1)')
  results.yearsTable = (await page.locator('#insights tr[data-yrow]').count()) >= 2
    && (await page.locator('#insights tr[data-yrow="2031"]').textContent()).includes('4,500')
  results.noMonthChipsYet = (await page.locator('#insights .chip[data-month]').count()) === 0

  // Filter to 2031: totals become that year's — 3 confirmed, all upcoming, 900 ₪ to collect —
  // and the month chips + أشهر table appear.
  await page.locator('#insights .chip[data-year="2031"]').click()
  await page.waitForSelector('#insights .chip[data-month]', { timeout: 10000 })
  let k = await bookedKpis(page)
  results.year2031Kpis = k[0] === '3' && k[1] === '3' && k[2] === '0'
    && k[3] === '4,500 ₪' && k[4] === '4,500 ₪' && k[5] === '900 ₪'
  results.monthChips = (await page.locator('#insights .chip[data-month="2031-05"]').textContent()).includes('أيار')
    && (await page.locator('#insights .chip[data-month="2031-05"]').textContent()).includes('(2)')
    && (await page.locator('#insights .chip[data-month="2031-08"]').textContent()).includes('آب')
  results.monthsTable = (await page.locator('#insights tr[data-mrow]').count()) === 2
  // Overview rescopes too: 4 clients with a 2031 event (3 booked + the استفسار), 75% conversion.
  const overview = await page.locator('#insights section.kpis').nth(1).locator('.kpi b').allTextContents()
  results.overviewScoped = overview[0] === '4' && overview[1] === '3' && overview[2] === '75%'

  // Drill into أيار: 2 bookings, 3,000 ₪, the 900 ₪ outstanding lives here.
  await page.locator('#insights .chip[data-month="2031-05"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-month="2031-05"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await bookedKpis(page)
  results.monthKpis = k[0] === '2' && k[1] === '2' && k[3] === '3,000 ₪' && k[5] === '900 ₪'
  // The أشهر table still lists the whole year while أيار is selected.
  results.monthTableKeepsYear = (await page.locator('#insights tr[data-mrow]').count()) === 2

  // Clicking the آب row switches the month filter to it.
  await page.locator('#insights tr[data-mrow="2031-08"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-month="2031-08"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await bookedKpis(page)
  results.rowSwitchesMonth = k[0] === '1' && k[3] === '1,500 ₪'

  // 2003 is all held, nothing upcoming, nothing to collect.
  await page.locator('#insights .chip[data-year="2003"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-year="2003"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await bookedKpis(page)
  results.heldYear = k[0] === '1' && k[1] === '0' && k[2] === '1' && k[3] === '800 ₪' && k[5] === '0 ₪'

  // Back to everything.
  await page.locator('#insights .chip[data-year=""]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-year=""]')?.classList.contains('on'), null, { timeout: 10000 })
  results.backToAll = (await page.locator('#insights .chip[data-month]').count()) === 0

  await page.screenshot({ path: 'docs/styleframes/vinsights-desktop.png', fullPage: false })

  // Phone: no horizontal overflow on the analytics tab.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
  phone.on('pageerror', (e) => errors.push('phone pageerror: ' + e.message))
  await phone.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await phone.locator('#tabs button[data-tab="insights"]').click()
  await phone.waitForSelector('#insights .chip[data-year]', { timeout: 10000 })
  results.phoneNoOverflow = await phone.evaluate(() => document.documentElement.scrollWidth <= 391)
  await phone.screenshot({ path: 'docs/styleframes/vinsights-phone.png' })

  results.consoleErrors = errors
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of seeded) await fetch(BASE + '/office/api/bookings/' + id, { method: 'DELETE' }).catch(() => {})
}

const pass = Object.entries(results).every(([k, v]) => k === 'consoleErrors' ? v.length === 0 : v === true)
console.log(JSON.stringify(results, null, 2))
console.log(pass ? '\nPASS' : '\nFAIL')
process.exit(pass ? 0 : 1)
