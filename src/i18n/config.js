// Trilingual config. Order here = order in the language switcher.
// `dir` drives document direction + RTL mirroring of layout and directional motion.
export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', dir: 'ltr' },
  { code: 'ar', label: 'ع',  name: 'العربية', dir: 'rtl' },
  { code: 'he', label: 'עב', name: 'עברית',  dir: 'rtl' },
]

export const DEFAULT_LANG = 'en'
export const STORAGE_KEY = 'sarab.lang'

export const LANG_DIR = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.dir]))
export const isRTL = (code) => LANG_DIR[code] === 'rtl'
