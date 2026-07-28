'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'

// The lighting rig all three glass titles share: a sphere that is the env
// cubemap's only content — white in light mode, a dim slate in dark, so the
// glass dims with the page instead of glowing at full daylight over a black
// ground. The colour LERPS toward its target every frame, riding the page's
// theme cross-fade rather than cutting.
//
// The parent <Environment> must run with frames={Infinity}: the default is a
// one-shot bake, and a sphere edit after mount never reaches the cubemap.
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
    // Landing directly in dark mode starts dark, with no white flash to
    // fade down from.
    if (mat.current) mat.current.color.copy(target.current)
    const mo = new MutationObserver(sync)
    mo.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])

  // Time constant ~125ms: settles in roughly the 400ms the page's own
  // cross-fade takes, frame-rate independent.
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
