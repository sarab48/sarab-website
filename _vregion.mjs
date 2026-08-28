/* city regions + halls-by-city verification.
   Run against `wrangler pages dev dist --port 8799` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8799'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

const seededBookings = []
const seedBooking = async (b) => {
  const r = await send('/office/api/bookings', b)
  seededBookings.push(r.row.id)
  return r.row
}

const CITY = 'مدينة اختبار المناطق'
const results = {}
let browser, tierId, cityId
try {
  // --- pricing API: tier + city with region ---
  let tiers = (await send('/office/api/pricing', { type: 'tier', name: 'فئة اختبار المناطق', price: 9111 })).tiers
  tierId = tiers.find((t) => t.name === 'فئة اختبار المناطق').id
  tiers = (await send('/office/api/pricing', { type: 'city', name: CITY, tier_id: tierId, region: 'المثلث' })).tiers
  const findCity = (ts) => ts.flatMap((t) => t.cities).find((c) => c.name === CITY)
  cityId = findCity(tiers).id
  results.postCityRegion = findCity(tiers).region === 'المثلث'

  const patched = await send('/office/api/pricing', { type: 'city', id: cityId, region: 'القدس' }, 'PATCH')
  results.patchCityRegion = findCity(patched.tiers).region === 'القدس'
  const badRegion = await send('/office/api/pricing', { type: 'city', id: cityId, region: 'مريخ' }, 'PATCH')
  results.invalidRegionRejected = badRegion.ok === false && badRegion.error === 'invalid-region'
  const cleared = await send('/office/api/pricing', { type: 'city', id: cityId, region: '' }, 'PATCH')
  results.clearRegion = findCity(cleared.tiers).region === null
  await send('/office/api/pricing', { type: 'city', id: cityId, region: 'المثلث' }, 'PATCH')

  // --- bookings whose venues teach the halls-by-city lists ---
  await seedBooking({ name: 'قاعات أ', phone: '0590000051', status: 'مؤكد', event_date: '2033-01-05',
    city: CITY, venue: 'قاعة اختبار أولى', price: 500 })
  await seedBooking({ name: 'قاعات ب', phone: '0590000052', status: 'مؤكد', event_date: '2033-01-06',
    city: CITY, venue: 'قاعة اختبار أولى', price: 500 })
  await seedBooking({ name: 'قاعات ج', phone: '0590000053', status: 'استفسار', event_date: '2033-01-07',
    city: CITY, venue: 'قاعة اختبار ثانية' })
  await seedBooking({ name: 'قاعات د', phone: '0590000054', status: 'استفسار', event_date: '2033-01-08',
    city: 'بلدة أخرى للاختبار', venue: 'قاعة بلدة أخرى' })

  // --- meta API: venue_cities pairs + cities carry region ---
  const meta = await fetch(BASE + '/office/api/meta').then(j)
  const pairs = (meta.venue_cities || []).filter((p) => p.c === CITY)
  results.metaVenuePairs = pairs.length === 2
    && pairs.find((p) => p.v === 'قاعة اختبار أولى')?.n === 2
    && pairs.find((p) => p.v === 'قاعة اختبار ثانية')?.n === 1
  results.metaCityRegion = (meta.cities || []).find((c) => c.name === CITY)?.region === 'المثلث'
  results.metaVenuesFlat = (meta.venues || []).includes('قاعة بلدة أخرى')

  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // --- drawer: hall chips for the typed city, datalist reordered, region auto-fill ---
  await page.locator('#newBtn').click()
  await page.waitForSelector('#f_city', { timeout: 5000 })
  await page.locator('#f_city').fill(CITY)
  await page.locator('#f_city').dispatchEvent('input')
  const hint = page.locator('#venueHint')
  const hintTxt = await hint.textContent()
  results.venueChips = hintTxt.includes('قاعة اختبار أولى') && hintTxt.includes('قاعة اختبار ثانية')
    && !hintTxt.includes('قاعة بلدة أخرى')
  const dlFirst = await page.locator('#dl_venue option').first().getAttribute('value')
  results.venueDatalistLeadsLocal = dlFirst === 'قاعة اختبار أولى'
  await hint.locator('.vchip', { hasText: 'قاعة اختبار ثانية' }).click()
  results.chipFillsVenue = (await page.locator('#f_venue').inputValue()) === 'قاعة اختبار ثانية'
  results.regionAutoFilled = (await page.locator('#f_region').inputValue()) === 'المثلث'
  // a hand-typed region must survive later city edits
  await page.locator('#f_region').fill('الشمال')
  await page.locator('#f_region').dispatchEvent('input')
  await page.locator('#f_city').fill(CITY + ' ')
  await page.locator('#f_city').dispatchEvent('input')
  results.manualRegionKept = (await page.locator('#f_region').inputValue()) === 'الشمال'
  await page.locator('#closeBtn').click()

  // --- أسعار المدن tab: chips, grouping, search, per-row region select ---
  await page.locator('#tabs button[data-tab="cities"]').click()
  await page.waitForSelector('#pricing .chip[data-rg]', { timeout: 10000 })
  results.regionChips = (await page.locator('#pricing .chip[data-rg]').count()) >= 6
  results.groupHeaders = (await page.locator('#pricing tr.rgroup').count()) >= 1
  await page.locator('#pricing .chip[data-rg="المثلث"]').click()
  await page.waitForTimeout(200)
  const bodyTxt = await page.locator('#cityRows').textContent()
  results.regionFilter = bodyTxt.includes(CITY) && !bodyTxt.includes('بلدة أخرى للاختبار')
    && (await page.locator('#pricing tr.rgroup').count()) === 0
  await page.locator('#pricing .chip[data-rg="all"]').click()
  await page.waitForTimeout(200)
  await page.locator('#cq').fill('اختبار المناطق')
  await page.waitForTimeout(200)
  results.citySearch = (await page.locator('#cityRows tr[data-city]').count()) === 1
    && (await page.locator('#cityRows').textContent()).includes(CITY)
  const row = page.locator(`#cityRows tr[data-city="${cityId}"]`)
  await row.locator('.cityRegion').selectOption('الجنوب')
  await page.waitForTimeout(600)
  const after = await fetch(BASE + '/office/api/pricing').then(j)
  results.rowRegionSelect = after.tiers.flatMap((t) => t.cities).find((c) => c.id === cityId)?.region === 'الجنوب'

  results.consoleErrors = errors
} finally {
  if (browser) await browser.close()
  for (const id of seededBookings) await fetch(BASE + '/office/api/bookings/' + id, { method: 'DELETE' })
  if (cityId) await send('/office/api/pricing', { type: 'city', id: cityId }, 'DELETE')
  if (tierId) await send('/office/api/pricing', { type: 'tier', id: tierId }, 'DELETE')
}
console.log(JSON.stringify(results, null, 2))
const pass = Object.entries(results).every(([k, v]) => k === 'consoleErrors' ? v.length === 0 : v === true)
console.log(pass ? '\nPASS' : '\nFAIL')
process.exit(pass ? 0 : 1)
