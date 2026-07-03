import { useI18n } from '../i18n/I18nProvider.jsx'
import SplitText from '../components/SplitText.jsx'

/*
  Promise — the champagne "light" beat. Who SARAB is + the first-of-its-kind flex, then
  the three-step "how it works" lifted from the brand poster (choose / capture / share).
  The steps are an editorial rail: ghost numerals, a connector that draws on scroll.
*/
export default function Promise() {
  const { t } = useI18n()
  const steps = t('promise.steps')
  const list = Array.isArray(steps) ? steps : []

  return (
    <section className="promise" id="about" aria-label={t('promise.kicker')}>
      <div className="promise__head" data-reveal-group>
        <p className="kicker kicker--dark" data-reveal-item>{t('promise.kicker')}</p>
        <SplitText as="h2" className="promise__lead" text={t('promise.line1')} />
        <p className="promise__body" data-reveal-item>{t('promise.line2')}</p>
      </div>

      <ol className="steps" data-reveal-group>
        <span className="steps__line" data-steps-line aria-hidden="true" />
        {list.map((s) => (
          <li className="step" key={s.n} data-reveal-item>
            <span className="step__n" aria-hidden="true">{s.n}</span>
            <span className="step__dot" aria-hidden="true" />
            <h3 className="step__t">{s.t}</h3>
            <p className="step__d">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
