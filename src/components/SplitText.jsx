import { useMemo } from 'react'
import { useI18n } from '../i18n/I18nProvider.jsx'

/*
  Cinematic heading that splits into animatable units for the "letters ignite, then settle"
  reveal (driven by useReveals via the `data-splitroot` hook). Critically i18n-safe:
    • Latin (LTR) → per-CHARACTER units, for the shimmer letter cascade.
    • Arabic / Hebrew (RTL) → per-WORD units only — splitting Arabic into characters would
      break cursive joining/ligatures, so words stay whole and reveal as blocks.
  React owns the spans (rebuilt only when text/direction changes, which also re-runs the
  reveal), and the full string is exposed via aria-label with the pieces aria-hidden.
*/
function buildUnits(text, mode) {
  const parts = String(text).split(/(\s+)/) // keep the whitespace tokens
  return parts.map((part, i) => {
    if (part === '' ) return null
    if (/^\s+$/.test(part)) return part // raw whitespace as a text node (lets lines wrap)
    if (mode === 'char') {
      return (
        <span className="split-word" key={i}>
          {[...part].map((ch, j) => (
            <span className="split-char" key={j}>{ch}</span>
          ))}
        </span>
      )
    }
    return <span className="split-word" key={i}>{part}</span>
  })
}

export default function SplitText({ as: Tag = 'span', text, className, ...rest }) {
  const { rtl } = useI18n()
  const units = useMemo(() => buildUnits(text, rtl ? 'word' : 'char'), [text, rtl])
  return (
    <Tag className={className} data-splitroot aria-label={text} {...rest}>
      <span aria-hidden="true">{units}</span>
    </Tag>
  )
}
