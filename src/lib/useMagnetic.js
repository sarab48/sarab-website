import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from './capability.js'

/*
  Magnetic pull — the element eases toward the pointer while hovered, snapping back on leave.
  Returns a ref to attach. No-op under prefers-reduced-motion. Restores transform on cleanup
  so CSS :hover transitions take back over.
*/
export function useMagnetic(strength = 0.35, max = 14) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return
    const clamp = (v) => Math.max(-max, Math.min(max, v))
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = clamp((e.clientX - (r.left + r.width / 2)) * strength)
      const y = clamp((e.clientY - (r.top + r.height / 2)) * strength)
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
    }
    const reset = () => { el.style.transform = '' }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', reset)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', reset)
      reset()
    }
  }, [strength, max])
  return ref
}
