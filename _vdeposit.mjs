/* Verify: in the office drawer, typing a deposit (العربون) auto-recalcs المتبقي =
   price − deposit — for EXISTING bookings (the reported bug) and new ones — while a
   manual edit of المتبقي still wins for the session. Run against
   `wrangler pages dev dist --port 8791` with ACCESS_DEV_BYPASS=1. */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:8791'
const browser = await chromium.launch({ executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome', args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

// --- existing booking: set price 2000, type deposit 300 → remaining must become 1700
await page.locator('#grid tbody tr[data-id]').first().click()
await page.waitForSelector('#drawer.open', { timeout: 5000 })
const fill = async (sel, v) => { const el = page.locator(sel); await el.click(); await el.fill(String(v)); }
await fill('#f_price', 2000)
await fill('#f_deposit', 300)
const existingRemaining = await page.locator('#f_remaining').inputValue()

// --- manual override: edit remaining by hand, then change deposit → manual value stays
await fill('#f_remaining', 1500)
await fill('#f_deposit', 400)
const manualKept = await page.locator('#f_remaining').inputValue()
await page.locator('#closeBtn').click()
await page.waitForTimeout(300)

// --- reopen the same row (fresh session): auto-recalc must be live again
await page.locator('#grid tbody tr[data-id]').first().click()
await page.waitForSelector('#drawer.open', { timeout: 5000 })
await fill('#f_price', 1000)
await fill('#f_deposit', 250)
const reopenedRemaining = await page.locator('#f_remaining').inputValue()
await page.locator('#closeBtn').click()
await page.waitForTimeout(300)

// --- new booking drawer: same auto-calc
await page.locator('#newBtn').click()
await page.waitForSelector('#drawer.open', { timeout: 5000 })
await fill('#f_price', 800)
await fill('#f_deposit', 300)
const newRemaining = await page.locator('#f_remaining').inputValue()

await browser.close()

const pass = existingRemaining === '1700' && manualKept === '1500'
  && reopenedRemaining === '750' && newRemaining === '500' && errors.length === 0
console.log(JSON.stringify({ existingRemaining, manualKept, reopenedRemaining, newRemaining, errors }))
console.log(pass ? 'VDEPOSIT PASS' : 'VDEPOSIT FAIL')
process.exit(pass ? 0 : 1)
