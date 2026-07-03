/* Pricing tab + drawer intel verification. Run against
   `wrangler pages dev dist --port 8792` with ACCESS_DEV_BYPASS=1. */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8792'
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

// pricing tab
await page.locator('#tabs button[data-tab="cities"]').click()
await page.waitForSelector('#pricing tr[data-tier]', { timeout: 10000 })
const tierRows = await page.locator('#pricing tr[data-tier]').count()
const cityRows = await page.locator('#pricing tr[data-city]').count()
await page.screenshot({ path: 'docs/styleframes/voffice-pricing.png' })

// drawer intel on the website lead (id 2: date conflicts + city match)
await page.locator('#tabs button[data-tab="bookings"]').click()
await page.waitForSelector('#grid tbody tr[data-id]')
await page.locator('#grid tbody tr[data-id="2"]').click()
await page.waitForSelector('#intel:not([style*="display: none"])', { timeout: 10000 })
await page.waitForSelector('#usePrice', { timeout: 10000 })
const intelText = (await page.locator('#intel').innerText()).replace(/\s+/g, ' ')
await page.locator('#usePrice').click()
const priceVal = await page.locator('#f_price').inputValue()
const hasReply = await page.locator('#waReply').count()
await page.screenshot({ path: 'docs/styleframes/voffice-intel.png' })

await browser.close()
const pass = tierRows >= 2 && cityRows >= 2 && intelText.includes('SARAB-001') && intelText.includes('1,800')
  && priceVal === '1800' && hasReply === 1 && errors.length === 0
console.log(JSON.stringify({ tierRows, cityRows, intelText: intelText.slice(0, 120), priceVal, hasReply, errors }))
console.log(pass ? 'VINTEL PASS' : 'VINTEL FAIL')
process.exit(pass ? 0 : 1)
