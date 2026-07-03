/*
  Alternative before/after mechanic: a single stage that holds the dull "before", then
  CUTS to the glowing "after" with a gold shimmer sweep, on a loop. Pure CSS timing → works
  on every device and is the graceful fallback when WebGL is unavailable. Under
  prefers-reduced-motion it simply shows the "after" (the result), no flashing.
*/
export default function CinematicCuts({ beforeSrc, afterSrc, beforeLabel, afterLabel }) {
  return (
    <div className="cuts">
      <img className="cuts__img cuts__before" src={beforeSrc} alt="" loading="lazy" />
      <img className="cuts__img cuts__after" src={afterSrc} alt="A SARAB studio-quality portrait" loading="lazy" />
      <span className="cuts__sweep" aria-hidden="true" />
      <span className="cuts__tag cuts__tag--before">{beforeLabel}</span>
      <span className="cuts__tag cuts__tag--after">{afterLabel}</span>
    </div>
  )
}
