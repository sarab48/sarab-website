import { LANGUAGES } from '../i18n/config.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

// Minimal, accessible switcher. Visual styling is provisional (locks at Phase 2).
export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  return (
    <nav className="lang-switcher" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          className={'lang-switcher__btn' + (l.code === lang ? ' is-active' : '')}
          aria-pressed={l.code === lang}
          lang={l.code}
          onClick={() => setLang(l.code)}
          title={l.name}
        >
          {l.label}
        </button>
      ))}
    </nav>
  )
}
