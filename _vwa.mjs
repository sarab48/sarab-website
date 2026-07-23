/* WhatsApp webhook + واتساب tab verification. Simulates Meta Cloud API payloads against
   /api/wa-webhook (verify handshake, auth, live message w/ CTWA referral → auto booking,
   wamid dedupe, echo, history sync, contact sync, unknown field → raw log), checks the
   office API summary, then drives the واتساب tab headless (history contact → booking).
   Run against `wrangler pages dev dist --port 8792` (.dev.vars: ACCESS_DEV_BYPASS=1,
   WA_WEBHOOK_TOKEN=devtoken). Local-only test data. */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8792'
const HOOK = BASE + '/api/wa-webhook'
const AUTH = HOOK + '?token=devtoken'
const NOW = Math.floor(Date.now() / 1000)
const LEAD_PHONE = '972501111222'   // live lead, from ad
const HIST_PHONE = '972502223334'   // history-only contact
const results = {}
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const wrap = (field, value) => ({ object: 'whatsapp_business_account', entry: [{ id: 'WABA', changes: [{ field, value }] }] })
const meta = { display_phone_number: '972544997768', phone_number_id: 'PNID' }

// --- 1. handshake + auth ---
results.verifyOk = await (await fetch(HOOK + '?hub.mode=subscribe&hub.verify_token=devtoken&hub.challenge=CH42')).text()
results.verifyBad = (await fetch(HOOK + '?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x')).status
results.postNoAuth = (await post(HOOK, wrap('messages', {}))).status

// --- 2. live inbound with CTWA referral → استفسار auto-created ---
const msg1 = wrap('messages', {
  messaging_product: 'whatsapp', metadata: meta,
  contacts: [{ profile: { name: 'اختبار واتساب' }, wa_id: LEAD_PHONE }],
  messages: [{ from: LEAD_PHONE, id: 'wamid.TEST1', timestamp: String(NOW), type: 'text',
    text: { body: 'مرحبا، كم سعر الفوتوبوث لعرس في حيفا؟' },
    referral: { source_url: 'https://fb.me/xyz', source_type: 'ad', source_id: '1200999', headline: 'SARAB — فوتوبوث بالذكاء الاصطناعي', body: 'احجز الآن', media_type: 'image', ctwa_clid: 'clid-abc' } }],
})
results.live = await (await post(AUTH, msg1)).json()
results.liveDup = await (await post(AUTH, msg1)).json()   // retry → deduped, no 2nd lead

// second message, same number, no referral → no new booking
results.live2 = await (await post(AUTH, wrap('messages', {
  messaging_product: 'whatsapp', metadata: meta,
  contacts: [{ profile: { name: 'اختبار واتساب' }, wa_id: LEAD_PHONE }],
  messages: [{ from: LEAD_PHONE, id: 'wamid.TEST2', timestamp: String(NOW + 60), type: 'text', text: { body: 'التاريخ 2026-09-10' } }],
}))).json()

// --- 3. owner's reply echo ---
results.echo = await (await post(AUTH, wrap('smb_message_echoes', {
  messaging_product: 'whatsapp', metadata: meta,
  message_echoes: [{ from: '972544997768', to: LEAD_PHONE, id: 'wamid.ECHO1', timestamp: String(NOW + 120), type: 'text', text: { body: 'أهلا! السعر حسب المدينة' } }],
}))).json()

// --- 4. history sync (old chat) → stored, NO auto booking ---
results.history = await (await post(AUTH, wrap('history', {
  messaging_product: 'whatsapp', metadata: meta,
  history: [{ metadata: { phase: 0, chunk_order: 1, progress: 50 }, threads: [{ id: HIST_PHONE, messages: [
    { from: HIST_PHONE, id: 'wamid.OLD1', timestamp: String(NOW - 5_000_000), type: 'text', text: { body: 'شفت إعلانكم، بدي تفاصيل' } },
    { from: '972544997768', id: 'wamid.OLD2', timestamp: String(NOW - 4_990_000), type: 'text', text: { body: 'أهلين!' } },
  ] }] }],
}))).json()

// --- 4b. history sync's echo chunks: field "history" but value.message_echoes
//         (the shape Meta actually sent live on 2026-07-23) ---
results.histEcho = await (await post(AUTH, wrap('history', {
  messaging_product: 'whatsapp', metadata: meta,
  message_echoes: [{ from: '972544997768', to: HIST_PHONE, id: 'wamid.OLDECHO1', timestamp: String(NOW - 4_980_000), type: 'text', text: { body: 'تمام، بنكون عندكم' } }],
}))).json()

// --- 4c. history sync's inbound chunks: field "history" but value.messages
//         (third real Meta shape, seen live 2026-07-23) → stored, NO auto booking ---
results.histIn = await (await post(AUTH, wrap('history', {
  messaging_product: 'whatsapp', metadata: meta,
  messages: [{ from: HIST_PHONE, id: 'wamid.OLDIN3', timestamp: String(NOW - 4_970_000), type: 'image',
    image: { mime_type: 'image/jpeg', id: '926', url: 'https://lookaside.example/x' } }],
}))).json()

// --- 5. contact-name sync + unknown field → raw log ---
results.stateSync = await (await post(AUTH, wrap('smb_app_state_sync', {
  messaging_product: 'whatsapp', metadata: meta,
  state_sync: [{ type: 'contact', action: 'add', contact: { full_name: 'زبون قديم من الأرشيف', phone_number: '+' + HIST_PHONE } }],
}))).json()
results.unknown = await (await post(AUTH, wrap('some_future_field', { whatever: true }))).json()

// --- 6. office API state ---
const sum = await (await fetch(BASE + '/office/api/whatsapp')).json()
const lead = sum.contacts.find((c) => c.phone === LEAD_PHONE)
const hist = sum.contacts.find((c) => c.phone === HIST_PHONE)
results.summary = { kpi: sum.kpi, leadOk: !!(lead && lead.from_ad && lead.booking_id && lead.name === 'اختبار واتساب'), histOk: !!(hist && !hist.booking_id && hist.name === 'زبون قديم من الأرشيف') }
const bk = await (await fetch(BASE + '/office/api/bookings?q=0501111222')).json()
results.autoBooking = bk.rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, lead_source: r.lead_source, status: r.status, source: r.source, notes: (r.notes || '').slice(0, 20) }))
const conv = await (await fetch(BASE + '/office/api/whatsapp?phone=' + LEAD_PHONE)).json()
results.thread = conv.messages.map((m) => m.direction + ':' + (m.body || '').slice(0, 12))

// --- 7. UI: واتساب tab renders; history contact → أضف كاستفسار ---
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto(BASE + '/office/', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('#grid tbody tr[data-id]', { timeout: 15000 })
await page.locator('button[data-tab="whatsapp"]').click()
await page.waitForSelector('#whatsapp .kpi', { timeout: 10000 })
results.uiKpis = await page.locator('#whatsapp .kpi b').allTextContents()
results.uiRows = await page.locator('#whatsapp tbody tr').count()
results.uiAdChip = await page.locator('#whatsapp .chip:has-text("إعلان ميتا")').count()
await page.locator(`.waAdd[data-phone="${HIST_PHONE}"]`).click()
await page.waitForTimeout(1200)
results.uiHistAdded = await page.locator(`#whatsapp .chip:has-text("استفسار")`).count() >= 1
// open the lead's conversation
await page.locator(`.waOpen[data-phone="${LEAD_PHONE}"]`).click()
await page.waitForTimeout(600)
results.uiThread = (await page.locator('#waMsgs').textContent())?.includes('كم سعر الفوتوبوث')
await browser.close()

// --- cleanup: local test rows out of bookings + wa tables ---
for (const r of results.autoBooking) await fetch(BASE + '/office/api/bookings/' + r.id, { method: 'DELETE' })
const bk2 = await (await fetch(BASE + '/office/api/bookings?q=0502223334')).json()
for (const r of bk2.rows) await fetch(BASE + '/office/api/bookings/' + r.id, { method: 'DELETE' })
results.cleanup = 'bookings removed: ' + (results.autoBooking.length + bk2.rows.length) + ' (wa_messages test rows stay local-only)'

console.log(JSON.stringify(results, null, 2))
console.log('PAGE ERRORS:', errors.length ? errors : 'none')
