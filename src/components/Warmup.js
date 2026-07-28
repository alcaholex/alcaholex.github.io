'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

export default function Warmup({ onReady }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const advance = useThree((state) => state.advance)

  useEffect(() => {
    let cancelled = false

    const handle = setTimeout(async () => {
      try {
        await gl.compileAsync(scene, camera)
        if (cancelled) return

        advance(performance.now())
      } catch {
      }
      if (!cancelled) onReady()
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [gl, scene, camera, advance, onReady])

  return null
}
