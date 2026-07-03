import { chromium } from 'playwright'
const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
p.on('pageerror', (e) => errors.push('pe: ' + e.message))
p.on('console', (m) => { if (m.type() === 'error') errors.push('c: ' + m.text()) })
await p.goto('http://localhost:8796/office/', { waitUntil: 'networkidle' })
await p.waitForSelector('#grid tbody tr[data-id]')
// chips cycle: include → exclude → off
const chip = p.locator('#statusChips .chip').nth(1)
await chip.click(); const c1 = await chip.getAttribute('class')
await p.locator('#statusChips .chip').nth(1).click(); const c2 = await p.locator('#statusChips .chip').nth(1).getAttribute('class')
await p.locator('#statusChips .chip').nth(1).click(); const c3 = await p.locator('#statusChips .chip').nth(1).getAttribute('class')
// tabs
await p.locator('#tabs button[data-tab="visitors"]').click()
await p.waitForSelector('#visitors .kpi', { timeout: 10000 })
const visKpis = await p.locator('#visitors .kpi').count()
await p.locator('#tabs button[data-tab="capi"]').click()
await p.waitForSelector('#capi #capiCsv', { timeout: 10000 })
const capiRows = await p.locator('#capi tbody tr').count()
// site: widget + privacy link
const site = await b.newPage({ viewport: { width: 1200, height: 800 } })
site.on('pageerror', (e) => errors.push('site-pe: ' + e.message))
await site.goto('http://localhost:8796/', { waitUntil: 'domcontentloaded' })
await site.waitForSelector('.a11y__btn', { timeout: 15000 })
await site.locator('.a11y__btn').click()
const panel = await site.locator('.a11y__panel').isVisible()
const privLink = await site.locator('a[href="/privacy.html"]').count()
await b.close()
const pass = c1.includes('on') && c2.includes('ex') && !c3.includes('on') && !c3.includes('ex')
  && visKpis >= 5 && capiRows >= 1 && panel && privLink >= 2 && errors.length === 0
console.log(JSON.stringify({ c1, c2, c3, visKpis, capiRows, panel, privLink, errors }))
console.log(pass ? 'VFINAL PASS' : 'VFINAL FAIL')
process.exit(pass ? 0 : 1)
