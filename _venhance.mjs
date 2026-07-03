/* Enhanced-dashboard verification: finance + inventory tabs render and expand editors;
   mobile card layout with red date-conflict flags; drawer delete button.
   Run against `wrangler pages dev dist --port 8794` with ACCESS_DEV_BYPASS=1. */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8794'
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const errors = []
const track = (p) => {
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
}

// desktop
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
track(page)
await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]')
const flagsDesktop = await page.locator('.dateflag').count()

await page.locator('#tabs button[data-tab="finance"]').click()
await page.waitForSelector('#finev tr.frow')
const finRows = await page.locator('#finev tr.frow').count()
const genRows = await page.locator('#fingen tr.frow').count()
await page.locator('#finev tr.frow').first().click()
await page.waitForSelector('#finev tr.fedit .editgrid')
await page.screenshot({ path: 'docs/styleframes/venh-finance.png' })

await page.locator('#tabs button[data-tab="inventory"]').click()
await page.waitForSelector('#invbox tr.frow')
const invRows = await page.locator('#invbox tr.frow').count()
await page.screenshot({ path: 'docs/styleframes/venh-inventory.png' })

// mobile
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } })
track(mob)
await mob.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await mob.waitForSelector('#grid tbody tr[data-id]')
const flagsMobile = await mob.locator('.dateflag').count()
const theadHidden = await mob.locator('#grid thead').isHidden()
await mob.screenshot({ path: 'docs/styleframes/venh-mobile.png' })
await mob.locator('#grid tbody tr[data-id]').first().click()
await mob.waitForSelector('#drawer.open')
await mob.waitForTimeout(500)
const delVisible = await mob.locator('#delBtn').isVisible()
await mob.screenshot({ path: 'docs/styleframes/venh-mobile-drawer.png' })

await browser.close()
const pass = flagsDesktop >= 2 && flagsMobile >= 2 && theadHidden && finRows >= 1 && genRows >= 1
  && invRows >= 1 && delVisible && errors.length === 0
console.log(JSON.stringify({ flagsDesktop, flagsMobile, theadHidden, finRows, genRows, invRows, delVisible, errors }))
console.log(pass ? 'VENHANCE PASS' : 'VENHANCE FAIL')
process.exit(pass ? 0 : 1)
