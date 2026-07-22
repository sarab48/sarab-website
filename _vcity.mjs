/* Auto-city pricing verification: a booking saved with an unknown city + a price adds
   the city to the price list (reusing a tier with that exact price, else creating one);
   normalized duplicates ("المدينة"/"مدينة") are not re-added; no price → no add; the
   drawer intel then suggests اعتماد السعر for the next client from that city.
   Run against `wrangler pages dev dist --port 8791` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8791'
const CITY = 'مدينة اختبار'
const CITY2 = 'قرية اختبار'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const post = (path, body, method = 'POST') => fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)
const tiers = async () => (await j(await fetch(BASE + '/office/api/pricing'))).tiers

// clean leftovers from a previous run
for (const t of await tiers())
  for (const c of t.cities)
    if ([CITY, CITY2].includes(c.name)) await post('/office/api/pricing', { type: 'city', id: c.id }, 'DELETE')

// 1) new city + price 3100 → added, new tier at 3100
const b1 = await post('/office/api/bookings', { name: 'عميل مدينة جديدة', phone: '0501111111', city: CITY, price: 3100, status: 'استفسار' })
const t1 = await tiers()
const tier3100 = t1.find((t) => t.price === 3100)
const added1 = b1.city_added === CITY && !!tier3100 && tier3100.cities.some((c) => c.name === CITY)

// 2) normalized duplicate ("ال" prefix) + different price → NOT re-added, no 9999 tier
const b2 = await post('/office/api/bookings', { name: 'عميل مكرر', phone: '0502222222', city: 'ال' + CITY, price: 9999, status: 'استفسار' })
const t2 = await tiers()
const dupSkipped = b2.city_added === null && !t2.some((t) => t.price === 9999)

// 3) PATCH to a new city at an EXISTING tier price (1800) → joins that tier, no new tier
const t1800before = t2.find((t) => t.price === 1800)
const b3 = await post('/office/api/bookings/' + b2.row.id, { city: CITY2, price: 1800 }, 'PATCH')
const t3 = await tiers()
const t1800after = t3.filter((t) => t.price === 1800)
const joined = b3.city_added === CITY2 && t1800after.length === 1
  && t1800after[0].id === t1800before.id && t1800after[0].cities.some((c) => c.name === CITY2)

// 4) new city with NO price → not added
const b4 = await post('/office/api/bookings', { name: 'بلا سعر', phone: '0503333333', city: 'بلدة بلا سعر', status: 'استفسار' })
const noPrice = b4.city_added === null && !(await tiers()).some((t) => t.cities.some((c) => c.name === 'بلدة بلا سعر'))

// 5) UI: the drawer intel now offers اعتماد السعر 3,100 for the auto-added city
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })
await page.locator('#newBtn').click()
await page.waitForTimeout(300)
await page.fill('#f_city', CITY)
await page.waitForTimeout(1400)   // debounced intel fetch
const intelTxt = await page.locator('#intel').innerText().catch(() => '')
const suggests = /3,100|3100/.test(intelTxt)
await page.screenshot({ path: 'docs/styleframes/vcity-intel.png' })
await browser.close()

// cleanup: test bookings, test cities, the auto tier (empty after its city is removed)
for (const b of [b1.row.id, b2.row.id, b4.row.id])
  await fetch(BASE + '/office/api/bookings/' + b, { method: 'DELETE' })
for (const t of await tiers())
  for (const c of t.cities)
    if ([CITY, CITY2].includes(c.name)) await post('/office/api/pricing', { type: 'city', id: c.id }, 'DELETE')
if (tier3100) await post('/office/api/pricing', { type: 'tier', id: tier3100.id }, 'DELETE')

const pass = added1 && dupSkipped && joined && noPrice && suggests && errors.length === 0
console.log(JSON.stringify({ pass, added1, dupSkipped, joined, noPrice, suggests, intelTxt, errors }, null, 1))
