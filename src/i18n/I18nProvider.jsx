import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, LANG_DIR, STORAGE_KEY, isRTL } from './config.js'
import { STRINGS, resolve } from './index.js'

const I18nContext = createContext(null)

function readInitialLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved && LANG_DIR[saved]) return saved
  const nav = (window.navigator.language || '').slice(0, 2)
  return LANG_DIR[nav] ? nav : DEFAULT_LANG
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(readInitialLang)

  // Reflect language + direction on <html>, so CSS (incl. RTL mirroring) keys off it.
  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('lang', lang)
    el.setAttribute('dir', LANG_DIR[lang] || 'ltr')
    window.localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  const t = useMemo(() => {
    const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG]
    const fallback = STRINGS[DEFAULT_LANG]
    return (key) => resolve(dict, fallback, key)
  }, [lang])

  const value = useMemo(
    () => ({ lang, setLang, t, dir: LANG_DIR[lang] || 'ltr', rtl: isRTL(lang) }),
    [lang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>')
  return ctx
}
