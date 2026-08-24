/* client_city + city×source + CAPI expansion verification (city analytics suite).
   Run against `wrangler pages dev dist --port 8794` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8794'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }

const results = {}
let browser
try {
  // A Meta-sourced confirmed booking: event in سخنين, client lives in الناصرة.
  const a = await seed({ name: 'سكن أ', phone: '0590000041', status: 'مؤكد', event_date: '2032-03-10',
    city: 'سخنين اختبار', client_city: 'الناصرة اختبار', price: 1200, lead_source: 'إعلان ممول (Meta)', occasion: 'عرس' })
  // Same event city, different source, no client_city.
  await seed({ name: 'سكن ب', phone: '0590000042', status: 'استفسار', event_date: '2032-03-12',
    city: 'سخنين اختبار', lead_source: 'انستغرام' })

  // 1. API: client_city round-trips through POST and PATCH.
  results.postKeepsClientCity = a.client_city === 'الناصرة اختبار'
  const p = await send('/office/api/bookings/' + a.id, { client_city: 'شفاعمرو اختبار' }, 'PATCH')
  results.patchClientCity = p.row.client_city === 'شفاعمرو اختبار'
  await send('/office/api/bookings/' + a.id, { client_city: 'الناصرة اختبار' }, 'PATCH')

  // 2. Insights API: city_sources rows + client_cities rows exist for the seeds.
  const ins = await fetch(BASE + '/office/api/insights?year=2032').then(j)
  const cs = ins.city_sources.filter((r) => r.k === 'سخنين اختبار')
  results.citySources = cs.length === 2
    && cs.some((r) => r.src === 'إعلان ممول (Meta)' && r.clients === 1 && r.booked === 1 && r.revenue === 1200)
    && cs.some((r) => r.src === 'انستغرام' && r.clients === 1 && r.booked === 0)
  results.clientCities = ins.client_cities.length === 1
    && ins.client_cities[0].k === 'الناصرة اختبار' && ins.client_cities[0].booked === 1

  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // 3. Drawer: the new field exists, holds the stored value, and sits next to city.
  await page.locator(`#grid tr[data-id="${a.id}"]`).first().click()
  await page.waitForSelector('#f_client_city', { timeout: 5000 })
  results.drawerField = (await page.locator('#f_client_city').inputValue()) === 'الناصرة اختبار'
  results.drawerLabels = (await page.locator('label[for="f_client_city"]').textContent()).includes('مدينة العميل')
    && (await page.locator('label[for="f_city"]').textContent()).includes('مدينة المناسبة')
  await page.locator('#closeBtn').click()

  // 4. التحليلات: city row expands to its sources; 🏠 section lists الناصرة.
  await page.locator('#tabs button[data-tab="insights"]').click()
  await page.waitForSelector('#insights .chip[data-year]', { timeout: 10000 })
  await page.locator('#insights .chip[data-year="2032"]').click()
  await page.waitForTimeout(800)
  await page.locator('#insights details[data-sec="ins_cities"] summary').click()
  const cityRow = page.locator('#insights tr[data-cx]', { hasText: 'سخنين اختبار' }).first()
  await cityRow.scrollIntoViewIfNeeded()
  const cx = await cityRow.getAttribute('data-cx')
  results.cityDetailHidden = !(await page.locator(`#insights tr[data-cxd="${cx}"]`).isVisible())
  await cityRow.click()
  results.cityDetailShows = (await page.locator(`#insights tr[data-cxd="${cx}"]`).isVisible())
    && (await page.locator(`#insights tr[data-cxd="${cx}"]`).textContent()).includes('انستغرام')
  const ccitySec = page.locator('#insights details[data-sec="ins_ccity"]')
  await ccitySec.locator('summary').click()
  results.homeCitySection = (await ccitySec.textContent()).includes('الناصرة اختبار')

  // 5. CAPI: campaign row expands with cities, home city, occasion, and recent clients.
  await page.locator('#tabs button[data-tab="capi"]').click()
  await page.waitForSelector('#capi tr[data-camprow]', { timeout: 10000 })
  const camp = page.locator('#capi tr[data-camprow]').first()
  const ci = await camp.getAttribute('data-camprow')
  results.campDetailHidden = !(await page.locator(`#capi tr[data-campdet="${ci}"]`).isVisible())
  await camp.click()
  const det = page.locator(`#capi tr[data-campdet="${ci}"]`)
  const detTxt = await det.textContent()
  results.campDetail = (await det.isVisible())
    && detTxt.includes('سخنين اختبار')          // event city table
    && detTxt.includes('الناصرة اختبار')        // client home-city table
    && detTxt.includes('عرس')                   // occasion table
    && detTxt.includes('سكن أ')                 // recent clients
  // clicking a recent client opens the drawer (and not the row toggle)
  await det.locator('tr[data-open]').first().click()
  await page.waitForTimeout(400)
  results.campClientOpensDrawer = await page.locator('#drawer.open').count() === 1
  await page.locator('#closeBtn').click()
  // second click on the campaign row folds the panel back
  await camp.click()
  results.campDetailToggles = !(await det.isVisible())

  results.consoleErrors = errors
} finally {
  if (browser) await browser.close()
  for (const id of seeded) await fetch(BASE + '/office/api/bookings/' + id, { method: 'DELETE' })
}
console.log(JSON.stringify(results, null, 2))
const pass = Object.entries(results).every(([k, v]) => k === 'consoleErrors' ? v.length === 0 : v === true)
console.log(pass ? '\nPASS' : '\nFAIL')
process.exit(pass ? 0 : 1)
