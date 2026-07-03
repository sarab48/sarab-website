import { chromium } from 'playwright'
const base = process.argv[2], out = process.argv[3]
const errs = []
const browser = await chromium.launch({ args: ['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1366, height: 860 } })
page.on('pageerror', e => errs.push(String(e)))
await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(3600)
await page.screenshot({ path: `${out}/phase4c-hero.png` })
await page.evaluate(() => { const b=[...document.querySelectorAll('.lang-switcher__btn')].find(x=>x.textContent.trim()==='ع'); b?.click() })
await page.waitForTimeout(3200)
await page.screenshot({ path: `${out}/phase4c-hero-ar.png` })
console.log('ERRORS:', errs.length ? errs.slice(0,6) : 'none')
await browser.close()
