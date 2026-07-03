import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from './capability.js'

gsap.registerPlugin(ScrollTrigger)

/*
  Cinematic scroll reveals. Annotate elements:
    data-reveal="up|left|right"          single element
    data-reveal-group + data-reveal-item staggered children
  Directional reveals MIRROR for RTL. Re-runs when `lang` (and thus dir) changes.
  Under prefers-reduced-motion: no-op (content stays visible).
*/
export function useReveals(lang) {
  useEffect(() => {
    if (prefersReducedMotion()) return

    const rtl = document.documentElement.getAttribute('dir') === 'rtl'
    const sign = rtl ? -1 : 1

    const ctx = gsap.context(() => {
      // Split headings: letters (LTR) / words (RTL) "ignite" gold then settle to their color,
      // rising + un-blurring in a staggered cascade as the heading scrolls into view.
      gsap.utils.toArray('[data-splitroot]').forEach((root) => {
        const units = root.querySelectorAll('.split-char, .split-word')
        if (!units.length) return
        const endColor = getComputedStyle(root).color
        gsap.fromTo(
          units,
          { opacity: 0, yPercent: 55, filter: 'blur(5px)', color: '#e3c878' },
          {
            opacity: 1, yPercent: 0, filter: 'blur(0px)', color: endColor,
            duration: 0.9, ease: 'power3.out',
            stagger: { each: rtl ? 0.05 : 0.026 },
            scrollTrigger: { trigger: root, start: 'top 85%', once: true },
          },
        )
      })

      // the promise step-rail connector draws across as it enters
      gsap.utils.toArray('[data-steps-line]').forEach((line) => {
        gsap.fromTo(
          line,
          { scaleX: 0 },
          {
            scaleX: 1, transformOrigin: rtl ? 'right center' : 'left center', duration: 1.3, ease: 'power2.out',
            scrollTrigger: { trigger: line, start: 'top 82%', once: true },
          },
        )
      })

      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        const kind = el.getAttribute('data-reveal') || 'up'
        const from = { opacity: 0 }
        if (kind === 'up') from.y = 44
        else if (kind === 'left') from.x = -64 * sign
        else if (kind === 'right') from.x = 64 * sign
        gsap.fromTo(el, from, {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 84%', once: true },
        })
      })

      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        const items = group.querySelectorAll('[data-reveal-item]')
        gsap.fromTo(
          items,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: { trigger: group, start: 'top 80%', once: true },
          },
        )
      })
    })

    // ensure positions are correct once fonts/images settle
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => {
      cancelAnimationFrame(id)
      ctx.revert()
    }
  }, [lang])
}
