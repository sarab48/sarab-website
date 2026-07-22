/* Meta-campaign sources verification: add a campaign from the CAPI tab, see it in the
   مصدر العميل dropdown, book a client on it, watch it count in the CAPI tables and the
   per-campaign breakdown, then delete it and watch it drop out. Also probes the options
   API validation. Run against `wrangler pages dev dist --port 8791` (ACCESS_DEV_BYPASS=1). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8791'
const CAMP = 'ميتا — حملة اختبار آب'
const j = (r) => r.json()

// --- API-level checks first ---
const api = {}
api.badKind = (await fetch(BASE + '/office/api/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'status', value: 'x' }) })).status
api.empty = (await fetch(BASE + '/office/api/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'meta_campaign', value: '  ' }) })).status
api.clashLead = (await fetch(BASE + '/office/api/options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'meta_campaign', value: 'واتساب' }) })).status
// clean any leftover from a previous run
await fetch(BASE + '/office/api/options', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'meta_campaign', value: CAMP }) })

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
// the duplicate-add negative test intentionally provokes one 409 — not a failure
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('409')) errors.push('console: ' + m.text()) })
page.on('dialog', (d) => d.accept())

await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

// --- CAPI tab: add the campaign from the UI ---
await page.locator('button[data-tab="capi"]').click()
await page.waitForSelector('#campName', { timeout: 10000 })
const rowsBefore = await page.locator('#capi table').first().locator('tbody tr').count()
await page.fill('#campName', CAMP)
await page.locator('#campAdd').click()
await page.waitForTimeout(1200)
const campaignRow = await page.locator(`#capi td b:text-is("${CAMP}")`).count()
const kpiConf0 = Number(await page.locator('#capi .kpi b').first().textContent())

// duplicate add → error toast, no second row
await page.fill('#campName', CAMP)
await page.locator('#campAdd').click()
await page.waitForTimeout(800)
const dupRows = await page.locator(`#capi td b:text-is("${CAMP}")`).count()

// --- dropdown: the campaign must be selectable as مصدر العميل ---
await page.locator('button[data-tab="bookings"]').click()
await page.waitForTimeout(300)
await page.locator('#newBtn').click()
await page.waitForTimeout(400)
const inDropdown = await page.evaluate((camp) =>
  [...document.querySelector('#f_lead_source').options].filter((o) => o.value === camp).length, CAMP)
await page.keyboard.press('Escape')

// --- book a confirmed client on the campaign (via API, faster) and re-check CAPI ---
const created = await j(await fetch(BASE + '/office/api/bookings', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'اختبار حملة', phone: '0501234567', event_date: '2026-09-01', city: 'حيفا', price: 2600, status: 'مؤكد', lead_source: CAMP }),
}))
await page.locator('button[data-tab="capi"]').click()
await page.waitForTimeout(1200)
const kpiConf1 = Number(await page.locator('#capi .kpi b').first().textContent())
const campRowTxt = await page.locator(`#capi tr:has(td b:text-is("${CAMP}"))`).first().innerText()
const inConfTable = await page.locator(`#capi td b:text-is("اختبار حملة")`).count()
await page.screenshot({ path: 'docs/styleframes/vcampaign-capi.png', fullPage: true })

// --- delete the campaign from the UI → row gone, booking out of CAPI ---
await page.locator(`#capi button.campDel[data-camp="${CAMP}"]`).click()
await page.waitForTimeout(1200)
const rowAfterDel = await page.locator(`#capi td b:text-is("${CAMP}")`).count()
const kpiConf2 = Number(await page.locator('#capi .kpi b').first().textContent())

await browser.close()

// cleanup the test booking
const del = (await fetch(BASE + '/office/api/bookings/' + created.row.id, { method: 'DELETE' })).status

const pass = api.badKind === 400 && api.empty === 400 && api.clashLead === 409
  && campaignRow === 1 && dupRows === 1 && inDropdown === 1
  && kpiConf1 === kpiConf0 + 1 && inConfTable === 1
  && /2,600|2600/.test(campRowTxt)
  && rowAfterDel === 0 && kpiConf2 === kpiConf0
  && del === 200 && errors.length === 0
console.log(JSON.stringify({ pass, api, rowsBefore, campaignRow, dupRows, inDropdown, kpiConf0, kpiConf1, kpiConf2, campRowTxt, inConfTable, rowAfterDel, del, errors }, null, 1))
