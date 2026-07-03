import { chromium } from 'playwright'
import fs from 'fs'

const base = process.argv[2] || 'http://localhost:5173'
const out = process.argv[3] || 'docs/styleframes'
fs.mkdirSync(out, { recursive: true })

const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})

const report = {}

async function run(lang) {
  const errors = []
  const badRequests = []
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('requestfailed', (r) => { const u = r.url(); if (!/\.mp4(\?|$)/.test(u)) badRequests.push(u) })

  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  if (lang === 'ar') {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.lang-switcher__btn')].find((x) => x.textContent.trim() === 'ع'); b?.click() })
    await page.waitForTimeout(2000)
  }

  const diag = await page.evaluate(() => {
    const amb = document.querySelector('.proof .ambient')
    const ambCS = amb ? getComputedStyle(amb) : null
    const content = document.querySelector('.proof .proof__head')
    const cCS = content ? getComputedStyle(content) : null
    return {
      dir: document.documentElement.getAttribute('dir'),
      cores: navigator.hardwareConcurrency,
      devMem: navigator.deviceMemory ?? 'undef',
      heroScene: !!document.querySelector('.hero-scene'),
      revealCanvas: !!document.querySelector('.reveal__canvas'),
      ambientBlocks: document.querySelectorAll('.ambient').length,
      ambientMotes: document.querySelectorAll('.ambient i').length,
      ambientZ: ambCS?.zIndex, ambientPE: ambCS?.pointerEvents,
      contentZ: cCS?.zIndex,
    }
  })

  const overflow = async () => page.evaluate(() => ({
    sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    cw: document.documentElement.clientWidth,
  }))

  // ---- HERO top ----
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/v52-${lang}-hero-top.png` })
  const ofHeroTop = await overflow()

  // ---- HERO fly-through: real wheel scroll within the hero ----
  await page.mouse.move(683, 430)
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 130); await page.waitForTimeout(260) }
  await page.waitForTimeout(1600)
  const heroScrollY = await page.evaluate(() => Math.round(window.scrollY))
  await page.screenshot({ path: `${out}/v52-${lang}-hero-dive.png` })

  // ---- PROOF face-fix: drag-scrub the dissolve to fixed fracs, screenshot the stage ----
  const faceShots = []
  await page.evaluate(() => document.querySelector('#proof')?.scrollIntoView({ block: 'start' }))
  await page.waitForTimeout(1600)
  const canvas = await page.$('.reveal__canvas')
  if (canvas) {
    for (const frac of [0.32, 0.5, 0.72]) {
      const box = await canvas.boundingBox()
      if (!box) break
      const xf = lang === 'ar' ? 1 - frac : frac // canvas maps p=(x-left)/w, RTL flips
      const x = box.x + box.width * xf
      const y = box.y + box.height * 0.4
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + 1, y) // ensure a pointermove fires
      await page.waitForTimeout(260)
      const p = `${out}/v52-${lang}-face-${Math.round(frac * 100)}.png`
      await canvas.screenshot({ path: p })
      faceShots.push(p)
      await page.mouse.up()
      await page.waitForTimeout(140)
    }
  }

  // ---- AMBIENT: subtle motes over the dark beats, behind text ----
  for (const id of ['proof', 'reels', 'book']) {
    await page.evaluate((s) => document.querySelector('#' + s)?.scrollIntoView({ block: 'center' }), id)
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `${out}/v52-${lang}-${id}.png` })
  }
  const ofBottom = await overflow()

  await page.close()
  report[lang] = {
    diag, heroScrollY, errors, badRequests,
    overflow: { heroTop: ofHeroTop, bottom: ofBottom },
    heroTopNoOverflow: ofHeroTop.sw <= ofHeroTop.cw + 1,
    bottomNoOverflow: ofBottom.sw <= ofBottom.cw + 1,
    faceShots,
  }
}

await run('en')
await run('ar')
await browser.close()
console.log(JSON.stringify(report, null, 2))
