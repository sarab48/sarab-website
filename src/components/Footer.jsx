import { useI18n } from '../i18n/I18nProvider.jsx'
import { SITE } from '../config.js'
import MirageMark from './MirageMark.jsx'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <MirageMark className="site-footer__mark" />
        <span className="site-footer__word">SARAB</span>
        <span className="site-footer__slogan">{t('footer.slogan')}</span>
      </div>
      <div className="site-footer__meta">
        <a className="site-footer__ig" href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer">
          <svg className="site-footer__igicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.4" />
            <circle cx="17.6" cy="6.4" r="1.15" fill="currentColor" stroke="none" />
          </svg>
          <span>@{SITE.instagram}</span>
        </a>
        <a className="site-footer__privacy" href="/privacy.html">{t('footer.privacy')}</a>
        <span className="site-footer__rights">{t('footer.rights')}</span>
      </div>
    </footer>
  )
}
