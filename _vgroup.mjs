/* مناسبات العميل verification (2026-10-20) — one client, several dates.
   API: POST group_with joins the anchor's group (anchor becomes its own token), the list
   carries group_n (whole-table count) and filters by ?group=, GET one returns the group
   rows + same-phone suggestions, PATCH group_with links by id or SARAB number in any
   spelling (merging groups), null unlinks, a group of one dissolves (also on DELETE),
   bad refs are rejected. UI: the 🔗 chip + client view chip in the grid, the drawer strip
   (rows, totals, add-another-date prefill → save links, same-phone one-tap link, unlink,
   copy client details). Cleans up after itself (bookings cascade their payments).

   Run against `wrangler pages dev dist --port 8787` (ACCESS_DEV_BYPASS=1 in .dev.vars). */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8787'
const hdr = { 'Content-Type': 'application/json' }
const j = (r) => r.json()
const send = (path, body, method = 'POST') =>
  fetch(BASE + path, { method, headers: hdr, body: JSON.stringify(body) }).then(j)
const get = (path) => fetch(BASE + path).then(j)

const seeded = []
const seed = async (b) => { const r = await send('/office/api/bookings', b); seeded.push(r.row.id); return r.row }
const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001
const PHONE = '0590000041'
const one = (id) => get(`/office/api/bookings/${id}`)

const results = {}
let browser
try {
  // A: the bride-only night. B: the wedding, other city, added as "another date" of A.
  const A = await seed({ first_name: 'مجموعة', last_name: 'أ', phone: PHONE, status: 'مؤكد', event_date: '2034-05-01',
    occasion: 'حناء', city: 'الناصرة', price: 1500, deposit: 300, remaining: 1200, lead_source: 'توصية', client_city: 'كفر كنا' })
  results.seedAlone = A.group_id === null
  const rB = await send('/office/api/bookings', { first_name: 'مجموعة', last_name: 'أ', phone: PHONE, status: 'مؤكد',
    event_date: '2034-05-03', occasion: 'عرس', city: 'حيفا', price: 2000, group_with: A.id })
  seeded.push(rB.row.id); const B = rB.row
  results.postJoins = B.group_id === A.id && rB.group.length === 2
  let a = await one(A.id)
  results.anchorToken = a.row.group_id === A.id && a.group.length === 2 && a.group[0].id === A.id && a.group[1].id === B.id
  results.groupRowFields = near(a.group[1].total, 2000) && a.group[1].city === 'حيفا' && a.group[1].name === 'مجموعة أ' && a.group[1].booking_no === B.booking_no

  // The list: group_n on both, and ?group= lists exactly the pair.
  let list = await get(`/office/api/bookings?q=${PHONE}&order=new`)
  results.listGroupN = list.rows.filter((r) => r.group_id === A.id).every((r) => r.group_n === 2) && list.rows.length === 2
  list = await get(`/office/api/bookings?group=${A.id}`)
  results.groupFilter = list.rows.length === 2 && list.rows.map((r) => r.id).sort().join() === [A.id, B.id].sort().join()

  // C: the same client entered separately before linking existed → suggested, then linked by SARAB number.
  const C = await seed({ name: 'مجموعة أ (قديم)', phone: '+972 59-000-0041', status: 'استفسار', event_date: '2034-06-10', occasion: 'خطوبة', price: 1000 })
  a = await one(A.id)
  results.samePhoneSuggest = a.same_phone.length === 1 && a.same_phone[0].id === C.id
  const c0 = await one(C.id)
  results.samePhoneBothWays = c0.same_phone.length === 2 && c0.group.length === 0
  let r = await send(`/office/api/bookings/${C.id}`, { group_with: B.booking_no.toLowerCase().replace('sarab-0', 'sarab-') }, 'PATCH')
  results.linkByNumber = r.ok && r.row.group_id === A.id && r.group.length === 3
  a = await one(A.id)
  results.suggestGone = a.same_phone.length === 0 && a.group.length === 3
  // Bad refs.
  r = await send(`/office/api/bookings/${C.id}`, { group_with: 999999 }, 'PATCH')
  results.badRef = r.ok === false && r.error === 'link-target-not-found'
  r = await send(`/office/api/bookings/${A.id}`, { group_with: A.id }, 'PATCH')
  results.selfRef = r.ok === false && r.error === 'link-self'
  // A PATCH with a real field AND a link does both.
  r = await send(`/office/api/bookings/${C.id}`, { notes: 'مع الرابط', group_with: null }, 'PATCH')
  results.unlink = r.ok && r.row.group_id === null && r.row.notes === 'مع الرابط' && r.group.length === 0
  a = await one(A.id)
  results.unlinkLeavesPair = a.group.length === 2 && a.same_phone.length === 1

  // Merge: D starts its own group with C, then D links to A → all four in A's group.
  const D = await seed({ name: 'مجموعة د', phone: '0590000042', status: 'عرض سعر', event_date: '2034-07-01', price: 900 })
  r = await send(`/office/api/bookings/${C.id}`, { group_with: `#${D.id}` }, 'PATCH')
  results.secondGroup = r.row.group_id === D.id && r.group.length === 2
  r = await send(`/office/api/bookings/${D.id}`, { group_with: A.id }, 'PATCH')
  results.merge = r.row.group_id === A.id && r.group.length === 4 && (await one(C.id)).row.group_id === A.id
  // Totals skip cancelled dates in the UI; the API hands the status so it can.
  await send(`/office/api/bookings/${D.id}`, { status: 'ملغي' }, 'PATCH')

  // --- UI ---
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
  page.on('dialog', (d) => d.accept())
  await page.goto(BASE + '/office/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })

  // Grid: the search matches the typed digits literally (A + B; C's number is spelled
  // differently, D's is another number) — A's row still carries 🔗 4, the whole group;
  // clicking it switches to the client view (4 rows + chip).
  await page.fill('#q', PHONE)
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 2)
  const chipTxt = await page.locator(`#grid tr[data-id="${A.id}"] .gchip`).textContent()
  results.gridChip = chipTxt.trim() === '🔗 4'
  await page.click(`#grid tr[data-id="${A.id}"] .gchip`)
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 4)
  results.groupView = (await page.locator('#groupChip').isVisible()) && (await page.locator('#groupChip').textContent()).includes('مجموعة أ')
    && (await page.locator('#drawer.open').count()) === 0
  await page.click('#groupChip')
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 2)
  results.groupViewClears = !(await page.locator('#groupChip').isVisible())

  // Drawer strip on A: 4 rows, this-booking mark, totals over live dates (1500+2000+1000 = 4500, D cancelled).
  await page.click(`#grid tr[data-id="${A.id}"]`)
  await page.waitForSelector('#groupbox .grow', { timeout: 10000 })
  results.stripRows = (await page.locator('#groupbox .grow').count()) === 4
    && (await page.locator('#groupbox .grow.me').count()) === 1
  const headTxt = await page.locator('#groupbox .ghead').textContent()
  results.stripTotals = headTxt.includes('4 تواريخ') && headTxt.includes('(1 ملغي)') && headTxt.includes('4,500 ₪') && headTxt.includes('1,200 ₪')
  results.stripActions = (await page.locator('#gAdd').count()) === 1 && (await page.locator('#gUnlink').count()) === 1
    && (await page.locator('#gCopy').count()) === 1 && (await page.locator('#gRef').count()) === 1
  // Click-through to B from the strip.
  await page.click(`#groupbox .grow[data-id="${B.id}"] .go`)
  await page.waitForFunction((no) => document.querySelector('#dTitle').textContent.startsWith(no), B.booking_no)
  results.stripOpens = (await page.inputValue('#f_city')) === 'حيفا'
  // …and back to A the same way.
  await page.waitForSelector(`#groupbox .grow[data-id="${A.id}"] .go`)
  await page.click(`#groupbox .grow[data-id="${A.id}"] .go`)
  await page.waitForFunction((no) => document.querySelector('#dTitle').textContent.startsWith(no), A.booking_no)

  // ➕ another date (from A): client fields prefilled, event fields empty, save → joins the group.
  await page.waitForSelector('#gAdd')
  await page.click('#gAdd')
  await page.waitForFunction(() => document.querySelector('#dTitle').textContent.startsWith('تاريخ آخر'))
  results.prefill = (await page.inputValue('#f_phone')) === PHONE && (await page.inputValue('#f_first_name')) === 'مجموعة'
    && (await page.inputValue('#f_lead_source')) === 'توصية' && (await page.inputValue('#f_client_city')) === 'كفر كنا'
    && (await page.inputValue('#f_status')) === 'مؤكد'
    && (await page.inputValue('#f_event_date')) === '' && (await page.inputValue('#f_city')) === '' && (await page.inputValue('#f_price')) === ''
    && (await page.locator('#groupbox .grow').count()) === 4
  await page.fill('#f_event_date', '2034-05-05')
  await page.fill('#f_city', 'عكا')
  await page.fill('#f_price', '1800')
  await page.click('#saveBtn')
  await page.waitForFunction(() => /رُبط بمناسبات العميل \(5\)/.test(document.querySelector('#toast').textContent))
  a = await one(A.id)
  const E = a.group.find((g) => g.city === 'عكا')
  if (E) seeded.push(E.id)
  results.savedJoins = a.group.length === 5 && !!E && near(E.total, 1800) && E.status === 'مؤكد' && E.phone === PHONE

  // Same-phone suggestion → one tap link. F is a fresh unlinked booking on the number.
  const F = await seed({ name: 'مجموعة و', phone: PHONE, status: 'استفسار', event_date: '2034-08-08' })
  await page.click('#refreshBtn')   // A, B, E, F carry the typed number
  await page.waitForFunction(() => document.querySelectorAll('#grid tbody tr[data-id]').length === 4)
  await page.click(`#grid tr[data-id="${A.id}"]`)
  await page.waitForSelector('#groupbox .gsuglink', { timeout: 10000 })
  results.suggestShown = (await page.locator('#groupbox .gsuglink').count()) === 1
  await page.click('#groupbox .gsuglink')
  await page.waitForFunction(() => document.querySelectorAll('#groupbox .grow').length === 6)
  results.suggestLinks = (await one(F.id)).row.group_id === A.id && (await page.locator('#groupbox .gsuglink').count()) === 0

  // Copy client details from A's form to the other 5 (F had no first/last name).
  await page.fill('#f_email', 'group@example.com')
  await page.click('#gCopy')
  await page.waitForFunction(() => /نُسخت بيانات العميل إلى 5/.test(document.querySelector('#toast').textContent))
  const f1 = (await one(F.id)).row
  results.copyClient = f1.first_name === 'مجموعة' && f1.last_name === 'أ' && f1.email === 'group@example.com' && f1.event_date === '2034-08-08'
    && (await one(B.id)).row.email === 'group@example.com'

  // Unlink F from F's own drawer.
  await page.click('#closeBtn')
  await page.click(`#grid tr[data-id="${F.id}"]`)
  await page.waitForSelector('#gUnlink', { timeout: 10000 })
  await page.click('#gUnlink')
  await page.waitForFunction(() => document.querySelectorAll('#groupbox .grow').length === 0)
  results.unlinkUi = (await one(F.id)).row.group_id === null && (await one(A.id)).group.length === 5
  await page.click('#closeBtn')

  // Deleting one date keeps the others linked; a group left with one member dissolves.
  await fetch(`${BASE}/office/api/bookings/${B.id}`, { method: 'DELETE' })
  results.deleteKeepsGroup = (await one(A.id)).group.length === 4 && (await one(A.id)).row.group_id === A.id
  for (const id of [C.id, D.id, E.id]) await fetch(`${BASE}/office/api/bookings/${id}`, { method: 'DELETE' })
  results.deleteDissolves = (await one(A.id)).group.length === 0 && (await one(A.id)).row.group_id === null
  // Linking a lone A to lone F makes F the token; A's drawer-side link keeps A's group when it has one.
  r = await send(`/office/api/bookings/${A.id}`, { group_with: F.id }, 'PATCH')
  results.loneJoins = r.row.group_id === F.id
  await fetch(`${BASE}/office/api/bookings/${F.id}`, { method: 'DELETE' })
  results.dissolves = (await one(A.id)).row.group_id === null && (await get(`/office/api/bookings?q=${PHONE}`)).rows.every((r) => r.group_n === 0)

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
