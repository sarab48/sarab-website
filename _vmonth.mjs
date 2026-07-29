/* تقويم المكتب verification — the month view built from the bookings themselves.
   Seeds a handful of bookings in the current month, then checks the grid, the agenda,
   the clash flag, the «المؤكدة فقط» filter, month navigation, click-through to the
   drawer, click-an-empty-day-to-book, and the phone layout. Cleans up after itself.

   Run against `wrangler pages dev dist --port 8791` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8791'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)

const AR_MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول']
const now = new Date()
const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const MONTH = local(now).slice(0, 7)
const day = (n) => `${MONTH}-${String(n).padStart(2, '0')}`
const TODAY = local(now)
const TODAY_D = Number(TODAY.slice(8))

// Three days in this month that carry nothing else: one quiet booking, one clash pair.
const QUIET = day(3), CLASH = day(4), FREE = day(6)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }

const results = {}
let browser
try {
  await seed({ name: 'زبون التقويم أ', phone: '0590000001', status: 'مؤكد', event_date: QUIET,
    start_time: '19:00', city: 'سخنين', venue: 'قاعة أ', occasion: 'عرس', remaining: 400 })
  await seed({ name: 'زبون التقويم ب', phone: '0590000002', status: 'مؤكد', event_date: CLASH,
    start_time: '20:00', city: 'حيفا' })
  await seed({ name: 'زبون التقويم ج', phone: '0590000003', status: 'استفسار', event_date: CLASH,
    start_time: '12:00', city: 'عكا' })

  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // Google Calendar is off → its button must not be advertised anywhere.
  results.googleBtnHidden = !(await page.locator('#calBtn').isVisible())

  await page.locator('#tabs button[data-tab="calendar"]').click()
  await page.waitForSelector('.cvgrid .cvcell', { timeout: 10000 })

  // The month opens on the current one, laid out Sunday-first with the 1st on its real weekday.
  results.opensOnThisMonth = (await page.locator('.cvhead .mon').textContent())
    .trim() === `${AR_MONTHS[now.getMonth()]} ${now.getFullYear()}`
  results.sevenColumns = (await page.locator('.cvdow').count()) === 7
  const lead = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).getUTCDay()
  results.padsToWeekday = (await page.locator('.cvcell.pad').first().count()) === (lead ? 1 : 0)
    && (await page.locator('.cvgrid .cvcell').count()) % 7 === 0

  // Today is ringed, and it is the right square.
  const todayCell = page.locator('.cvcell.today')
  results.todayRinged = (await todayCell.count()) === 1
    && (await todayCell.locator('.cvnum').textContent()).trim().startsWith(String(TODAY_D))

  // The quiet booking shows as a chip carrying its time and name.
  const chipA = page.locator('.cvchip', { hasText: 'زبون التقويم أ' })
  results.chipShown = (await chipA.count()) === 1
    && (await chipA.locator('.cvfull').textContent()).includes('19:00')

  // Default is real bookings only: the استفسار is not on the calendar until asked for,
  // and the header says how many are being held back.
  results.defaultRealOnly = (await page.locator('#cvRealOnly').isChecked())
    && (await page.locator('.cvchip', { hasText: 'زبون التقويم ج' }).count()) === 0
    && (await page.locator('.cvchip', { hasText: 'زبون التقويم ب' }).count()) === 1
  results.countAdmitsHiding = (await page.locator('.cvhead .count').textContent()).includes('معروضة من')

  // …and the double-booking flag still warns, even with the competing استفسار hidden.
  const clashCell = page.locator('.cvcell.clash').filter({ has: page.locator('.cvchip', { hasText: 'زبون التقويم ب' }) })
  results.clashFlagged = (await clashCell.count()) === 1
    && (await clashCell.locator('.cvnum .dateflag').count()) === 1
    && !(await clashCell.locator('.cvnum .dateflag--soft').count())

  // Unticking brings everything back — and the agenda is in time order.
  await page.locator('#cvRealOnly').uncheck()
  await page.waitForTimeout(250)
  results.filterReveals = (await page.locator('.cvchip', { hasText: 'زبون التقويم ج' }).count()) === 1
  const agendaNames = await page.locator('.cvitem .n').allTextContents()
  const iA = agendaNames.indexOf('زبون التقويم ج'), iB = agendaNames.indexOf('زبون التقويم ب')
  results.agendaListed = iA !== -1 && iB !== -1 && iA < iB   // 12:00 before 20:00 on the same day
  await page.locator('#cvRealOnly').check()
  await page.waitForTimeout(250)

  await page.screenshot({ path: 'docs/styleframes/vmonth-desktop.png' })

  // A chip opens that booking in the drawer.
  await page.locator('.cvchip', { hasText: 'زبون التقويم أ' }).click()
  await page.waitForTimeout(500)
  results.chipOpensDrawer = (await page.locator('#drawer.open').isVisible())
    && (await page.locator('#dTitle').textContent()).includes('زبون التقويم أ')
    && (await page.locator('#f_event_date').inputValue()) === QUIET
  await page.locator('#closeBtn').click()
  await page.waitForTimeout(400)

  // An empty day starts a new booking already carrying that date.
  await page.locator(`.cvadd[data-new="${FREE}"]`).click()
  await page.waitForTimeout(500)
  results.emptyDayPrefills = (await page.locator('#drawer.open').isVisible())
    && (await page.locator('#dTitle').textContent()).includes('حجز جديد')
    && (await page.locator('#f_event_date').inputValue()) === FREE
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // Next month is a different month, and this month's bookings are not in it.
  await page.locator('#cvNext').click()
  await page.waitForTimeout(700)
  const nextLabel = (await page.locator('.cvhead .mon').textContent()).trim()
  results.navigatesMonths = nextLabel !== `${AR_MONTHS[now.getMonth()]} ${now.getFullYear()}`
    && (await page.locator('.cvchip', { hasText: 'زبون التقويم أ' }).count()) === 0
    && (await page.locator('.cvcell.today').count()) === 0
  await page.locator('#cvToday').click()
  await page.waitForTimeout(700)
  results.todayReturns = (await page.locator('.cvchip', { hasText: 'زبون التقويم أ' }).count()) === 1

  // Phone: the grid keeps its 7 columns but each booking becomes a bar; the agenda carries
  // the detail and stays tappable.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const perrs = []
  phone.on('pageerror', (e) => perrs.push('pageerror: ' + e.message))
  phone.on('console', (m) => { if (m.type() === 'error') perrs.push('console: ' + m.text()) })
  await phone.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await phone.locator('#tabs button[data-tab="calendar"]').click()
  await phone.waitForSelector('.cvgrid .cvcell', { timeout: 10000 })
  // The phone chip must carry a readable name, not a bare colour bar: the short label is
  // the one on screen, the full one is hidden, and the chip is tall enough to hold text.
  const pChip = phone.locator('.cvchip', { hasText: 'زبون التقويم أ' })
  const bar = await pChip.boundingBox()
  const shortBox = await pChip.locator('.cvshort').boundingBox()
  const gridBox = await phone.locator('.cvgrid').boundingBox()
  results.phoneNameVisible = (await pChip.locator('.cvshort').isVisible())
    && !(await pChip.locator('.cvfull').isVisible())
    && (await pChip.locator('.cvshort').textContent()).trim() === 'زبون'
    && !!shortBox && shortBox.width > 12 && shortBox.height >= 9
  results.phoneChipReadable = !!bar && bar.height >= 12
  results.phoneNoOverflow = !!gridBox && gridBox.width <= 390
  results.phoneAgenda = (await phone.locator('.cvitem', { hasText: 'زبون التقويم أ' }).isVisible())
  await phone.screenshot({ path: 'docs/styleframes/vmonth-phone.png' })
  await phone.locator('.cvitem', { hasText: 'زبون التقويم أ' }).click()
  await phone.waitForTimeout(500)
  results.phoneAgendaOpens = await phone.locator('#drawer.open').isVisible()

  results.consoleErrors = [...errors, ...perrs]
} finally {
  if (browser) await browser.close().catch(() => {})
  for (const id of seeded) await fetch(BASE + '/office/api/bookings/' + id, { method: 'DELETE' }).catch(() => {})
}

const pass = Object.entries(results).every(([k, v]) => k === 'consoleErrors' ? v.length === 0 : v === true)
console.log(JSON.stringify(results, null, 2))
console.log(pass ? '\nPASS' : '\nFAIL')
process.exit(pass ? 0 : 1)
