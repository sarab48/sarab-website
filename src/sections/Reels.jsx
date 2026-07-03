import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { REELS } from '../data/reels.js'
import SplitText from '../components/SplitText.jsx'
import AmbientDust from '../components/AmbientDust.jsx'
import { prefersReducedMotion } from '../lib/capability.js'
import { hit } from '../lib/analytics.js'

/*
  Energy — the reels as floating "kiosk screens" in a coverflow: each tilts toward the
  center of the viewport with depth + scale, so the rail reads as a 3D carousel of live
  moments. Muted — the shipped files carry no audio track, per the owner — looping,
  autoplay-on-view (IntersectionObserver), poster-framed, lazy, drag-to-scroll.
*/
function Reel({ reel, label, imageAlt }) {
  const ref = useRef(null)
  const isImage = reel.type === 'image'

  useEffect(() => {
    if (isImage) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { el.play?.().catch(() => {}); if (!el.dataset.counted) { el.dataset.counted = '1'; hit('reel') } }
        else el.pause?.()
      },
      { threshold: 0.5 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [isImage])

  // Still booth-setup card: same 9:16 frame + glare, no live badge.
  if (isImage) {
    return (
      <figure className="reel">
        <div className="reel__screen">
          <img className="reel__video" src={reel.image} alt={imageAlt} loading="lazy" />
          <span className="reel__glare" aria-hidden="true" />
        </div>
      </figure>
    )
  }

  return (
    <figure className="reel">
      <div className="reel__screen">
        <video
          ref={ref}
          className="reel__video"
          src={reel.src}
          poster={reel.poster}
          muted
          loop
          playsInline
          preload="none"
        />
        <span className="reel__live" aria-hidden="true"><i />{label}</span>
        <span className="reel__glare" aria-hidden="true" />
      </div>
    </figure>
  )
}

export default function Reels() {
  const { t } = useI18n()
  const railRef = useRef(null)

  // Coverflow tilt: map each card's distance from viewport center → rotateY + depth + scale.
  useEffect(() => {
    const rail = railRef.current
    if (!rail || prefersReducedMotion()) return
    const reels = () => Array.from(rail.querySelectorAll('.reel'))
    let raf = 0
    let running = false
    const frame = () => {
      const mid = window.innerWidth / 2
      for (const el of reels()) {
        const r = el.getBoundingClientRect()
        const d = Math.max(-1.4, Math.min(1.4, (r.left + r.width / 2 - mid) / mid))
        el.style.setProperty('--ry', `${(-d * 20).toFixed(2)}deg`)
        el.style.setProperty('--tz', `${(-Math.abs(d) * 70).toFixed(1)}px`)
        el.style.setProperty('--sc', `${(1 - Math.min(0.16, Math.abs(d) * 0.2)).toFixed(3)}`)
        el.style.setProperty('--op', `${(1 - Math.min(0.5, Math.abs(d) * 0.46)).toFixed(3)}`)
      }
      raf = running ? requestAnimationFrame(frame) : 0
    }
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting
      if (running && !raf) raf = requestAnimationFrame(frame)
    }, { threshold: 0 })
    io.observe(rail)
    const onScroll = () => { if (running && !raf) raf = requestAnimationFrame(frame) }
    window.addEventListener('scroll', onScroll, { passive: true })

    // drag-to-scroll
    let down = false, sx = 0, sl = 0, moved = false
    const onDown = (e) => { down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-grabbing') }
    const onMove = (e) => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; rail.scrollLeft = sl - dx }
    const onUp = () => { down = false; rail.classList.remove('is-grabbing') }
    const onClick = (e) => { if (moved) { e.preventDefault(); e.stopPropagation() } }
    rail.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    rail.addEventListener('click', onClick, true)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      rail.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      rail.removeEventListener('click', onClick, true)
    }
  }, [])

  return (
    <section className="reels" id="reels" aria-label={t('reels.kicker')}>
      <AmbientDust count={14} seed={7} />
      <header className="reels__head" data-reveal-group>
        <p className="kicker" data-reveal-item>{t('reels.kicker')}</p>
        <SplitText as="h2" className="reels__title" text={t('reels.title')} />
        <p className="reels__body" data-reveal-item>{t('reels.body')}</p>
      </header>

      <div className="reels__rail" ref={railRef}>
        {REELS.map((r) => (
          <Reel key={r.id} reel={r} label={t('reels.live')} imageAlt={t('reels.boothAlt')} />
        ))}
      </div>
    </section>
  )
}
