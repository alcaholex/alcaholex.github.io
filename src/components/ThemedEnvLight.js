'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'

// The glass titles' shared light: the env sphere, white in light mode and
// slate in dark, lerped so it rides the theme cross-fade. The parent
// <Environment> needs frames={Infinity} — the default one-shot bake would
// never see the colour change.

const LIGHT = new Color('#ffffff')
const DARK = new Color('#3e4452')

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
