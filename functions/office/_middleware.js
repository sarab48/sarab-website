/*
  Gate for EVERYTHING under /office (the admin page and its API).
  Cloudflare Access already walls this path at the edge; this middleware additionally
  verifies the signed Access JWT on every request, so the data endpoints stay sealed
  even on un-walled hostnames (e.g. hashed preview subdomains) or if the Access app
  were ever misconfigured. No valid token → 403, no data.
*/

let certCache = { keys: null, fetched: 0 }

async function accessCerts(teamDomain) {
  if (!certCache.keys || Date.now() - certCache.fetched > 3600_000) {
    const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`)
    if (!res.ok) throw new Error(`certs fetch failed: ${res.status}`)
    certCache = { keys: (await res.json()).keys, fetched: Date.now() }
  }
  return certCache.keys
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function verifyAccessJwt(token, teamDomain, aud) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [h, p, sig] = parts
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)))
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)))

  const now = Math.floor(Date.now() / 1000)
  if (typeof payload.exp !== 'number' || payload.exp < now) return null
  if (typeof payload.nbf === 'number' && payload.nbf > now + 30) return null
  const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!audList.includes(aud)) return null
  if (payload.iss !== `https://${teamDomain}`) return null

  const jwk = (await accessCerts(teamDomain)).find((k) => k.kid === header.kid)
  if (!jwk) return null
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  )
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`)
  )
  return ok ? payload : null
}

export async function onRequest({ request, env, next, data }) {
  // Local dev only: `ACCESS_DEV_BYPASS=1` in .dev.vars skips the check — but never
  // in production, because the host check can't match a deployed hostname.
  const host = new URL(request.url).hostname
  if (env.ACCESS_DEV_BYPASS === '1' && (host === 'localhost' || host === '127.0.0.1')) {
    data.accessEmail = 'dev@localhost'
    return next()
  }

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return new Response('Access not configured', { status: 503 })
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  let payload = null
  if (token) {
    try {
      payload = await verifyAccessJwt(token, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD)
    } catch (err) {
      console.error('access jwt verify error:', err)
    }
  }
  if (!payload) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  data.accessEmail = payload.email || ''
  return next()
}
