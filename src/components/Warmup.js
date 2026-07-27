'use client'

import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'

// Everything expensive about a transmission canvas — linking the shader,
// PMREM-converting the environment map, filling the refraction buffers — is paid
// on the first frame that actually gets drawn, and it is a few hundred
// milliseconds of main-thread work. Left alone that frame is whichever one first
// puts the canvas on screen, i.e. mid-scroll, which is where it shows.
//
// Rendered inside a Suspense boundary, this forces that frame up front while the
// loading screen is still covering the page, then reports the canvas ready so
// the gate can lift. Inside the boundary matters: it only runs once the model
// has resolved and is attached to the scene, and a warm-up with nothing to draw
// would compile nothing.
export default function Warmup({ onReady }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const advance = useThree((state) => state.advance)

  useEffect(() => {
    let cancelled = false

    // A task of its own rather than inline, so React can paint the loading
    // screen's progress before the compile blocks the main thread.
    const handle = setTimeout(async () => {
      try {
        // compileAsync hands the link to the driver, which builds it off the
        // main thread wherever KHR_parallel_shader_compile exists.
        await gl.compileAsync(scene, camera)
        if (cancelled) return
        // A real frame, not just a compile: the backside pass swaps the material
        // to THREE.BackSide, which is its own program variant, and the render
        // targets are only ever filled by an actual draw.
        advance(performance.now())
      } catch {
        // A warm-up that fails is not worth holding the whole site behind. Open
        // the gate anyway and let the first real frame pay the cost.
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
