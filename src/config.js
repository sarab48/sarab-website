// Site-level config. Fill these with the owner before launch (see docs/04-BUILD-PLAN.md).
export const SITE = {
  instagram: 'sarab_ai25',
  instagramUrl: 'https://instagram.com/sarab_ai25',

  // WhatsApp number in international format, digits only, no '+'.
  // Owner-provided local number 054-499-7768 → +972 54 499 7768.
  whatsappNumber: '972544997768',

  // Booking backend — Cloudflare Pages Function (functions/api/book.js): saves to D1
  // and emails the owner. Empty = form runs in demo mode (no network submit).
  formEndpoint: '/api/book',
}

export const whatsappLink = (text) => {
  const n = SITE.whatsappNumber.replace(/\D/g, '')
  if (!n) return SITE.instagramUrl
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${n}${q}`
}
