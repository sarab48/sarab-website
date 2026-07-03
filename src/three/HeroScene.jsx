import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { configureRenderer, loadTexture } from './setup.js'
import { GALLERY_AFTERS } from '../data/gallery.js'

/*
  THE COVER — a "mirage gallery": the real after-portraits materialize out of a flowing
  liquid-gold silk backdrop and drift in 3D space around the SARAB wordmark. Depth fog,
  gold-rim frames + bloom for that premium glow, floating dust motes, pointer parallax,
  and a scroll dolly that flies you a touch deeper as you begin to scroll.
  Capability-gated by the caller; disposes everything on unmount.
*/

// Procedural "mirage gallery" lanes — each lane is a fixed (x,y) channel through which
// portraits travel in depth: they bloom up front, sink into the fog, and recycle (see the
// render loop). Lanes are spread by the golden angle on an elliptical annulus whose inner
// cutoff keeps the central wordmark corridor clear at every depth. Seeded → stable composition.
const GOLDEN = Math.PI * (3 - Math.sqrt(5)) // ~137.5° — pleasing even angular spread

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildLanes(seed = 7, count = 44) {
  const rnd = mulberry32(seed)
  const jit = (a) => (rnd() - 0.5) * 2 * a
  const RX = 6.9, RY = 4.4, INNER = 0.4 // ellipse radii + inner corridor cutoff
  const out = []
  for (let i = 0; i < count; i++) {
    const a = i * GOLDEN + jit(0.3)
    const rad = INNER + (1 - INNER) * Math.sqrt(rnd()) // sqrt → even area, biased outward
    let x = Math.cos(a) * RX * rad
    let y = Math.sin(a) * RY * rad
    // hard-clear the central wordmark corridor (cards pass through here when up close)
    if (Math.abs(x) < 2.7 && Math.abs(y) < 2.1) x = Math.sign(x || rnd() - 0.5) * (2.7 + rnd() * 0.9)
    out.push({
      x: +x.toFixed(2),
      y: +y.toFixed(2),
      s: +(0.8 + rnd() * 0.55).toFixed(2),
      phase: +(rnd() * Math.PI * 2).toFixed(2),
      ax: +(0.08 + rnd() * 0.12).toFixed(3), // lateral drift amplitude
      ay: +(0.1 + rnd() * 0.12).toFixed(3),
      sp: +(0.8 + rnd() * 0.5).toFixed(3), // per-card drift speed
      vz: +(0.22 + rnd() * 0.3).toFixed(3), // depth-sink speed (units/sec)
    })
  }
  return out
}

const LANES = buildLanes()

const MIRAGE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime; varying vec2 vUv;
vec2 hash(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(dot(hash(i),f),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<5;i++){v+=a*noise(p);p*=2.03;a*=.5;} return v; }
void main(){
  vec2 uv=vUv; vec2 p=uv*3.0; float t=uTime*0.045;
  vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)+t*.6),fbm(p+3.*q+vec2(8.3,2.8)-t*.5));
  float f=fbm(p+2.4*r);
  float ribbon=pow(.5+.5*sin((uv.y*5.+f*3.2+r.x*2.+uTime*.12)*3.14159),2.4);
  vec3 deep=vec3(.035,.028,.018), esp=vec3(.072,.058,.039), gold=vec3(.79,.635,.305), hi=vec3(.92,.8,.5);
  vec3 c=mix(deep,esp,smoothstep(0.,1.,f*.6+.4));
  c=mix(c,gold,ribbon*.14*smoothstep(.2,.9,f));
  c+=hi*pow(ribbon,3.)*.05;
  c*=1.-.55*pow(length(uv-.5)*1.25,2.0);
  gl_FragColor=vec4(c,1.0);
}`
const MIRAGE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`

const easeOut = (x) => 1 - Math.pow(1 - x, 3)

export default function HeroScene() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let renderer
    try {
      renderer = configureRenderer(new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }))
    } catch {
      return
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6)
    renderer.setPixelRatio(dpr)

    const scene = new THREE.Scene()
    const fogColor = new THREE.Color(0x0d0a06)
    scene.fog = new THREE.Fog(fogColor, 5, 17)
    scene.background = fogColor

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 60)
    camera.position.set(0, 0, 5)

    // —— mirage backdrop ——
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 44),
      new THREE.ShaderMaterial({ vertexShader: MIRAGE_VERT, fragmentShader: MIRAGE_FRAG, uniforms: { uTime: { value: 0 } }, fog: false, depthWrite: false }),
    )
    backdrop.position.z = -17
    scene.add(backdrop)

    // —— floating portrait cards (photo + gold frame) ——
    // Geometry is shared across every card; per-card transform + material differ. The field is
    // ALIVE: each card sinks into the deep, dissolves into fog, then re-blooms up front carrying
    // a fresh portrait — so the gallery endlessly cycles every image in GALLERY_AFTERS.
    const loader = new THREE.TextureLoader()
    const CARD_H = 2.25
    const CARD_W = CARD_H * (2 / 3)
    const frameGeo = new THREE.PlaneGeometry(CARD_W * 1.06, CARD_H * 1.06)
    const photoGeo = new THREE.PlaneGeometry(CARD_W, CARD_H)

    const Z_NEAR = -3.2 // cards bloom into view around here…
    const Z_FAR = -18.5 // …sink to here, fully fogged, then recycle to the front
    const SPAN = Z_NEAR - Z_FAR
    const N = GALLERY_AFTERS.length

    // A shuffled cycle of image indices so re-blooms march evenly through the whole pool
    // (no image repeats until all N have surfaced).
    const order = [...Array(N).keys()]
    for (let i = N - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]] }
    let imgPtr = 0
    const nextImg = () => order[imgPtr++ % N]

    const cards = LANES.map((lane) => {
      const group = new THREE.Group()
      group.scale.setScalar(lane.s)
      const frameMat = new THREE.MeshBasicMaterial({ color: 0xc9a24e, fog: true, transparent: true, opacity: 0 })
      const frame = new THREE.Mesh(frameGeo, frameMat)
      frame.position.z = -0.01
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true, transparent: true, opacity: 0 })
      group.add(frame, new THREE.Mesh(photoGeo, mat))
      scene.add(group)
      return {
        ...lane, group, mat, frame: frameMat,
        z: Z_NEAR - Math.random() * SPAN, // spread across the whole depth path at start
        age: Math.random() * 3, // …with desynced ages so fades never pulse together
        imgIndex: nextImg(),
      }
    })

    // Concurrency-capped, de-duped streaming loader → pool[index]. The render loop binds each
    // card to pool[card.imgIndex] once it's ready, so portraits *materialize* a few at a time
    // (no decode spike) and texture swaps on recycle are free (already resident).
    const pool = new Array(N).fill(null)
    const textures = []
    let cursor = 0
    let inFlight = 0
    let disposed = false
    const CONCURRENCY = 6
    const pump = () => {
      while (!disposed && inFlight < CONCURRENCY && cursor < N) {
        const idx = cursor++
        inFlight++
        const done = () => { inFlight--; if (!disposed) pump() }
        const tex = loadTexture(loader, GALLERY_AFTERS[idx], () => { if (!disposed) pool[idx] = tex; done() }, done)
        textures.push(tex)
      }
    }
    pump()

    // —— gold dust motes ——
    const DUST = 340
    const dustGeo = new THREE.BufferGeometry()
    const dpos = new Float32Array(DUST * 3)
    for (let i = 0; i < DUST; i++) {
      dpos[i * 3] = (Math.random() - 0.5) * 20
      dpos[i * 3 + 1] = (Math.random() - 0.5) * 12
      dpos[i * 3 + 2] = -Math.random() * 17
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3))
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      color: 0xe3c878, size: 0.035, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
    }))
    scene.add(dust)

    // —— bloom ——
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.72)
    composer.addPass(bloom)

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth
      const h = canvas.clientHeight || window.innerHeight
      renderer.setSize(w, h, false)
      composer.setSize(w, h)
      bloom.setSize(w * dpr, h * dpr)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    // pointer parallax + scroll dolly
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointer)
    let scrollP = 0
    const onScroll = () => {
      const hero = canvas.closest('.hero')
      const h = hero ? hero.offsetHeight : window.innerHeight
      scrollP = Math.min(1, Math.max(0, window.scrollY / h))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(canvas)

    const start = performance.now()
    let raf
    let lastT = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      const time = (performance.now() - start) / 1000
      const dt = Math.min(0.05, time - lastT) // clamp so a backgrounded tab doesn't lurch
      lastT = time
      const intro = easeOut(Math.min(1, time / 1.6)) // gentle whole-field fade-in at load
      backdrop.material.uniforms.uTime.value = time

      pointer.x += (pointer.tx - pointer.x) * 0.04
      pointer.y += (pointer.ty - pointer.y) * 0.04
      camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.05
      camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.05
      camera.position.z = 5 - scrollP * 5.0 // lean into the field as you start scrolling
      camera.lookAt(0, 0, -3)

      // scrolling accelerates the whole field into the deep → a "fly-through the gallery" dive
      const flow = 1 + scrollP * 2.6
      cards.forEach((c) => {
        c.z -= c.vz * dt * flow // sink into the deep
        c.age += dt
        if (c.z <= Z_FAR) {
          // dissolved into the fog → re-bloom up front with the next portrait in the cycle
          c.z = Z_NEAR - Math.random() * 1.4
          c.age = 0
          c.phase = Math.random() * Math.PI * 2
          c.imgIndex = nextImg()
        }
        const tex = pool[c.imgIndex]
        if (tex && c.mat.map !== tex) { c.mat.map = tex; c.mat.needsUpdate = true }

        const g = c.group
        g.position.x = c.x + Math.cos(time * 0.32 * c.sp + c.phase) * c.ax
        g.position.y = c.y + Math.sin(time * 0.42 * c.sp + c.phase) * c.ay
        g.position.z = c.z
        g.rotation.z = Math.sin(time * 0.3 * c.sp + c.phase) * 0.04
        g.rotation.y = Math.sin(time * 0.22 * c.sp + c.phase) * 0.06

        const lifeIn = Math.min(1, c.age / 1.4) // ease up as it blooms
        const farFade = THREE.MathUtils.smoothstep(c.z, Z_FAR, Z_FAR + 4) // dissolve into fog
        const target = (tex ? 1 : 0) * lifeIn * farFade * intro
        c.mat.opacity += (target - c.mat.opacity) * 0.1
        c.frame.opacity += (target * 0.9 - c.frame.opacity) * 0.1
      })
      dust.rotation.y = time * 0.01
      dust.material.opacity = 0.5 * intro

      composer.render()
    }
    raf = requestAnimationFrame(loop)

    return () => {
      disposed = true // abort any in-flight texture loads
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
      composer.dispose()
      bloom.dispose()
      backdrop.geometry.dispose()
      backdrop.material.dispose()
      dustGeo.dispose()
      dust.material.dispose()
      // materials are per-card; geometry + textures are shared → dispose those once.
      cards.forEach((c) => c.group.children.forEach((m) => m.material.dispose()))
      frameGeo.dispose()
      photoGeo.dispose()
      textures.forEach((t) => t.dispose())
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-scene" aria-hidden="true" />
}
