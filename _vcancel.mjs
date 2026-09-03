/* الإلغاءات verification — cancelled after paying an advance (2026-09-03).
   API: cancelling stamps cancelled_at, the cancellations read model derives state
   (pending / kept / refund_due / refunded / partial) from the decision + the ledger,
   a refund (kind استرداد) is stored negative, reverses العربون/المتبقي, auto-decides
   'refund', and nets out of the ledger sums; the finance payload adds kept advances;
   un-cancelling clears the record. UI: the tab (KPIs, chips, rows, expanded panel,
   decision chips, refund form), the drawer's cancellation strip, the finance tile.
   Cleans up after itself (bookings cascade their payments).

   Run against `wrangler pages dev dist --port 8789` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8789'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)
const get = (path) => fetch(BASE + path).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001
const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const canRow = async (id) => (await get('/office/api/cancellations')).rows.find((r) => r.id === id)

const results = {}
let browser
try {
  // Baselines before seeding anything — every later check compares deltas so the
  // local DB's own contents never matter.
  const fin0 = await get('/office/api/finance')
  const pay0 = await get('/office/api/payments')
  const kept0 = fin0.cancellations.kept
  const month0 = (pay0.byMonth.find((m) => m.k === today.slice(0, 7)) || { s: 0 }).s

  // C1: confirmed, price 1800, advance 300 through the ledger → then cancels.
  const C1 = await seed({ name: 'إلغاء أ', phone: '0590000031', status: 'مؤكد', event_date: '2033-03-10', price: 1800 })
  await send('/office/api/payments', { booking_id: C1.id, amount: 300, kind: 'عربون', method: 'Bit', paid_on: '2026-08-20' })
  let r = await send(`/office/api/bookings/${C1.id}`, { status: 'ملغي' }, 'PATCH')
  results.cancelStamps = r.row.status === 'ملغي' && r.row.cancelled_at === today && r.row.cancel_decision === null
  let c = await canRow(C1.id)
  results.pendingState = !!c && c.state === 'pending' && near(c.paid_in, 300) && near(c.refunded, 0) && near(c.kept, 300)
    && c.payments.length === 1 && !c.no_ledger
  // header KPI counts it as undecided
  results.metaPending = Number((await get('/office/api/meta')).kpi.cancel_pending) >= 1

  // 1) decide: keep → state kept, finance kept grows by 300.
  await send(`/office/api/bookings/${C1.id}`, { cancel_decision: 'kept' }, 'PATCH')
  c = await canRow(C1.id)
  results.keptState = c.state === 'kept' && near(c.kept, 300)
  let fin = await get('/office/api/finance')
  results.financeKept = near(fin.cancellations.kept - kept0, 300)
  // 1b) a bad decision value is ignored (stored NULL), not an error
  r = await send(`/office/api/bookings/${C1.id}`, { cancel_decision: 'bogus' }, 'PATCH')
  results.badDecisionNull = r.ok && r.row.cancel_decision === null
  c = await canRow(C1.id)
  results.backToPending = c.state === 'pending'

  // 2) refund 300 (sent positive) → stored −300, deposit 300→0, remaining 1500→1800,
  //    decision auto 'refund', state refunded, kept 0, ledger sums net it out.
  r = await send('/office/api/payments', { booking_id: C1.id, amount: 300, kind: 'استرداد', method: 'تحويل بنكي', paid_on: today, method_ref: 'حوالة 777' })
  const refundRow = r.payments.find((p) => p.kind === 'استرداد')
  results.refundNegative = !!refundRow && near(refundRow.amount, -300)
  results.refundReverses = near(r.booking.deposit, 0) && near(r.booking.remaining, 1800)
  results.refundAutoDecides = r.booking.cancel_decision === 'refund'
  c = await canRow(C1.id)
  results.refundedState = c.state === 'refunded' && near(c.refunded, 300) && near(c.kept, 0) && c.payments.length === 2
  const pay1 = await get('/office/api/payments')
  results.ledgerRefundsKpi = near(pay1.kpi.refunds - (pay0.kpi.refunds || 0), 300)
  const month1 = (pay1.byMonth.find((m) => m.k === today.slice(0, 7)) || { s: 0 }).s
  results.monthNetsRefund = near(month1 - month0, -300)
  fin = await get('/office/api/finance')
  results.financeNotKept = near(fin.cancellations.kept - kept0, 0) && fin.cancellations.refunded >= 300
  // 2b) deleting the refund puts the advance back (deposit 0→300, remaining 1800→1500)
  r = await send('/office/api/payments', { id: refundRow.id }, 'DELETE')
  results.refundDeleteRestores = near(r.booking.deposit, 300) && near(r.booking.remaining, 1500)
  // decision stays 'refund' (a deleted row is not a decision) → refund_due with due 300
  c = await canRow(C1.id)
  results.refundDueState = c.state === 'refund_due' && near(c.due, 300)
  // 2c) PATCH a refund's amount keeps the sign rule: re-add, then PATCH amount 100 → −100
  r = await send('/office/api/payments', { booking_id: C1.id, amount: 300, kind: 'استرداد', method: 'نقداً', paid_on: today })
  const rid = r.payments.find((p) => p.kind === 'استرداد').id
  r = await send('/office/api/payments', { id: rid, amount: 100 }, 'PATCH')
  results.refundPatchSign = near(r.payments.find((p) => p.id === rid).amount, -100)
    && near(r.booking.deposit, 200) && near(r.booking.remaining, 1600)
  c = await canRow(C1.id)
  results.partialRefundDue = c.state === 'refund_due' && near(c.refunded, 100) && near(c.kept, 200) && near(c.due, 200)
  // keep the rest → partial (final), kept 200 counts in finance
  await send(`/office/api/bookings/${C1.id}`, { cancel_decision: 'kept' }, 'PATCH')
  c = await canRow(C1.id)
  results.partialState = c.state === 'partial' && near(c.kept, 200)
  fin = await get('/office/api/finance')
  results.financePartial = near(fin.cancellations.kept - kept0, 200)

  // 3) un-cancel: the record closes (date + decision NULL), the reason survives.
  await send(`/office/api/bookings/${C1.id}`, { cancel_reason: 'تأجيل الفرح' }, 'PATCH')
  r = await send(`/office/api/bookings/${C1.id}`, { status: 'مؤكد' }, 'PATCH')
  results.uncancelClears = r.row.cancelled_at === null && r.row.cancel_decision === null && r.row.cancel_reason === 'تأجيل الفرح'
  results.uncancelLeavesTab = !(await canRow(C1.id))
  // re-cancel with an explicit date → that date wins over the stamp
  r = await send(`/office/api/bookings/${C1.id}`, { status: 'ملغي', cancelled_at: '2026-09-01' }, 'PATCH')
  results.explicitCancelDate = r.row.cancelled_at === '2026-09-01'

  // C2: deposit typed by hand only (no ledger row) → fallback + no_ledger flag.
  const C2 = await seed({ name: 'إلغاء ب', phone: '0590000032', status: 'ملغي', event_date: '2033-04-01', price: 2000, deposit: 250, cancel_reason: 'اختار مزوّداً آخر' })
  results.postCancelStamps = C2.cancelled_at === today
  c = await canRow(C2.id)
  results.noLedgerFallback = c.state === 'pending' && near(c.paid_in, 250) && c.no_ledger === true && c.cancel_reason === 'اختار مزوّداً آخر'

  // C3: cancelled with no money at all → state none, excluded from the summary.
  const C3 = await seed({ name: 'إلغاء ج', phone: '0590000033', status: 'ملغي', event_date: '2033-05-01' })
  c = await canRow(C3.id)
  results.noneState = c.state === 'none'
  const sum = (await get('/office/api/cancellations')).summary
  results.summaryCounts = sum.n >= 2 && sum.pending_n >= 1

  // ---------- UI ----------
  browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('dialog', (d) => d.accept())
  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr', { timeout: 15000 })

  // header tile for undecided cancellations → click jumps to the tab
  results.uiHeaderTile = (await page.locator('#kpis .kpi[data-goto="cancellations"]').count()) === 1
  await page.click('#kpis .kpi[data-goto="cancellations"]')
  await page.waitForSelector('#canbox tbody tr[data-canrow]', { timeout: 10000 })
  results.uiTabOpens = (await page.locator('#tabs button.on').getAttribute('data-tab')) === 'cancellations'
  results.uiRows = (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء أ' }).count()) === 1
    && (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ب' }).count()) === 1
    && (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ج' }).count()) === 0   // money filter hides it
  results.uiKpis = (await page.locator('#cancellations .kpi').count()) === 5
  results.uiNoLedgerFlag = (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ب' }).locator('span[title*="سجل المدفوعات"]').count()) === 1
  // «كل الإلغاءات» chip brings the money-less one in
  await page.click('#cancellations .chip[data-cf="all"]')
  results.uiAllChip = (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ج' }).count()) === 1
  await page.click('#cancellations .chip[data-cf="pending"]')
  results.uiPendingChip = (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ب' }).count()) === 1
    && (await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء أ' }).count()) === 0
  await page.click('#cancellations .chip[data-cf="money"]')

  // expand ب → decision chips + the refund form (250 prefilled) + the details form
  await page.locator('#canbox tr[data-canrow]', { hasText: 'إلغاء ب' }).click()
  const det = page.locator(`tr[data-candet="${C2.id}"]`)
  await det.waitFor({ state: 'visible' })
  results.uiPanel = (await det.locator('[data-dec="kept"]').count()) === 1
    && (await det.locator('.c_amount').inputValue()) === '250'
    && (await det.locator('.c_reason').inputValue()) === 'اختار مزوّداً آخر'
  // decide keep → badge flips, panel stays open after the re-render
  await det.locator('[data-dec="kept"]').click()
  await page.waitForFunction((id) => {
    const tr = document.querySelector(`tr[data-canrow="${id}"]`)
    return tr && tr.textContent.includes('محتفظ به') && document.querySelector(`tr[data-candet="${id}"]`).style.display !== 'none'
  }, C2.id, { timeout: 10000 })
  results.uiKeepDecision = true
  // record a refund of 100 from the panel → row shows مسترد 100 · محتفظ به 150 · partial badge
  await det.locator('.c_amount').fill('100')
  await det.locator('.c_method').selectOption('نقداً')
  await det.locator('.c_refund').click()
  await page.waitForFunction((id) => {
    const tr = document.querySelector(`tr[data-canrow="${id}"]`)
    return tr && tr.textContent.includes('استرداد جزئي')
  }, C2.id, { timeout: 10000 })
  const rowB = page.locator(`tr[data-canrow="${C2.id}"]`)
  results.uiRefundForm = (await rowB.locator('td').nth(6).textContent()).includes('100')
    && (await rowB.locator('td').nth(7).textContent()).includes('150')
  // the panel's payment trail now lists the refund with its icon
  results.uiTrail = (await page.locator(`tr[data-candet="${C2.id}"] .cpay`, { hasText: '↩' }).count()) === 1
  // save the details (date + reason) from the panel
  await page.locator(`tr[data-candet="${C2.id}"] .c_reason`).fill('سبب جديد')
  await page.locator(`tr[data-candet="${C2.id}"] .c_save`).click()
  await page.waitForFunction((id) => {
    const tr = document.querySelector(`tr[data-canrow="${id}"]`)
    return tr && tr.textContent.includes('سبب جديد')
  }, C2.id, { timeout: 10000 })
  results.uiSaveDetails = true

  // «فتح الحجز» → the drawer, with the cancellation strip visible and filled
  await page.locator(`tr[data-candet="${C2.id}"] .c_open`).click()
  await page.waitForSelector('.drawer.open #paybox .payrow', { timeout: 10000 })
  results.uiDrawerStrip = (await page.locator('#dBody .cancel-only').first().isVisible())
    && (await page.inputValue('#f_cancel_decision')) === 'kept'
    && (await page.inputValue('#f_cancelled_at')) === today
    && (await page.inputValue('#f_cancel_reason')) === 'سبب جديد'
  // the drawer's ledger panel shows the refund and the header counts it apart
  results.uiDrawerRefund = (await page.locator('#paybox .payrow', { hasText: 'استرداد' }).count()) === 1
    && (await page.locator('#paybox .payhead').textContent()).includes('مسترد')
  // switching the status away hides the strip; back to ملغي shows it again
  await page.selectOption('#f_status', 'مؤكد')
  results.uiStripHides = !(await page.locator('#dBody .cancel-only').first().isVisible())
  await page.selectOption('#f_status', 'ملغي')
  results.uiStripShows = await page.locator('#dBody .cancel-only').first().isVisible()
  // the kind select in the drawer offers استرداد
  results.uiKindOption = (await page.locator('#p_kind option', { hasText: 'استرداد' }).count()) === 1
  await page.click('#closeBtn')

  // grid marker on a cancelled row with a decision
  await page.click('#tabs button[data-tab="bookings"]')
  await page.fill('#q', 'إلغاء ب')
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 1, null, { timeout: 10000 })
  results.uiGridMark = (await page.locator('#grid tbody tr .cmark').count()) === 1
  await page.fill('#q', '')

  // finance: the cancellations tile is there and «محصّل فعلياً» names the kept advances
  await page.click('#tabs button[data-tab="finance"]')
  await page.waitForSelector('#fincan', { timeout: 10000 })
  results.uiFinanceTile = (await page.locator('#fincan').textContent()).includes('محتفظ بها')
    && (await page.locator('#finance .kpi', { hasText: 'محصّل فعلياً (' }).first().textContent()).includes('إلغاء')
  // the ledger's kind filter offers استرداد and narrows to refund rows only
  await page.selectOption('#plkind', 'استرداد')
  await page.waitForFunction(() => {
    const rows = [...document.querySelectorAll('#plrows tr[data-open]')]
    return rows.length >= 1 && rows.every((r) => r.textContent.includes('استرداد'))
  }, null, { timeout: 10000 })
  results.uiLedgerRefundFilter = true

  results.noPageErrors = errors.length === 0
  if (errors.length) console.error(errors.slice(0, 5))
} finally {
  if (browser) await browser.close()
  for (const id of seeded) await fetch(`${BASE}/office/api/bookings/${id}`, { method: 'DELETE' }).catch(() => {})
}

console.log(results)
const fails = Object.entries(results).filter(([, v]) => !v)
console.log(fails.length ? `❌ FAILED: ${fails.map(([k]) => k).join(', ')}` : '✅ all checks passed')
process.exit(fails.length ? 1 : 0)
