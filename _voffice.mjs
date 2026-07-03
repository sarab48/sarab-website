/* Office drawer verification: hidden on load, opens on row click at the left edge,
   closes via إغلاق and Escape; zero console/page errors. Run against
   `wrangler pages dev dist --port 8791` with ACCESS_DEV_BYPASS=1 in .dev.vars. */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8791'
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

const closedVisible = await page.locator('#drawer').isVisible()
await page.screenshot({ path: 'docs/styleframes/voffice-closed.png' })

await page.locator('#grid tbody tr[data-id]').first().click()
await page.waitForTimeout(400)
const openVisible = await page.locator('#drawer.open').isVisible()
const openBox = await page.locator('#drawer').boundingBox()
await page.screenshot({ path: 'docs/styleframes/voffice-open.png' })

await page.locator('#closeBtn').click()
await page.waitForTimeout(400)
const closedAgain = await page.locator('#drawer').isVisible()

await page.locator('#newBtn').click()
await page.waitForTimeout(300)
const newVisible = await page.locator('#drawer.open').isVisible()
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
const escClosed = await page.locator('#drawer').isVisible()

await browser.close()

const atLeftEdge = openBox && openBox.x >= -1 && openBox.x < 5
const pass = !closedVisible && openVisible && atLeftEdge && !closedAgain && newVisible && !escClosed && errors.length === 0
console.log(JSON.stringify({ closedVisible, openVisible, drawerX: openBox && Math.round(openBox.x), closedAgain, newVisible, escClosed, errors }))
console.log(pass ? 'VOFFICE PASS' : 'VOFFICE FAIL')
process.exit(pass ? 0 : 1)
