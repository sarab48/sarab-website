/* التحليلات verification — confirmed-bookings totals with year/month filtering.
   Owner's rule: دفع العربون is NOT confirmed — counted and valued separately.
   Seeds bookings in two years no other data touches (2003 held, 2031 upcoming), then
   checks the الحجوزات المؤكدة KPIs, the separate العربون strip, the year/month chips,
   the السنوات/أشهر tables, the للتحصيل call list, the بيانات ناقصة helper, the
   header-KPI split, the CSV export, and that filtering rescopes the overview.
   Cleans up after itself.

   Run against `wrangler pages dev dist --port 8794` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8794'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }

// KPI strips inside التحليلات: 0 = الحجوزات المؤكدة, 1 = دفع العربون, 2 = نظرة عامة.
const strip = (page, i) => page.locator('#insights section.kpis').nth(i).locator('.kpi b').allTextContents()

const results = {}
let browser
try {
  // 2031: two confirmed (2,500 ₪; أ still owes 400) + one عربون (2,000 ₪ full, 500 paid,
  // 1,500 open) + one استفسار that must count nowhere.
  await seed({ name: 'تحليل أ', phone: '0590000011', status: 'مؤكد', event_date: '2031-05-10', price: 1000, remaining: 400 })
  await seed({ name: 'تحليل ب', phone: '0590000012', status: 'دفع العربون', event_date: '2031-05-20', price: 2000, deposit: 500, remaining: 1500 })
  await seed({ name: 'تحليل ج', phone: '0590000013', status: 'مؤكد', event_date: '2031-08-15', price: 1500, remaining: 0 })
  await seed({ name: 'تحليل د', phone: '0590000014', status: 'استفسار', event_date: '2031-05-11' })
  // 2003: one confirmed whose date passed → held, never upcoming.
  await seed({ name: 'تحليل هـ', phone: '0590000015', status: 'مؤكد', event_date: '2003-06-10', price: 800 })

  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // Header KPIs: the deposit count is its own tile now, not inside مواعيد مؤكدة قادمة.
  results.headerSplit = (await page.locator('#kpis .kpi', { hasText: 'عربون مدفوع — بانتظار التأكيد' }).count()) === 1

  await page.locator('#tabs button[data-tab="insights"]').click()
  await page.waitForSelector('#insights .chip[data-year]', { timeout: 10000 })

  // Unfiltered: كل السنوات on; chips carry CONFIRMED counts (عربون not inside);
  // the 2031 year row shows the عربون in its own column and only confirmed revenue.
  results.allChipDefault = await page.locator('#insights .chip[data-year=""].on').count() === 1
  results.yearChips = (await page.locator('#insights .chip[data-year="2031"]').textContent()).includes('(2)')
    && (await page.locator('#insights .chip[data-year="2003"]').textContent()).includes('(1)')
  const y31 = await page.locator('#insights tr[data-yrow="2031"] td').allTextContents()
  results.yearRowSplit = y31[1] === '2' && y31[4] === '1' && y31[5] === '2,500 ₪'
  results.noMonthChipsYet = (await page.locator('#insights .chip[data-month]').count()) === 0

  // Filter to 2031: confirmed = 2 (all upcoming, 400 ₪ to collect); عربون strip = 1
  // booking worth 2,000 ₪ with 500 ₪ already in hand.
  await page.locator('#insights .chip[data-year="2031"]').click()
  await page.waitForSelector('#insights .chip[data-month]', { timeout: 10000 })
  let k = await strip(page, 0)
  results.year2031Confirmed = k[0] === '2' && k[1] === '2' && k[2] === '0'
    && k[3] === '2,500 ₪' && k[4] === '2,500 ₪' && k[5] === '400 ₪'
  const dep = await strip(page, 1)
  results.year2031Deposit = dep[0] === '1' && dep[1] === '1' && dep[2] === '2,000 ₪' && dep[3] === '500 ₪'
  results.monthChips = (await page.locator('#insights .chip[data-month="2031-05"]').textContent()).includes('أيار (1)')
    && (await page.locator('#insights .chip[data-month="2031-08"]').textContent()).includes('آب (1)')
  const m05 = await page.locator('#insights tr[data-mrow="2031-05"] td').allTextContents()
  results.monthRowSplit = m05[1] === '1' && m05[4] === '1' && m05[5] === '1,000 ₪'
  // Overview rescopes: 4 clients with a 2031 event, 2 confirmed → 50%.
  const overview = await strip(page, 2)
  results.overviewScoped = overview[0] === '4' && overview[1] === '2' && overview[2] === '50%'

  // للتحصيل: both the confirmed أ (400) and the عربون ب (1,500) are on the call list,
  // soonest first, totalled together — and a row opens its booking.
  results.collections = (await page.locator('#insights tr[data-open]', { hasText: 'تحليل أ' }).first().textContent()).includes('400 ₪')
    && (await page.locator('#insights tr[data-open]', { hasText: 'تحليل ب' }).first().textContent()).includes('1,500 ₪')
    && (await page.locator('#insights tfoot', { hasText: 'مع العربون' }).textContent()).includes('1,900 ₪')
  await page.locator('#insights tr[data-open]', { hasText: 'تحليل أ' }).first().click()
  await page.waitForTimeout(600)
  results.collectionOpensDrawer = (await page.locator('#drawer.open').isVisible())
    && (await page.locator('#dTitle').textContent()).includes('تحليل أ')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // بيانات ناقصة: the seeds carry no مصدر العميل, so أ must be listed with that flag.
  results.gaps = (await page.locator('#insights tr[data-open]', { hasText: 'تحليل أ' }).last().textContent()).includes('مصدر العميل')

  // The demand-trend chart (bookings signed per month) renders.
  results.madeChart = (await page.locator('#insights .statbox', { hasText: 'حجوزات جديدة بالشهر' }).count()) === 1

  // Drill into أيار: 1 confirmed worth 1,000 ₪ owing 400 ₪; the عربون strip keeps ب.
  await page.locator('#insights .chip[data-month="2031-05"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-month="2031-05"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await strip(page, 0)
  results.monthKpis = k[0] === '1' && k[3] === '1,000 ₪' && k[5] === '400 ₪'
    && (await strip(page, 1))[0] === '1'
  results.monthTableKeepsYear = (await page.locator('#insights tr[data-mrow]').count()) === 2

  // Clicking the آب row switches the month filter to it.
  await page.locator('#insights tr[data-mrow="2031-08"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-month="2031-08"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await strip(page, 0)
  results.rowSwitchesMonth = k[0] === '1' && k[3] === '1,500 ₪'

  // 2003 is all held; its CSV export carries the scope in the filename.
  await page.locator('#insights .chip[data-year="2003"]').click()
  await page.waitForFunction(() => document.querySelector('#insights .chip[data-year="2003"]')?.classList.contains('on'), null, { timeout: 10000 })
  k = await strip(page, 0)
  results.heldYear = k[0] === '1' && k[1] === '0' && k[2] === '1' && k[3] === '800 ₪' && k[5] === '0 ₪'
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.locator('#insCsv').click(),
  ])
  results.csvExport = dl.suggestedFilename() === 'sarab-insights-2003.csv'

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
