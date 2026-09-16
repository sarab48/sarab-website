/* الوقت الإضافي verification (2026-09-16) — extra time charged on the spot.
   API: the three fields store on POST/PATCH; total = price + extra_amount drives the
   finance/insights/payments views (advances, overdue, expected by year/month, revenue);
   a NULL remaining derives from total − Σ ledger; the P&L row seeds paid = total −
   remaining and «ساعات» = booked + extra hours; hours_cost is no longer summed as a cost.
   UI: the drawer's gold strip (hours / ₪ / note / الإجمالي), المتبقي following the total,
   the finance ⏱ tile, the P&L ⏱ + ساعات columns, the expanded-row line, price cells.
   Cleans up after itself (bookings cascade their payments; the P&L rows via finance API).

   Run against `wrangler pages dev dist --port 8788` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8788'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)
const get = (path) => fetch(BASE + path).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001

const results = {}
let browser
try {
  const ins0 = await get('/office/api/insights')
  // أ: agreed 1800 for 3 hours, advance 300 — the client then asks for one more hour (200).
  const A = await seed({ name: 'إضافي أ', phone: '0590000031', status: 'مؤكد', event_date: '2032-07-10',
    price: 1800, hours: 3, deposit: 300, remaining: 1500 })
  results.seedNoExtra = A.extra_hours == null && A.extra_amount == null

  // 1) PATCH the extra (the drawer sends المتبقي already recomputed against the total).
  let r = await send(`/office/api/bookings/${A.id}`, { extra_hours: 1, extra_amount: 200, extra_note: 'ساعة زيادة', remaining: 1700 }, 'PATCH')
  results.extraStored = near(r.row.extra_hours, 1) && near(r.row.extra_amount, 200) && r.row.extra_note === 'ساعة زيادة'
    && near(r.row.price, 1800) && near(r.row.remaining, 1700)
  // 1b) non-numbers are stored as NULL, never as text.
  r = await send(`/office/api/bookings/${A.id}`, { extra_hours: 'abc' }, 'PATCH')
  results.extraNumeric = r.row.extra_hours === null
  r = await send(`/office/api/bookings/${A.id}`, { extra_hours: 1 }, 'PATCH')

  // 2) Finance: the advance row carries the total; the ⏱ KPIs and the year row count it.
  let fin = await get('/office/api/finance')
  let adv = fin.advances.find((x) => x.client === 'إضافي أ')
  results.advTotal = !!adv && near(adv.total, 2000) && near(adv.extra_amount, 200) && near(adv.price, 1800)
  results.kpiExtra = Number(fin.kpi.extra_total) >= 200 && Number(fin.kpi.extra_n) >= 1 && Number(fin.kpi.extra_hours) >= 1
  const y32 = fin.byYear.find((y) => y.k === '2032')
  results.yearExtra = !!y32 && near(y32.extra, 200) && near(y32.expected, 2000) && Number(y32.extra_n) === 1
  const m32 = fin.byMonth.find((m) => m.k === '2032-07')
  results.monthExpected = !!m32 && near(m32.expected, 2000)

  // 3) Insights revenue moved by exactly the total (1800 + 200) — avg_price stays base.
  const ins1 = await get('/office/api/insights')
  results.insightsRevenue = near(Number(ins1.kpi.revenue) - Number(ins0.kpi.revenue), 2000)

  // 4) The 1700 balance arrives (1500 + the extra 200) → remaining 0.
  r = await send('/office/api/payments', { booking_id: A.id, amount: 1700, kind: 'دفعة', method: 'نقداً', paid_on: '2032-07-10' })
  results.payClears = near(r.booking.remaining, 0) && near(r.booking.deposit, 300)

  // 5) Completed → P&L seeds paid = total − remaining = 2000, price = base 1800, ساعات = 3 + 1.
  await send(`/office/api/bookings/${A.id}`, { status: 'مكتمل' }, 'PATCH')
  fin = await get('/office/api/finance')
  const no = (await get(`/office/api/bookings/${A.id}`)).row.booking_no
  let ev = fin.events.find((e) => e.booking_no === no)
  results.plSeeded = !!ev && near(ev.paid, 2000) && near(ev.price, 1800) && near(ev.hours_cost, 4)
    && near(ev.extra_amount, 200) && near(ev.extra_hours, 1) && near(ev.booked_hours, 3)
  // 6) Costs: hours_cost is information now — 300 + 70 only, net 2000 − 370.
  fin = await send('/office/api/finance', { table: 'event', id: ev.id, hours_cost: 4, worker1: 300, transport: 70 }, 'PATCH')
  ev = fin.events.find((e) => e.booking_no === no)
  results.hoursNotCost = near(ev.total_expenses, 370) && near(ev.net_profit, 1630) && near(ev.hours_cost, 4)

  // 7) NULL remaining derives from the TOTAL: 1000 + 100 − 300 = 800.
  const B = await seed({ name: 'إضافي ب', phone: '0590000032', status: 'مؤكد', event_date: '2032-08-01', price: 1000, extra_amount: 100 })
  results.seedExtra = near(B.extra_amount, 100)
  r = await send('/office/api/payments', { booking_id: B.id, amount: 300, kind: 'عربون', method: 'Bit', paid_on: '2026-09-16' })
  results.deriveTotal = near(r.booking.remaining, 800) && near(r.booking.deposit, 300)

  // 8) المتأخرات carries the extra: held event, 1500 + 200, still owes 1400.
  const C = await seed({ name: 'إضافي ج', phone: '0590000033', status: 'مؤكد', event_date: '2024-02-02',
    price: 1500, extra_hours: 0.5, extra_amount: 200, deposit: 300, remaining: 1400 })
  const g = await get('/office/api/payments')
  const od = g.overdue.find((o) => o.id === C.id)
  results.overdueTotal = !!od && near(od.total, 1700) && near(od.extra_amount, 200)
  // 8b) A booking with no extra keeps total = price (no NULL poisoning).
  const advB = (await get('/office/api/finance')).advances.find((x) => x.client === 'إضافي ب')
  results.totalNoExtra = !!advB && near(advB.total, 1100)

  // --- UI ---
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // Drawer: the gold strip shows hours / ₪ / note / الإجمالي = 2000.
  await page.fill('#q', '0590000031')
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 1)
  await page.click('#grid tbody tr[data-id]')
  await page.waitForSelector('#paybox .payrow', { timeout: 10000 })
  results.drawerStrip = (await page.locator('#dBody .field.extra-time').count()) === 4
    && (await page.inputValue('#f_extra_hours')) === '1'
    && (await page.inputValue('#f_extra_amount')) === '200'
    && (await page.inputValue('#f_extra_note')) === 'ساعة زيادة'
    && (await page.inputValue('#f_total_price')) === '2000'
    && (await page.getAttribute('#f_total_price', 'readonly')) !== null
  // Typing a different extra: الإجمالي follows, المتبقي = total − Σ ledger (1700) = 400.
  await page.fill('#f_extra_amount', '300')
  results.drawerRecalc = (await page.inputValue('#f_total_price')) === '2100'
    && (await page.inputValue('#f_remaining')) === '400'
  // A hand-edited المتبقي wins from then on.
  await page.fill('#f_remaining', '50')
  await page.fill('#f_extra_amount', '200')
  results.manualWins = (await page.inputValue('#f_total_price')) === '2000'
    && (await page.inputValue('#f_remaining')) === '50'
  await page.click('#closeBtn')

  // Finance tab: ⏱ tile, P&L columns, expanded-row line, price cells with the +extra mark.
  await page.click('#tabs button[data-tab="finance"]')
  await page.waitForSelector('#finev', { state: 'attached', timeout: 10000 })
  results.finTile = (await page.locator('#finextra').count()) === 1
    && (await page.locator('#finextra').textContent()).includes('وقت إضافي')
  results.finEvCols = (await page.locator('#finev thead th').count()) === 12
    && (await page.locator('#finyears thead th').count()) === 8
  const evRow = page.locator('#finev tbody tr.frow', { hasText: 'إضافي أ' })
  results.finEvRow = (await evRow.count()) === 1
    && (await evRow.textContent()).includes('200 ₪')
    && (await evRow.locator('td').nth(5).textContent()).includes('1 س')
    && (await evRow.locator('td').nth(9).textContent()).trim() === '4'
  await page.click('details[data-sec="fin_ev"] summary')
  await evRow.click()
  await page.waitForSelector('#finev tr.fedit .evextra', { timeout: 10000 })
  results.finEvExpanded = (await page.locator('#finev tr.fedit .evextra').textContent()).includes('1 ساعة')
    && (await page.locator('#finev tr.fedit .evextra').textContent()).includes('2,000 ₪')
  results.finOverdueCell = (await page.locator('#finod tbody tr', { hasText: 'إضافي ج' }).textContent()).includes('+200 ₪')
  await page.click('details[data-sec="fin_adv"] summary')
  results.finAdvCell = (await page.locator('#finadv tbody tr', { hasText: 'إضافي ب' }).textContent()).includes('+100 ₪')
  // 2032 holds أ (200, completed) + ب (100, confirmed) → the year's ⏱ cell = 300 across 2 events.
  const yRow = await page.locator('#finyears tbody tr', { hasText: '2032' }).textContent()
  results.finYearsCell = yRow.includes('300 ₪') && yRow.includes('(2)')

  results.noPageErrors = errors.length === 0
  if (errors.length) console.error(errors.slice(0, 5))
} finally {
  if (browser) await browser.close()
  try {
    const fin = await get('/office/api/finance')
    for (const id of seeded) {
      const no = (await get(`/office/api/bookings/${id}`)).row?.booking_no
      const ev = no && fin.events.find((e) => e.booking_no === no)
      if (ev) await send('/office/api/finance', { table: 'event', id: ev.id }, 'DELETE')
    }
  } catch { /* best effort */ }
  for (const id of seeded) await fetch(`${BASE}/office/api/bookings/${id}`, { method: 'DELETE' }).catch(() => {})
}

console.log(results)
const fails = Object.entries(results).filter(([, v]) => !v)
console.log(fails.length ? `❌ FAILED: ${fails.map(([k]) => k).join(', ')}` : '✅ all checks passed')
process.exit(fails.length ? 1 : 0)
