'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { Environment } from '@react-three/drei'
import { useDegraded } from './GlassMaterial'

// The glass titles' shared light: the env sphere, white in light mode and
// slate in dark, lerped so it rides the theme cross-fade. The parent
// <Environment> needs frames={Infinity} — the default one-shot bake would
// never see the colour change.

const LIGHT = new Color('#ffffff')
const DARK = new Color('#3e4452')

// frames={Infinity} re-bakes the env cubemap + PMREM every frame — a fixed
// per-frame cost decent GPUs never notice, but dominant on weak or software
// renderers (it doesn't shrink with canvas dpr). Degraded scenes render
// nothing here at all: their matcap fallback carries its shading in the
// texture, so lights and env would be pure waste.
export function GlassSceneLight() {
  const degraded = useDegraded()

  if (degraded) return null
  return (
    <Environment frames={Infinity}>
      <ThemedEnvLight />
    </Environment>
  )
}

export default function ThemedEnvLight() {
  const mat = useRef(null)
  const target = useRef(LIGHT)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      target.current = root.classList.contains('dark') ? DARK : LIGHT
    }
    sync()

    if (mat.current) mat.current.color.copy(target.current)
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  useFrame((_, delta) => {
    if (mat.current) mat.current.color.lerp(target.current, 1 - Math.exp(-8 * delta))
  })

  return (
    <mesh>
      <sphereGeometry args={[50, 32, 32]} />
      <meshBasicMaterial ref={mat} side={2} />
    </mesh>
  )
}
