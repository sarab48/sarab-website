/*
  Anonymous, cookie-less usage beacon + ad attribution capture (POST /api/hit).
  - Respects Do Not Track (sends nothing).
  - Session id lives in sessionStorage only — it dies with the tab; no persistent ids.
  - Captures utm_* + fbclid once per visit; the booking form attaches attribution()
    so Meta-ad leads are credited automatically (the owner's key marketing signal).
*/

const ATTR_KEY = 'sarab-attr'
const SID_KEY = 'sarab-sid'

const dnt = () => navigator.doNotTrack === '1' || window.doNotTrack === '1'

export function attribution() {
  try { return JSON.parse(sessionStorage.getItem(ATTR_KEY) || '{}') } catch { return {} }
}

function captureAttribution() {
  try {
    const q = new URLSearchParams(location.search)
    const prev = attribution()
    const a = {
      us: q.get('utm_source') || prev.us || '',
      um: q.get('utm_medium') || prev.um || '',
      uc: q.get('utm_campaign') || prev.uc || '',
      f: q.has('fbclid') || prev.f ? 1 : 0,
      r: prev.r || (document.referrer ? new URL(document.referrer).hostname : ''),
    }
    sessionStorage.setItem(ATTR_KEY, JSON.stringify(a))
  } catch { /* storage may be blocked — fine */ }
}

function sid() {
  try {
    let v = sessionStorage.getItem(SID_KEY)
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(SID_KEY, v)
    }
    return v
  } catch { return '' }
}

export function hit(t, v) {
  if (dnt()) return
  const a = attribution()
  const body = JSON.stringify({
    t, v,
    s: sid(),
    l: document.documentElement.lang || '',
    d: matchMedia('(pointer:coarse)').matches ? 'mobile' : 'desktop',
    r: a.r || '', us: a.us || '', um: a.um || '', uc: a.uc || '', f: a.f ? 1 : 0,
  })
  const sent = navigator.sendBeacon?.('/api/hit', new Blob([body], { type: 'application/json' }))
  if (!sent) fetch('/api/hit', { method: 'POST', body, keepalive: true }).catch(() => {})
}

export function initAnalytics() {
  if (dnt()) return
  captureAttribution()
  hit('view')

  // scroll depth milestones (once each)
  const marks = [25, 50, 75, 100]
  let raf = 0
  const onScroll = () => {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      const h = document.documentElement
      const depth = Math.min(100, Math.round(((h.scrollTop + innerHeight) / h.scrollHeight) * 100))
      while (marks.length && depth >= marks[0]) hit('scroll', marks.shift())
      if (!marks.length) removeEventListener('scroll', onScroll)
    })
  }
  addEventListener('scroll', onScroll, { passive: true })

  // WhatsApp taps anywhere on the page
  addEventListener('click', (e) => {
    if (e.target.closest?.('a[href*="wa.me"]')) hit('wa')
  }, true)

  // visible time, flushed when the page goes away
  let vis = 0
  let t0 = document.visibilityState === 'visible' ? Date.now() : 0
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') t0 = Date.now()
    else if (t0) { vis += Date.now() - t0; t0 = 0 }
  })
  addEventListener('pagehide', () => {
    if (t0) vis += Date.now() - t0
    if (vis > 500) hit('time', Math.round(vis / 1000))
  })
}
