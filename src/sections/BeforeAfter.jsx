import { lazy, Suspense, useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { PAIRS, pairSrc } from '../data/pairs.js'
import { canRender3D, prefersReducedMotion } from '../lib/capability.js'
import CinematicCuts from '../three/CinematicCuts.jsx'
import SplitText from '../components/SplitText.jsx'
import AmbientDust from '../components/AmbientDust.jsx'

gsap.registerPlugin(ScrollTrigger)

// WebGL dissolve is code-split — only fetched when the Mirage mechanic is actually shown.
const MirageReveal = lazy(() => import('../three/MirageReveal.jsx'))

/*
  Proof — the centerpiece. The transformation is SCROLL-DRIVEN: the stage pins (sticky) while
  a tall track scrubs the heat-haze dissolve from dull "before" to glowing "after" as you
  scroll — the site itself performing the magic. Drag still scrubs manually; auto ping-pong
  resumes when the section isn't engaged. Mirage is the reveal on capable devices; WebGL-less
  / reduced-motion devices fall back to the looping Cuts and a normal (un-pinned) stage. The
  rail swaps pairs.
*/
export default function BeforeAfter() {
  const { t, lang } = useI18n()
  const [active, setActive] = useState(0)
  const use3D = canRender3D()

  const pair = PAIRS[active] || PAIRS[0]
  const before = pairSrc(pair.id, 'before')
  const after = pairSrc(pair.id, 'after')
  // Mirage is the reveal on capable devices; CinematicCuts is the automatic fallback below.
  const showMirage = use3D
  const scrollDrive = showMirage && !prefersReducedMotion()

  const driveRef = useRef({ p: 0 })
  const trackRef = useRef(null)

  // Scrub the dissolve to the track's scroll-through while the stage is pinned.
  useEffect(() => {
    if (!scrollDrive) return
    const track = trackRef.current
    if (!track) return
    const st = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => { driveRef.current.p = Math.min(1, self.progress / 0.82) },
    })
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => { cancelAnimationFrame(id); st.kill() }
  }, [scrollDrive, active, lang])

  const stage = (
    <div className="proof__stage" data-reveal="up">
      {showMirage ? (
        <Suspense fallback={<CinematicCuts key={'fb-' + pair.id} beforeSrc={before} afterSrc={after} beforeLabel={t('proof.before')} afterLabel={t('proof.after')} />}>
          <MirageReveal
            key={pair.id}
            beforeSrc={before}
            afterSrc={after}
            beforeLabel={t('proof.before')}
            afterLabel={t('proof.after')}
            hint={t('proof.hint')}
            drive={scrollDrive ? driveRef : undefined}
          />
        </Suspense>
      ) : (
        <CinematicCuts
          key={pair.id}
          beforeSrc={before}
          afterSrc={after}
          beforeLabel={t('proof.before')}
          afterLabel={t('proof.after')}
        />
      )}
    </div>
  )

  // The pair picker. In the scroll-driven (pinned) layout it lives INSIDE the sticky next to
  // the stage — so choosing a style and seeing it open happen in one view, not a screen apart.
  const rail = (
    <ul className="proof__rail" aria-label={t('proof.kicker')}>
      {PAIRS.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            aria-label={`Style ${i + 1}`}
            aria-pressed={i === active}
            className={'proof__thumb' + (i === active ? ' is-active' : '')}
            onClick={() => setActive(i)}
          >
            <img src={pairSrc(p.id, 'after')} alt="" loading="lazy" />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <section className="proof" id="proof" aria-label={t('proof.kicker')}>
      <AmbientDust count={16} seed={3} />
      <header className="proof__head" data-reveal-group>
        <p className="kicker" data-reveal-item>{t('proof.kicker')}</p>
        <SplitText as="h2" className="proof__title" text={t('proof.title')} />
      </header>

      {scrollDrive ? (
        <div className="proof__track" ref={trackRef}>
          <div className="proof__sticky">
            <span className="proof__halo" aria-hidden="true" />
            <div className="proof__lightbox">
              {rail}
              {stage}
            </div>
            <p className="proof__scrollcue" aria-hidden="true">{t('proof.scrollCue')}</p>
          </div>
        </div>
      ) : (
        stage
      )}

      <p className="proof__caption" data-reveal="up">{t('proof.caption')}</p>

      {/* In the pinned layout the picker is co-located with the stage (above); only show it
          here in the normal-flow (cuts / reduced-motion / no-WebGL) layout. */}
      {!scrollDrive && rail}
    </section>
  )
}
