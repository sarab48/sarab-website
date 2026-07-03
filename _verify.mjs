import { chromium } from 'playwright'
const base = process.argv[2]
const outDir = process.argv[3]
const errors = []
const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

await page.goto(base, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

const diag = await page.evaluate(() => {
  const c = document.createElement('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  const heroCanvas = document.querySelector('.mirage-bg')
  return {
    webgl: !!gl,
    renderer: gl ? gl.getParameter(gl.VERSION) : null,
    heroCanvasPresent: !!heroCanvas,
    heroCanvasSize: heroCanvas ? `${heroCanvas.width}x${heroCanvas.height}` : null,
    wordmark: document.querySelector('.hero__word')?.textContent,
  }
})
console.log('DIAG', JSON.stringify(diag))

await page.screenshot({ path: `${outDir}/phase4-hero.png` })
// scroll to proof, wait for the dissolve to progress, screenshot
await page.evaluate(() => document.querySelector('#proof')?.scrollIntoView({ behavior: 'instant', block: 'center' }))
await page.waitForTimeout(3800)
const stage = await page.$('.proof__stage')
if (stage) await stage.screenshot({ path: `${outDir}/phase4-reveal.png` })
// booking
await page.evaluate(() => document.querySelector('#book')?.scrollIntoView({ behavior: 'instant', block: 'center' }))
await page.waitForTimeout(900)
await page.screenshot({ path: `${outDir}/phase4-booking.png` })

console.log('ERRORS', errors.length ? JSON.stringify(errors, null, 1) : 'none')
await browser.close()
