/*
  The SARAB mirage mark — two wavy strokes (heat-shimmer / the brand motif), as inline SVG
  so it scales crisply and takes the gold from `currentColor`. Reused in header, hero, footer.
*/
export default function MirageMark({ className, title = 'SARAB' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 48"
      role="img"
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path d="M10 20 C 34 8, 58 8, 74 18 C 86 25, 100 26, 112 20" strokeWidth="4" />
      <path d="M22 33 C 42 25, 60 26, 74 32 C 84 36, 94 36, 104 32" strokeWidth="3" opacity="0.62" />
    </svg>
  )
}
