'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { MeshTransmissionMaterial, PerformanceMonitor } from '@react-three/drei'
import { BufferAttribute, SRGBColorSpace, TextureLoader, Vector3 } from 'three'

// ---------------------------------------------------------------------------
// Shared render-quality store for the three glass canvases. Degraded is true
// when WebGL is software-rendered (knowable up front from the renderer
// string) OR when a real-but-weak GPU proves it at runtime (GlassPerfGuard).
// One canvas degrading degrades them all — a GPU that can't run one
// transmission pass can't run the others either.

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

let degraded = null
const listeners = new Set()

function resolveDegraded() {
  if (degraded === null) {
    // sessionStorage, not localStorage: a repeat visit in this tab skips the
    // slow probe period, but one unlucky measurement can't brand a good
    // machine forever.
    let sticky = false
    try {
      sticky = sessionStorage.getItem('glass-degraded') === '1'
    } catch {}
    degraded = isSoftwareGL() || sticky
  }
  return degraded
}

export function degrade() {
  if (resolveDegraded()) return
  degraded = true
  try {
    sessionStorage.setItem('glass-degraded', '1')
  } catch {}
  listeners.forEach((notify) => notify())
}

export function useDegraded() {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify)
      return () => listeners.delete(notify)
    },
    resolveDegraded,
    () => false
  )
}

// Mounted inside each canvas. Arms only after the LoadingGate closes (plus a
// settle delay covering the gate's ~700ms exit fade): model parsing and
// shader warmup tank the frame rate on every machine, and the gate is hiding
// the scene then anyway — only steady-state frames may vote to degrade.
export function GlassPerfGuard({ settleMs = 750 }) {
  const isDegraded = useDegraded()
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    let timer
    const root = document.documentElement
    const armSoon = () => {
      timer = setTimeout(() => setArmed(true), settleMs)
    }
    if (!root.classList.contains('is-loading')) {
      armSoon()
    } else {
      const mo = new MutationObserver(() => {
        if (!root.classList.contains('is-loading')) {
          mo.disconnect()
          armSoon()
        }
      })
      mo.observe(root, { attributes: true, attributeFilter: ['class'] })
      return () => {
        mo.disconnect()
        clearTimeout(timer)
      }
    }
    return () => clearTimeout(timer)
  }, [settleMs])

  // 5 × 200ms of samples: decides within ~1s of arming. Short enough to
  // rescue weak machines quickly, long enough that a single stutter (image
  // decode, snap animation) can't sink the average on a good one.
  if (isDegraded || !armed) return null
  return <PerformanceMonitor ms={200} iterations={5} onDecline={degrade} />
}

// Tracks the navbar's dark class so the fallback can restyle on theme flips.
export function useDarkTheme() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const root = document.documentElement
    const sync = () => setDark(root.classList.contains('dark'))
    sync()
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return dark
}

// public/baked/*.png are captures of the full transmission material rendered
// onto each title model (scripts/bake-surface.mjs) — the fallback wears a
// photo of the good material, flat and unlit. Fetched lazily: only degraded
// visitors pay for the download.
const bakes = {}
function getBaked(model, dark) {
  const key = `${model}-${dark ? 'dark' : 'light'}`
  if (!bakes[key]) {
    const tex = new TextureLoader().load(`/baked/${key}.png`)
    tex.colorSpace = SRGBColorSpace
    bakes[key] = tex
  }
  return bakes[key]
}

// The bake was shot with an orthographic camera along the site camera's rest
// direction; projecting vertices onto that same RIGHT/UP basis and
// normalizing by the model's projected extents reproduces the bake's framing
// exactly (Center's uniform scale and translation cancel in the
// normalization). Must stay in lockstep with scripts/bake-surface.html.
const BAKE_RIGHT = new Vector3(1, 0, 0)
const BAKE_UP = new Vector3(0, 10, 5).normalize()
export function applyBakeUVs(group) {
  if (!group) return
  group.updateWorldMatrix(true, true)
  const v = new Vector3()
  const meshes = []
  group.traverse((o) => o.isMesh && meshes.push(o))
  let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity
  const projected = meshes.map((mesh) => {
    const pos = mesh.geometry.attributes.position
    const rs = new Float32Array(pos.count)
    const us = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      const r = (rs[i] = v.dot(BAKE_RIGHT))
      const u = (us[i] = v.dot(BAKE_UP))
      if (r < minR) minR = r
      if (r > maxR) maxR = r
      if (u < minU) minU = u
      if (u > maxU) maxU = u
    }
    return { mesh, rs, us }
  })
  const w = maxR - minR || 1
  const h = maxU - minU || 1
  projected.forEach(({ mesh, rs, us }) => {
    const uv = new Float32Array(rs.length * 2)
    for (let i = 0; i < rs.length; i++) {
      uv[i * 2] = (rs[i] - minR) / w
      uv[i * 2 + 1] = (us[i] - minU) / h
    }
    mesh.geometry.setAttribute('uv', new BufferAttribute(uv, 2))
  })
}

// Transmission redraws the whole scene several times per frame (backside pass
// + refraction buffer) — free on a decent GPU, a slideshow on weak or
// software ones. Degraded scenes wear the baked photo of this material as a
// flat unlit texture instead: one lookup per pixel, no lights, no env bake —
// the cheapest surface either tier can draw. toneMapped off because the bake
// already went through the site's ACES tonemapping when it was captured.
export default function GlassMaterial({ model }) {
  const isDegraded = useDegraded()
  const dark = useDarkTheme()

  if (isDegraded) {
    return <meshBasicMaterial map={getBaked(model, dark)} toneMapped={false} />
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
