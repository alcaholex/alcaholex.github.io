'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// Serialized across canvases: concurrent compiles + first frames coalesce
// into one long main-thread task; one at a time keeps the page responsive.
let queue = Promise.resolve()

export default function Warmup({ onReady }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const advance = useThree((state) => state.advance)

  useEffect(() => {
    let cancelled = false

    queue = queue.then(async () => {
      if (cancelled) return
      try {
        await gl.compileAsync(scene, camera)
        if (cancelled) return

        advance(performance.now())
      } catch {
      }
      if (!cancelled) onReady()
    })

    return () => {
      cancelled = true
    }
  }, [gl, scene, camera, advance, onReady])

  return null
}
