import * as THREE from 'three'

/*
  Render photos at their TRUE colors. Our scenes draw textured photo planes and custom-shader
  output straight to the framebuffer; with color management on, three linearizes textures on
  sample but does NOT re-encode raw ShaderMaterial / basic output → photos come out dark and
  crushed. Disabling color management makes it a faithful passthrough (what you see in the JPG
  is what renders). Import this module before creating any renderer.
*/
THREE.ColorManagement.enabled = false

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace // no extra transform
  return renderer
}

export function loadTexture(loader, url, onLoad, onError) {
  const t = loader.load(url, onLoad, undefined, onError)
  t.colorSpace = THREE.NoColorSpace
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.magFilter = THREE.LinearFilter
  t.generateMipmaps = true
  t.anisotropy = 4
  return t
}
