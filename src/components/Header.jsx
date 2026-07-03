import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import MirageMark from './MirageMark.jsx'

export default function Header() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const progressRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24)
      const max = document.documentElement.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${p.toFixed(4)})`
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <header className={'site-header' + (scrolled ? ' is-scrolled' : '')}>
      <span ref={progressRef} className="site-header__progress" aria-hidden="true" />
      <a className="site-header__brand" href="#top" aria-label="SARAB">
        <MirageMark className="site-header__mark" />
        <span className="site-header__word">SARAB</span>
      </a>

      <div className="site-header__right">
        <LanguageSwitcher />
        <a className="btn btn--gold btn--sm site-header__book" href="#book">
          {t('nav.book')}
        </a>
      </div>
    </header>
  )
}
