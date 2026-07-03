/*
  Featured reels (the "energy" beat). Self-hosted MP4s in public/assets/reels/ with
  poster frames in public/assets/reels/posters/, plus a still booth-setup photo.
  Shipped files are re-encoded muted (no audio track) and under Pages' 25 MiB
  per-file limit; source originals live in media-originals/ (never deployed).
*/
const dir = '/assets/reels'

const VIDEOS = [
  { id: 'reel-1', file: 'printed-1.mp4' },
  { id: 'reel-2', file: 'printed-2.mp4' },
  { id: 'reel-3', file: 'lv_0_20260522135817.mp4' },
].map((r) => ({
  ...r,
  type: 'video',
  src: `${dir}/${encodeURIComponent(r.file)}`,
  poster: `${dir}/posters/${r.id}.jpg`,
}))

// A still "kiosk screen" of the booth set up in the room — rendered as an <img> (no
// sound / autoplay), framed to the same 9:16 as the video reels. Leads the rail as the
// establishing shot before the action clips.
export const REELS = [
  { id: 'booth-setup', type: 'image', image: `${dir}/booth-setup.jpg` },
  ...VIDEOS,
]
