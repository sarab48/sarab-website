import { chromium } from 'playwright'

const base = process.argv[2] || 'http://localhost:5173'
const out = process.argv[3] || 'docs/styleframes'
const browser = await chromium.launch({
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const report = {}

async function run(lang) {
  const errors = []
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 }, deviceScaleFactor: 1 })
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  if (lang === 'ar') {
    await page.evaluate(() => { const b = [...document.querySelectorAll('.lang-switcher__btn')].find((x) => x.textContent.trim() === 'ع'); b?.click() })
    await page.waitForTimeout(1500)
  }
  await page.evaluate(() => document.querySelector('#reels')?.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(1400)

  const btns = await page.$$('.reel__sound')
  const firstLabel = btns[0] ? await btns[0].getAttribute('aria-label') : null

  // click reel #0 → audible; verify only its video is unmuted
  await btns[0].click()
  await page.waitForTimeout(300)
  const afterFirst = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('.reel__video')]
    const ons = [...document.querySelectorAll('.reel__sound')].map((b) => b.classList.contains('is-on'))
    return { muted: vids.map((v) => v.muted), isOn: ons, onLabel: document.querySelector('.reel__sound.is-on')?.getAttribute('aria-label') }
  })
  await page.screenshot({ path: `${out}/v52-${lang}-reels-sound.png` })

  // click reel #1 → audible moves; #0 re-mutes
  await btns[1].click()
  await page.waitForTimeout(300)
  const afterSecond = await page.evaluate(() => {
    const vids = [...document.querySelectorAll('.reel__video')]
    return { muted: vids.map((v) => v.muted), onCount: document.querySelectorAll('.reel__sound.is-on').length }
  })

  // click reel #1 again → toggle off (all muted)
  await btns[1].click()
  await page.waitForTimeout(250)
  const afterOff = await page.evaluate(() => ({
    allMuted: [...document.querySelectorAll('.reel__video')].every((v) => v.muted),
    onCount: document.querySelectorAll('.reel__sound.is-on').length,
  }))

  const overflow = await page.evaluate(() => ({
    sw: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    cw: document.documentElement.clientWidth,
  }))

  await page.close()
  report[lang] = {
    btnCount: btns.length, firstLabel,
    afterFirst, afterSecond, afterOff,
    noOverflow: overflow.sw <= overflow.cw + 1, overflow, errors,
  }
}

await run('en')
await run('ar')
await browser.close()
console.log(JSON.stringify(report, null, 2))
