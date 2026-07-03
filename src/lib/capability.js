// Capability gating so the 3D / heavy motion only runs where it can hold framerate.
// A stutter breaks the spell — better to fall back to the CSS atmosphere.
let cached

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  // Manual override from the accessibility widget (persisted; applied via reload).
  try {
    if (JSON.parse(localStorage.getItem('sarab-a11y') || '{}').motionOff) return true
  } catch { /* storage blocked — fall through */ }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export function canRender3D() {
  if (cached !== undefined) return cached
  if (typeof window === 'undefined') return (cached = false)

  const reduce = prefersReducedMotion()
  const saveData = navigator.connection?.saveData === true
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2
  const lowCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2

  let webgl = false
  try {
    const c = document.createElement('canvas')
    webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    webgl = false
  }

  return (cached = webgl && !reduce && !saveData && !lowMem && !lowCores)
}
