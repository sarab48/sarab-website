import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

/*
  نگישות / accessibility widget (Israeli-market expectation, IS 5568 spirit):
  font size, high contrast, stop motion. Settings persist in localStorage;
  "stop motion" reloads so the capability gate (src/lib/capability.js) re-evaluates
  and the whole experience starts in its calm variant.
*/
const KEY = 'sarab-a11y'
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }

export function applyA11y() {
  const s = read()
  document.documentElement.style.fontSize = s.font && s.font !== 100 ? `${s.font}%` : ''
  document.documentElement.classList.toggle('a11y-contrast', !!s.contrast)
}

export default function A11yWidget() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [, force] = useState(0)
  useEffect(() => { applyA11y() }, [])

  const set = (patch) => {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), ...patch }))
    applyA11y()
    force((x) => x + 1)
  }
  const s = read()
  const font = s.font || 100

  return (
    <div className={'a11y' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="a11y__btn"
        aria-expanded={open}
        aria-label={t('a11y.title')}
        title={t('a11y.title')}
        onClick={() => setOpen(!open)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 7h-6v11a1 1 0 1 1-2 0v-5h-2v5a1 1 0 1 1-2 0V9H3a1 1 0 1 1 0-2h18a1 1 0 1 1 0 2z" />
        </svg>
      </button>
      {open && (
        <div className="a11y__panel" role="dialog" aria-label={t('a11y.title')}>
          <b>{t('a11y.title')}</b>
          <div className="a11y__row">
            <span>{t('a11y.font')} ({font}%)</span>
            <span className="a11y__steps">
              <button type="button" onClick={() => set({ font: Math.max(87.5, font - 12.5) })} aria-label="−">−</button>
              <button type="button" onClick={() => set({ font: Math.min(150, font + 12.5) })} aria-label="+">+</button>
            </span>
          </div>
          <label className="a11y__row">
            <span>{t('a11y.contrast')}</span>
            <input type="checkbox" checked={!!s.contrast} onChange={(e) => set({ contrast: e.target.checked })} />
          </label>
          <label className="a11y__row">
            <span>{t('a11y.motion')}</span>
            <input
              type="checkbox"
              checked={!!s.motionOff}
              onChange={(e) => { set({ motionOff: e.target.checked }); location.reload() }}
            />
          </label>
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">{t('a11y.statement')}</a>
        </div>
      )}
    </div>
  )
}
