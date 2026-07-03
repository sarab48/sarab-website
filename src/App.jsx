import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import A11yWidget from './components/A11yWidget.jsx'
import Hero from './sections/Hero.jsx'
import PromiseSection from './sections/Promise.jsx'
import BeforeAfter from './sections/BeforeAfter.jsx'
import Reels from './sections/Reels.jsx'
import Booking from './sections/Booking.jsx'
import { useI18n } from './i18n/I18nProvider.jsx'
import { useLenis } from './lib/useLenis.js'
import { useReveals } from './lib/useReveals.js'

/*
  Phase 4: Lenis smooth scroll + GSAP/ScrollTrigger reveals (RTL-mirrored, re-run on lang
  change) + the WebGL mirage atmosphere & before/after dissolve inside the sections.
*/
export default function App() {
  const { lang } = useI18n()
  useLenis()
  useReveals(lang)

  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <PromiseSection />
        <BeforeAfter />
        <Reels />
        <Booking />
      </main>
      <Footer />
      <A11yWidget />
    </div>
  )
}
