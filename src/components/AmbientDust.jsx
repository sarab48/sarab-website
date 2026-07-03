import { useMemo } from 'react'

/*
  Ambient gold motes drifting in the dark "void" beats (proof / reels / booking) so the whole
  page reads as one continuous mirage world — the same dust that floats in the hero, carried
  through. Pure CSS drift/twinkle (cheap, GPU-friendly), deterministic positions per mount,
  decorative + aria-hidden, and disabled under prefers-reduced-motion (see site.css).
*/
export default function AmbientDust({ count = 14, seed = 1 }) {
  const motes = useMemo(() => {
    let s = seed * 9301 + 49297
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
    return Array.from({ length: count }, () => ({
      left: `${(rnd() * 100).toFixed(2)}%`,
      top: `${(rnd() * 100).toFixed(2)}%`,
      size: `${(2 + rnd() * 3.5).toFixed(2)}px`,
      delay: `${(rnd() * 9).toFixed(2)}s`,
      dur: `${(7 + rnd() * 7).toFixed(2)}s`,
    }))
  }, [count, seed])

  return (
    <div className="ambient" aria-hidden="true">
      {motes.map((m, i) => (
        <i key={i} style={{ left: m.left, top: m.top, '--s': m.size, '--delay': m.delay, '--d': m.dur }} />
      ))}
    </div>
  )
}
