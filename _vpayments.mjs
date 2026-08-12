/* سجل المدفوعات verification — the payments ledger + سجّل دفعة.
   API arithmetic: عربون moves deposit AND remaining, دفعة moves remaining only,
   PATCH re-syncs by delta (amount and kind flips), DELETE reverses exactly,
   a NULL remaining derives from price − Σ ledger, and the event's P&L row follows
   (paid += amount, net recomputed). UI: the drawer panel records/deletes and refreshes
   العربون/المتبقي in place; المالية shows the log, المتأخرات, and the cash bars.
   Cleans up after itself (bookings cascade their payments; the P&L row via finance API).

   Run against `wrangler pages dev dist --port 8795` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8795'
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
  // Booking أ: price 2000, no deposit, no remaining recorded → the NULL-remaining branch.
  const A = await seed({ name: 'دفعات أ', phone: '0590000021', status: 'مؤكد', event_date: '2032-06-10', price: 2000 })
  // Booking ب: already-held event still owing 800 → must land in المتأخرات.
  await seed({ name: 'دفعات ب', phone: '0590000022', status: 'مؤكد', event_date: '2024-01-15', price: 1000, deposit: 200, remaining: 800 })

  // --- API arithmetic ---
  // 1) عربون 500: deposit 0→500; remaining NULL → price − Σ = 1500.
  let r = await send('/office/api/payments', { booking_id: A.id, amount: 500, kind: 'عربون', method: 'Bit', paid_on: '2026-08-11' })
  results.advSetsDeposit = near(r.booking.deposit, 500) && near(r.booking.remaining, 1500)
  const payAdv = r.payments[0].id
  // 2) دفعة 700: deposit stays, remaining 1500→800.
  r = await send('/office/api/payments', { booking_id: A.id, amount: 700, kind: 'دفعة', method: 'نقداً', paid_on: '2026-08-11' })
  results.payKeepsDeposit = near(r.booking.deposit, 500) && near(r.booking.remaining, 800)
  const payPay = r.payments.find((p) => p.id !== payAdv).id
  // 2b) PATCH payer + method_ref only: stored and echoed, NO delta applied (2026-08-12).
  r = await send('/office/api/payments', { id: payPay, payer: 'والد العريس', method_ref: 'حوالة 12345' }, 'PATCH')
  const pp = r.payments.find((p) => p.id === payPay)
  results.payerStored = pp.payer === 'والد العريس' && pp.method_ref === 'حوالة 12345'
    && near(r.booking.deposit, 500) && near(r.booking.remaining, 800)
  // 3) PATCH amount 700→800: remaining 800→700.
  r = await send('/office/api/payments', { id: payPay, amount: 800 }, 'PATCH')
  results.patchAmount = near(r.booking.deposit, 500) && near(r.booking.remaining, 700)
  // 4) PATCH kind دفعة→عربون: deposit 500→1300, remaining untouched.
  r = await send('/office/api/payments', { id: payPay, kind: 'عربون' }, 'PATCH')
  results.patchKind = near(r.booking.deposit, 1300) && near(r.booking.remaining, 700)
  // 5) DELETE the first عربون: deposit 1300→800, remaining 700→1200.
  r = await send('/office/api/payments', { id: payAdv }, 'DELETE')
  results.deleteReverses = near(r.booking.deposit, 800) && near(r.booking.remaining, 1200)

  // 6) Completed → P&L row seeds (paid = price − remaining = 800); a payment then follows it.
  await send(`/office/api/bookings/${A.id}`, { status: 'مكتمل' }, 'PATCH')
  let fin = await get('/office/api/finance')
  const bookingNo = (await get(`/office/api/bookings/${A.id}`)).row.booking_no
  let evRow = fin.events.find((e) => e.booking_no === bookingNo)
  results.plSeeded = !!evRow && near(evRow.paid, 800)
  r = await send('/office/api/payments', { booking_id: A.id, amount: 1200, kind: 'دفعة', method: 'تحويل بنكي' })
  results.payClearsRemaining = near(r.booking.remaining, 0)
  fin = await get('/office/api/finance')
  evRow = fin.events.find((e) => e.booking_no === bookingNo)
  results.plFollows = !!evRow && near(evRow.paid, 2000) && near(evRow.net_profit, 2000 - (evRow.total_expenses || 0))

  // 7) Global view: ledger rows, month/method sums, and المتأخرات holds booking ب only.
  const g = await get('/office/api/payments')
  results.globalLedger = g.rows.some((p) => p.booking_id === A.id) && g.byMethod.length >= 2
    && g.byMonth.some((m) => m.k === '2026-08')
  results.overdueList = g.overdue.some((o) => o.name === 'دفعات ب') && !g.overdue.some((o) => o.id === A.id)
  results.globalMatched = g.matched && g.matched.n >= g.rows.length

  // 8) Ledger filters (2026-08-12): q matches the payer, method and kind narrow exactly.
  const gq = await get('/office/api/payments?q=' + encodeURIComponent('والد العريس'))
  results.filterQ = gq.rows.length >= 1 && gq.rows.every((p) => (p.payer || '').includes('والد'))
    && gq.matched.n === gq.rows.length
  const gm = await get('/office/api/payments?method=' + encodeURIComponent('تحويل بنكي'))
  results.filterMethod = gm.rows.length >= 1 && gm.rows.every((p) => p.method === 'تحويل بنكي')
  const gk2 = await get('/office/api/payments?kind=' + encodeURIComponent('عربون'))
  results.filterKind = gk2.rows.length >= 1 && gk2.rows.every((p) => p.kind === 'عربون')

  // --- UI ---
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  page.on('dialog', (d) => d.accept())

  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // Drawer: search for أ, open, panel lists the 2 remaining payments with the total.
  await page.fill('#q', '0590000021')
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 1)
  await page.click('#grid tbody tr[data-id]')
  await page.waitForSelector('#paybox .payrow', { timeout: 10000 })
  results.drawerLists = (await page.locator('#paybox .payrow').count()) === 2
    && (await page.locator('#paybox .payhead').textContent()).includes('2,000')

  // مرجع الدفع hint follows the method (bank transfer wants the payer's account/ref).
  await page.selectOption('#p_method', 'تحويل بنكي')
  results.refHint = (await page.getAttribute('#p_ref', 'placeholder')).includes('حساب')

  // Record 150 via the form → row count 3, العربون/المتبقي inputs move (800 stays, −150),
  // and the payer typed into اسم الدافع shows on the new row.
  await page.fill('#p_amount', '150')
  await page.selectOption('#p_kind', 'دفعة')
  await page.selectOption('#p_method', 'Bit')
  await page.fill('#p_payer', 'عمة العروس')
  await page.fill('#p_ref', 'ביט 052')
  await page.click('#payAdd')
  await page.waitForFunction(() => document.querySelectorAll('#paybox .payrow').length === 3)
  results.uiRecord = (await page.inputValue('#f_deposit')) === '800'
    && (await page.inputValue('#f_remaining')) === '-150'
  results.uiPayerShown = (await page.locator('#paybox .payrow', { hasText: 'عمة العروس' }).count()) === 1
  // Delete that row (newest = last) → back to 2 rows, المتبقي back to 0.
  await page.locator('#paybox .payrow .paydel').last().click()
  await page.waitForFunction(() => document.querySelectorAll('#paybox .payrow').length === 2)
  results.uiDelete = (await page.inputValue('#f_remaining')) === '0'
  await page.click('#closeBtn')

  // المالية: the KPI tile, the ledger table with our rows, المتأخرات with ب, both bars.
  await page.click('#tabs button[data-tab="finance"]')
  await page.waitForSelector('#finpay', { timeout: 10000 })
  results.finKpiTile = (await page.locator('#finance .kpi', { hasText: 'محصّل هذا الشهر' }).count()) === 1
  results.finLedger = (await page.locator('#finpay tbody tr', { hasText: 'دفعات أ' }).count()) >= 2
  results.finOverdue = (await page.locator('#finod tbody tr', { hasText: 'دفعات ب' }).count()) === 1
  results.finBars = (await page.locator('#finance .statbox', { hasText: 'المقبوضات بالشهر' }).count()) === 1
    && (await page.locator('#finance .statbox', { hasText: 'طرق الدفع' }).count()) === 1

  // 2026-08-12 — the reorganized tab: السنوات مالياً + الأشهر tables render inside open
  // sections; the ledger search narrows the rows to the matching client only.
  results.finYears = (await page.locator('#finyears tbody tr').count()) >= 1
    && (await page.getAttribute('details[data-sec="fin_years"]', 'open')) !== null
  results.finMonths = (await page.locator('#finmonths tbody tr').count()) >= 1
  results.secClosed = (await page.getAttribute('details[data-sec="fin_ev"]', 'open')) === null
  await page.fill('#plq', 'دفعات أ')
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('#plrows tr[data-open]')]
    return rows.length >= 2 && rows.every((r) => r.textContent.includes('دفعات أ'))
  }, null, { timeout: 10000 })
  results.ledgerFilter = true
  // the payer recorded in the drawer travels to the ledger row
  results.ledgerPayer = (await page.locator('#plrows tr', { hasText: 'والد العريس' }).count()) >= 1
  await page.fill('#plq', '')
  await page.waitForFunction(() =>
    document.querySelectorAll('#plrows tr[data-open]').length >= 2, null, { timeout: 10000 })
  // المتأخرات row opens the drawer on ب.
  await page.locator('#finod tbody tr', { hasText: 'دفعات ب' }).click()
  await page.waitForSelector('.drawer.open #paybox', { timeout: 10000 })
  results.overdueOpensDrawer = (await page.locator('#dTitle').textContent()).includes('دفعات ب')

  results.noPageErrors = errors.length === 0
  if (errors.length) console.error(errors.slice(0, 5))
} finally {
  if (browser) await browser.close()
  // The P&L row seeded for أ (keyed on its booking_no) — remove via the finance API.
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
