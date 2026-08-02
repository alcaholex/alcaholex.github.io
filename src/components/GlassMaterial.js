'use client'

import { MeshTransmissionMaterial } from '@react-three/drei'

// One throwaway probe context at first call, cached module-wide — the answer
// is needed before any R3F Canvas exists (its dpr prop depends on it).
let software = null
export function isSoftwareGL() {
  if (typeof document === 'undefined') return false
  if (software !== null) return software
  let renderer = ''
  try {
    const ctx =
      document.createElement('canvas').getContext('webgl2') ||
      document.createElement('canvas').getContext('webgl')
    if (ctx) {
      const ext = ctx.getExtension('WEBGL_debug_renderer_info')
      renderer = String(
        ext ? ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER)
      )
      ctx.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {}
  software = /swiftshader|llvmpipe|softpipe|software/i.test(renderer)
  return software
}

// Transmission redraws the whole scene several times per frame (backside pass
// + refraction buffer) — free on any real GPU, ~1 FPS under software WebGL
// (SwiftShader/llvmpipe). Those visitors get plain tinted glass instead;
// standard rather than physical because every shader branch costs real CPU
// per pixel there.
export default function GlassMaterial() {
  if (isSoftwareGL()) {
    return <meshStandardMaterial transparent opacity={0.55} roughness={0.15} metalness={0} />
  }

  return (
    <MeshTransmissionMaterial
      backside={true}
      distortion={0.2}
      thickness={0.5}
      roughness={0}
      transmission={0.7}
      ior={1.5}
      chromaticAberration={0.05}
      transparent={true}
    />
  )
}
