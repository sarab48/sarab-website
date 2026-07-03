import en from './locales/en.js'
import ar from './locales/ar.js'
import he from './locales/he.js'

export const STRINGS = { en, ar, he }

// Nested key lookup: t('hero.sub'). Falls back to English, then the key itself.
export function resolve(dict, fallback, key) {
  const get = (obj) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
  const val = get(dict)
  if (val != null) return val
  const fb = get(fallback)
  return fb != null ? fb : key
}
