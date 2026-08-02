'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { Environment } from '@react-three/drei'
import { isSoftwareGL } from './GlassMaterial'

// The glass titles' shared light: the env sphere, white in light mode and
// slate in dark, lerped so it rides the theme cross-fade. The parent
// <Environment> needs frames={Infinity} — the default one-shot bake would
// never see the colour change.

const LIGHT = new Color('#ffffff')
const DARK = new Color('#3e4452')

// frames={Infinity} re-bakes the env cubemap + PMREM every frame — a fixed
// per-frame cost no real GPU notices, but the dominant one under software
// WebGL (it doesn't shrink with canvas dpr). Software renderers get two plain
// lights instead; they lose the themed sheen, which the fallback flat glass
// can't show anyway.
export function GlassSceneLight() {
  if (isSoftwareGL()) {
    return (
      <>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 10]} intensity={1.2} />
      </>
    )
  }
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
