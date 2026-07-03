import { lazy, Suspense } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { canRender3D } from '../lib/capability.js'

// Three.js is code-split: the mirage-gallery chunk loads only on devices that pass the gate.
const HeroScene = lazy(() => import('../three/HeroScene.jsx'))

/*
  Hook — the cover. On capable devices: a WebGL "mirage gallery" of the real after-portraits
  drifting in 3D behind the wordmark. Otherwise: the CSS mirage atmosphere fallback. The
  headline runs a staggered GSAP entrance.
*/
export default function Hero() {
  const { t } = useI18n()
  const use3D = canRender3D()

  return (
    <section className="hero" id="top" aria-label={t('hero.title')}>
      <div className="hero__atmos" aria-hidden="true">
        {use3D ? (
          <Suspense fallback={null}>
            <HeroScene />
          </Suspense>
        ) : (
          <>
            <span className="mirage mirage--1" />
            <span className="mirage mirage--2" />
            <span className="hero__glow" />
          </>
        )}
        <span className="hero__scrim" />
        <span className="grain" />
      </div>

      <div className="hero__content" data-reveal-group>
        <p className="eyebrow" data-reveal-item>{t('hero.eyebrow')}</p>
        <h1 className="hero__word" data-reveal-item>{t('hero.title')}</h1>
        <p className="hero__tagline" data-reveal-item>{t('meta.tagline')}</p>
        <p className="hero__slogan" data-reveal-item>{t('meta.slogan')}</p>
        <p className="hero__sub" data-reveal-item>{t('hero.sub')}</p>
      </div>

      <a className="hero__scroll" href="#about" aria-hidden="true" tabIndex={-1}>
        <span>{t('hero.scroll')}</span>
        <span className="hero__scroll-line" />
      </a>
    </section>
  )
}
