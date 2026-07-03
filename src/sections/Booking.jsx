import { useState } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SITE, whatsappLink } from '../config.js'
import SplitText from '../components/SplitText.jsx'
import AmbientDust from '../components/AmbientDust.jsx'
import { useMagnetic } from '../lib/useMagnetic.js'
import { attribution, hit } from '../lib/analytics.js'

/*
  Invitation — the booking moment, framed like a gold invitation card. WhatsApp deep-link +
  a native lead form. Magnetic CTAs; a gold-dust burst celebrates a successful submit. Form
  posts to SITE.formEndpoint when set; otherwise runs in demo mode (no network). WhatsApp
  number + endpoint are owner TODOs in src/config.js.
*/
export default function Booking() {
  const { t } = useI18n()
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const submitRef = useMagnetic(0.3)
  const waRef = useMagnetic(0.3)

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    data.lang = document.documentElement.lang || ''
    data.attr = attribution() // utm/fbclid/referrer → auto lead-source on the backend
    try {
      if (SITE.formEndpoint) {
        const res = await fetch(SITE.formEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(`submit failed: ${res.status}`)
      } else {
        await new Promise((r) => setTimeout(r, 600)) // demo mode
      }
      hit('submit')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const waText = t('booking.title')

  return (
    <section className="booking" id="book" aria-label={t('booking.kicker')}>
      <AmbientDust count={14} seed={11} />
      <div className="booking__inner">
        <header className="booking__head" data-reveal-group>
          <p className="kicker" data-reveal-item>{t('booking.kicker')}</p>
          <SplitText as="h2" className="booking__title" text={t('booking.title')} />
          <p className="booking__body" data-reveal-item>{t('booking.body')}</p>
        </header>

        <div className="booking__card" data-reveal="up">
          <span className="booking__corner booking__corner--tl" aria-hidden="true" />
          <span className="booking__corner booking__corner--tr" aria-hidden="true" />
          <span className="booking__corner booking__corner--bl" aria-hidden="true" />
          <span className="booking__corner booking__corner--br" aria-hidden="true" />

        {status === 'success' ? (
          <p className="booking__success" role="status">
            <span className="booking__burst" aria-hidden="true">
              {Array.from({ length: 14 }).map((_, i) => <i key={i} style={{ '--i': i }} />)}
            </span>
            {t('booking.form.success')}
          </p>
        ) : (
          <form className="booking__form" onSubmit={onSubmit}>
            {/* Honeypot — humans never see it; the backend drops submissions that fill it. */}
            <label className="field" style={{ display: 'none' }} aria-hidden="true">
              <span className="field__label">Company</span>
              <input className="field__input" name="company" type="text" tabIndex={-1} autoComplete="off" />
            </label>
            <label className="field">
              <span className="field__label">{t('booking.form.name')}</span>
              <input className="field__input" name="name" type="text" autoComplete="name" required />
            </label>
            <label className="field">
              <span className="field__label">{t('booking.form.date')}</span>
              <input className="field__input" name="date" type="date" required />
            </label>
            <label className="field">
              <span className="field__label">{t('booking.form.occasion')}</span>
              <input className="field__input" name="occasion" type="text" />
            </label>
            <label className="field">
              <span className="field__label">{t('booking.form.location')}</span>
              <input className="field__input" name="location" type="text" autoComplete="off" />
            </label>
            <label className="field">
              <span className="field__label">{t('booking.form.phone')}</span>
              <input className="field__input" name="phone" type="tel" inputMode="tel" required />
            </label>
            {status === 'error' && (
              <p className="booking__error" role="alert">{t('booking.form.error')}</p>
            )}
            <button ref={submitRef} className="btn btn--gold booking__submit" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? t('booking.form.sending') : t('booking.form.submit')}
            </button>
          </form>
        )}

        <div className="booking__or">
          <span>{t('booking.form.or')}</span>
        </div>

        <a
          ref={waRef}
          className="btn btn--ghost booking__whatsapp"
          href={whatsappLink(waText)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('booking.whatsapp')}
        </a>
        </div>
      </div>
    </section>
  )
}
