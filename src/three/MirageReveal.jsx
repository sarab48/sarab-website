import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { configureRenderer, loadTexture } from './setup.js'

/*
  The before/after MIRAGE DISSOLVE (the centerpiece wow). A WebGL plane cross-dissolves the
  dull "before" into the glowing "after" through an organic heat-haze: displacement peaks
  mid-transition, an fbm field reveals the after like a mirage resolving, with a warm gold
  glow + chromatic shimmer at the moving front. Auto ping-pongs slowly; drag to scrub.
  Both textures are pre-baked upright 2:3 (see src/data/pairs.js).
*/
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uBefore, uAfter;
uniform float uProgress, uTime;
varying vec2 vUv;

vec2 hash(vec2 p){
  p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(hash(i+vec2(0,0)), f-vec2(0,0)),
                 dot(hash(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(hash(i+vec2(0,1)), f-vec2(0,1)),
                 dot(hash(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=0.5;} return v; }

void main(){
  vec2 uv = vUv;
  float win = sin(clamp(uProgress,0.0,1.0)*3.14159);        // 0 at ends, 1 mid

  float fieldN = clamp(fbm(uv*3.0 + 11.0)*0.5 + 0.5, 0.0, 1.0);
  float edge = 0.16;                                        // softness of the dissolve mask
  float afterMix = smoothstep(fieldN - edge, fieldN + edge, uProgress);
  // NARROW advancing seam: high ONLY right at the dissolve boundary. Any given pixel (a face!)
  // is only inside the seam for the brief instant it crosses — never a sustained warp.
  float front = 1.0 - smoothstep(0.0, 0.11, abs(uProgress - fieldN));

  // Heat-haze: a barely-there ambient air-shimmer everywhere + a gentle ripple confined to the
  // thin seam. Magnitudes kept tiny on purpose — these are real people; faces must NOT twist or
  // squash, even for a frame. The "mirage" now reads through the organic dissolve, the chromatic
  // fringe and the gold glow at the seam, not through geometric distortion of the photo.
  float n1 = fbm(uv*5.0 + vec2(0.0, uTime*0.35));
  float n2 = fbm(uv*9.0 - vec2(uTime*0.25, 0.0));
  vec2 disp = vec2(n1, n2) * (0.004*win + 0.015*front);

  // chromatic shimmer hugging the seam
  float ca = 0.0035 * front;
  vec3 cAfter;
  cAfter.r = texture2D(uAfter, uv + disp + vec2(ca,0.0)).r;
  cAfter.g = texture2D(uAfter, uv + disp).g;
  cAfter.b = texture2D(uAfter, uv + disp - vec2(ca,0.0)).b;

  vec3 cBefore = texture2D(uBefore, uv + disp*0.6).rgb;
  // make the "before" feel ordinary: gently desaturate + cool (kept light so it never looks broken)
  float g = dot(cBefore, vec3(0.299,0.587,0.114));
  cBefore = mix(vec3(g), cBefore, 0.72);
  cBefore *= vec3(0.93, 0.95, 1.0);

  vec3 col = mix(cBefore, cAfter, afterMix);
  // gold bloom riding the dissolve front (a touch stronger to keep the seam gorgeous)
  col += vec3(0.89,0.78,0.47) * front * 0.34 * (0.45 + win);

  gl_FragColor = vec4(col, 1.0);
}
`

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy,0.0,1.0); }`

function autoTarget(time) {
  const P = 7.0
  const ph = (time % P) / P
  if (ph < 0.45) return smooth01(ph / 0.45)
  if (ph < 0.55) return 1
  if (ph < 0.95) return 1 - smooth01((ph - 0.55) / 0.4)
  return 0
}
const smooth01 = (x) => x * x * (3 - 2 * x)

export default function MirageReveal({ beforeSrc, afterSrc, beforeLabel, afterLabel, hint, drive }) {
  const canvasRef = useRef(null)
  const beforeTagRef = useRef(null)
  const afterTagRef = useRef(null)
  const dragRef = useRef({ dragging: false, progress: 0, lastInput: -10 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let renderer
    try {
      renderer = configureRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }))
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    const loader = new THREE.TextureLoader()
    const uniforms = {
      uBefore: { value: loadTexture(loader, beforeSrc) },
      uAfter: { value: loadTexture(loader, afterSrc) },
      uProgress: { value: 0 },
      uTime: { value: 0 },
    }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, depthTest: false }),
    )
    scene.add(mesh)

    const resize = () => {
      const w = canvas.clientWidth || 1
      const h = canvas.clientHeight || 1
      renderer.setSize(w, h, false)
    }
    resize()
    window.addEventListener('resize', resize)

    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.1 })
    io.observe(canvas)

    const start = performance.now()
    let raf
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      const time = (performance.now() - start) / 1000
      const d = dragRef.current
      const recentlyDragged = time - d.lastInput < 2.2
      if (!d.dragging && !recentlyDragged) {
        // scroll-driven when a `drive` ref is supplied (the proof section scrubs it);
        // otherwise fall back to the gentle auto ping-pong.
        const driven = drive?.current
        const tgt = driven ? drive.current.p : autoTarget(time)
        d.progress += (tgt - d.progress) * (driven ? 0.16 : 0.06)
      }
      uniforms.uProgress.value = d.progress
      uniforms.uTime.value = time
      renderer.render(scene, camera)
      if (beforeTagRef.current) beforeTagRef.current.style.opacity = String(1 - smooth01(Math.min(1, d.progress * 1.6)))
      if (afterTagRef.current) afterTagRef.current.style.opacity = String(smooth01(Math.max(0, (d.progress - 0.4) * 1.6)))
    }
    raf = requestAnimationFrame(loop)

    // drag-to-scrub
    const rtl = document.documentElement.getAttribute('dir') === 'rtl'
    const setFromX = (clientX) => {
      const rect = canvas.getBoundingClientRect()
      let p = (clientX - rect.left) / rect.width
      if (rtl) p = 1 - p
      const d = dragRef.current
      d.progress = Math.max(0, Math.min(1, p))
      d.lastInput = (performance.now() - start) / 1000
    }
    const onDown = (e) => { dragRef.current.dragging = true; canvas.setPointerCapture?.(e.pointerId); setFromX(e.clientX) }
    const onMove = (e) => { if (dragRef.current.dragging) setFromX(e.clientX) }
    const onUp = () => { dragRef.current.dragging = false }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      io.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      uniforms.uBefore.value.dispose()
      uniforms.uAfter.value.dispose()
      mesh.geometry.dispose()
      mesh.material.dispose()
      renderer.dispose()
    }
  }, [beforeSrc, afterSrc])

  return (
    <div className="reveal">
      <canvas ref={canvasRef} className="reveal__canvas" />
      <span ref={beforeTagRef} className="reveal__tag reveal__tag--before">{beforeLabel}</span>
      <span ref={afterTagRef} className="reveal__tag reveal__tag--after" style={{ opacity: 0 }}>{afterLabel}</span>
      {hint ? <span className="reveal__hint">{hint}</span> : null}
    </div>
  )
}
